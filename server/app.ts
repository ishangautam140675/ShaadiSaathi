import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { AppDatabase, getDatabase } from './db/database.ts';
import { AuthService } from './services/authService.ts';
import { InvitationService } from './services/invitationService.ts';
import { FamilyService } from './services/familyService.ts';
import { BudgetService } from './services/budgetService.ts';
import { ExpenseService, type ExpenseCategory, type PaymentStatus } from './services/expenseService.ts';
import { createAuthMiddleware, type AuthenticatedRequest } from './middleware/authMiddleware.ts';
import { requireRoles } from './middleware/rbacMiddleware.ts';
import { createRateLimitMiddleware, clearRateLimit } from './middleware/rateLimitMiddleware.ts';

export interface AppContext {
  app: Express;
  appDb: AppDatabase;
  authService: AuthService;
  invitationService: InvitationService;
  familyService: FamilyService;
  budgetService: BudgetService;
  expenseService: ExpenseService;
}

export const createServerApp = (customDb?: AppDatabase): AppContext => {
  const app = express();
  const appDb = customDb || getDatabase();

  const authService = new AuthService(appDb);
  const invitationService = new InvitationService(appDb);
  const familyService = new FamilyService(appDb);
  const budgetService = new BudgetService(appDb);
  const expenseService = new ExpenseService(appDb);

  const authMiddleware = createAuthMiddleware(authService);
  const rateLimitMiddleware = createRateLimitMiddleware(appDb);

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json());

  // Helper cookie setter
  const setSessionCookie = (res: Response, token: string, expiresAt: string) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('shaadisaathi_session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      expires: new Date(expiresAt),
      path: '/',
    });
  };

  // -------------------------------------------------------------
  // 1. Setup Routes (Initial First-Administrator Onboarding)
  // -------------------------------------------------------------
  app.get('/api/setup/status', (_req: Request, res: Response) => {
    try {
      const setupRequired = authService.isSetupRequired();
      res.json({
        setupRequired,
        initialized: !setupRequired,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'SETUP_CHECK_FAILED', message: err.message });
    }
  });

  app.post('/api/setup/initialize', (req: Request, res: Response) => {
    try {
      const {
        familyName,
        brideName,
        groomName,
        weddingDate,
        totalBudget,
        adminName,
        adminEmail,
        adminPassword,
        adminSide,
      } = req.body;

      if (!familyName || !brideName || !groomName || !weddingDate || !adminName || !adminEmail || !adminPassword) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'All fields (Family Name, Couple Names, Wedding Date, Admin Name, Email, Password) are required.',
        });
        return;
      }

      const result = authService.initializeFirstAdmin({
        familyName,
        brideName,
        groomName,
        weddingDate,
        totalBudget: totalBudget ? parseFloat(totalBudget) : undefined,
        adminName,
        adminEmail,
        adminPassword,
        adminSide,
      });

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setSessionCookie(res, result.token, expiresAt);

      res.status(201).json({
        message: 'Family workspace and primary owner successfully initialized.',
        user: result.user,
        family: result.family,
        token: result.token,
      });
    } catch (err: any) {
      if (err.message.includes('SETUP_ALREADY_COMPLETED')) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Initial administrator setup is already completed. Access is now strictly invitation-only.',
        });
        return;
      }
      res.status(400).json({ error: 'INITIALIZATION_FAILED', message: err.message });
    }
  });

  // -------------------------------------------------------------
  // 2. Authentication Routes
  // -------------------------------------------------------------
  app.post('/api/auth/sign-in', rateLimitMiddleware, (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Email and password are required.',
        });
        return;
      }

      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;

      const result = authService.signIn(email, password, userAgent, ip);

      // Clear rate limit on successful credentials
      clearRateLimit(appDb, ip || 'unknown', email);
      setSessionCookie(res, result.token, result.expiresAt);

      res.json({
        message: 'Sign-in successful.',
        user: result.user,
        family: result.family,
        token: result.token,
      });
    } catch (err: any) {
      res.status(401).json({
        error: 'AUTH_FAILED',
        message: err.message || 'Incorrect email or password.',
      });
    }
  });

  app.post('/api/auth/sign-out', (req: Request, res: Response) => {
    const token = req.cookies?.shaadisaathi_session || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      authService.signOut(token);
    }
    res.clearCookie('shaadisaathi_session');
    res.json({ message: 'Signed out successfully.' });
  });

  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      user: req.user,
      family: req.family,
    });
  });

  // -------------------------------------------------------------
  // 3. Family Invitation Routes
  // -------------------------------------------------------------
  app.post(
    '/api/invitations',
    authMiddleware,
    requireRoles('OWNER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const { email, name, role, side, expiresInDays } = req.body;
        if (!email || !name || !role) {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Email, invitee name, and role are required.',
          });
          return;
        }

        const result = invitationService.createInvitation({
          familyId: req.user!.family_id,
          invitedByUserId: req.user!.id,
          email,
          name,
          role,
          side,
          expiresInDays,
        });

        res.status(201).json({
          message: 'Invitation successfully generated.',
          invitation: result.invitation,
          rawToken: result.rawToken,
          inviteLink: result.inviteLink,
        });
      } catch (err: any) {
        res.status(400).json({ error: 'INVITATION_CREATION_FAILED', message: err.message });
      }
    }
  );

  app.get(
    '/api/invitations',
    authMiddleware,
    requireRoles('OWNER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const invitations = invitationService.listInvitations(req.user!.family_id);
        res.json({ invitations });
      } catch (err: any) {
        res.status(500).json({ error: 'FETCH_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/invitations/:id',
    authMiddleware,
    requireRoles('OWNER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        invitationService.revokeInvitation(req.params.id as string, req.user!.family_id);
        res.json({ message: 'Invitation successfully revoked.' });
      } catch (err: any) {
        res.status(400).json({ error: 'REVOCATION_FAILED', message: err.message });
      }
    }
  );

  app.get('/api/invitations/verify/:token', (req: Request, res: Response) => {
    try {
      const result = invitationService.verifyInvitationToken(req.params.token as string);
      if (!result.isValid) {
        res.status(400).json({
          valid: false,
          reason: result.reason,
          message: `Invitation is invalid (${result.reason}).`,
        });
        return;
      }

      res.json({
        valid: true,
        invitation: result.invitation,
        family: result.family,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'VERIFICATION_ERROR', message: err.message });
    }
  });

  app.post('/api/invitations/accept', (req: Request, res: Response) => {
    try {
      const { token, name, password } = req.body;
      if (!token || !password) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invitation token and password are required.',
        });
        return;
      }

      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;

      const result = invitationService.acceptInvitation({
        rawToken: token,
        name: name || '',
        password,
        userAgent,
        ipAddress: ip,
      });

      setSessionCookie(res, result.sessionToken, result.expiresAt);

      res.status(201).json({
        message: 'Invitation accepted and account created successfully.',
        user: result.user,
        family: result.family,
        token: result.sessionToken,
      });
    } catch (err: any) {
      res.status(400).json({ error: 'ACCEPTANCE_FAILED', message: err.message });
    }
  });

  // -------------------------------------------------------------
  // 4. Family & Membership Management Routes
  // -------------------------------------------------------------
  app.get('/api/family/members', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const members = familyService.listMembers(req.user!.family_id);
      res.json({ members });
    } catch (err: any) {
      res.status(500).json({ error: 'FETCH_FAILED', message: err.message });
    }
  });

  app.patch(
    '/api/family/members/:id/role',
    authMiddleware,
    requireRoles('OWNER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const { role } = req.body;
        familyService.updateMemberRole(req.user!.family_id, req.params.id as string, role);
        res.json({ message: 'Member role updated successfully.' });
      } catch (err: any) {
        res.status(400).json({ error: 'ROLE_UPDATE_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/family/members/:id',
    authMiddleware,
    requireRoles('OWNER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        familyService.removeMember(req.user!.family_id, req.params.id as string);
        res.json({ message: 'Family member access successfully revoked.' });
      } catch (err: any) {
        res.status(400).json({ error: 'REMOVAL_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 5. Wedding Budget Management Routes (Phase 3)
  // -------------------------------------------------------------
  app.get('/api/budget', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const budget = budgetService.getBudget(req.user!.family_id);
      res.json(budget);
    } catch (err: any) {
      res.status(500).json({ error: 'BUDGET_FETCH_FAILED', message: err.message });
    }
  });

  app.put(
    '/api/budget',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const { totalBudget } = req.body;
        if (totalBudget === undefined || totalBudget === null) {
          res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Total budget amount is required.' });
          return;
        }

        const numericBudget = typeof totalBudget === 'string' ? parseFloat(totalBudget) : Number(totalBudget);
        const updated = budgetService.updateBudget(req.user!.family_id, req.user!.id, numericBudget);

        res.json({
          message: 'Wedding budget updated successfully.',
          budget: updated,
        });
      } catch (err: any) {
        res.status(400).json({ error: 'BUDGET_UPDATE_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 6. Expense Management CRUD Routes (Phase 3)
  // -------------------------------------------------------------
  app.get('/api/expenses', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        search,
        category,
        paymentStatus,
        startDate,
        endDate,
        paidByName,
        sortBy,
        sortOrder,
        page,
        limit,
      } = req.query;

      const result = expenseService.listExpenses(req.user!.family_id, {
        search: search as string | undefined,
        category: category as ExpenseCategory | undefined,
        paymentStatus: paymentStatus as PaymentStatus | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        paidByName: paidByName as string | undefined,
        sortBy: sortBy as 'date' | 'amount' | 'created_at' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'EXPENSES_FETCH_FAILED', message: err.message });
    }
  });

  app.get('/api/expenses/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = expenseService.getFinancialSummary(req.user!.family_id);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: 'SUMMARY_FETCH_FAILED', message: err.message });
    }
  });

  app.get('/api/expenses/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const expense = expenseService.getExpenseById(req.user!.family_id, req.params.id as string);
      res.json(expense);
    } catch (err: any) {
      res.status(404).json({ error: 'EXPENSE_NOT_FOUND', message: err.message });
    }
  });

  app.post(
    '/api/expenses',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          title,
          amount,
          paidAmount,
          category,
          date,
          paidByName,
          vendorName,
          paymentMethod,
          paymentStatus,
          notes,
        } = req.body;

        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
        const numericPaidAmount = paidAmount !== undefined && paidAmount !== null && paidAmount !== ''
          ? (typeof paidAmount === 'string' ? parseFloat(paidAmount) : Number(paidAmount))
          : undefined;

        const expense = expenseService.createExpense(req.user!.family_id, req.user!.id, {
          title,
          amount: numericAmount,
          paidAmount: numericPaidAmount,
          category,
          date,
          paidByName,
          vendorName,
          paymentMethod,
          paymentStatus,
          notes,
        });

        res.status(201).json({
          message: 'Expense successfully recorded.',
          expense,
        });
      } catch (err: any) {
        res.status(400).json({ error: 'EXPENSE_CREATION_FAILED', message: err.message });
      }
    }
  );

  app.put(
    '/api/expenses/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          title,
          amount,
          paidAmount,
          category,
          date,
          paidByName,
          vendorName,
          paymentMethod,
          paymentStatus,
          notes,
        } = req.body;

        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
        const numericPaidAmount = paidAmount !== undefined && paidAmount !== null && paidAmount !== ''
          ? (typeof paidAmount === 'string' ? parseFloat(paidAmount) : Number(paidAmount))
          : undefined;

        const updated = expenseService.updateExpense(
          req.user!.family_id,
          req.user!.id,
          req.params.id as string,
          {
            title,
            amount: numericAmount,
            paidAmount: numericPaidAmount,
            category,
            date,
            paidByName,
            vendorName,
            paymentMethod,
            paymentStatus,
            notes,
          }
        );

        res.json({
          message: 'Expense successfully updated.',
          expense: updated,
        });
      } catch (err: any) {
        if (err.message.includes('EXPENSE_NOT_FOUND')) {
          res.status(404).json({ error: 'EXPENSE_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'EXPENSE_UPDATE_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/expenses/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        expenseService.deleteExpense(req.user!.family_id, req.user!.id, req.params.id as string);
        res.json({ message: 'Expense record successfully deleted.' });
      } catch (err: any) {
        if (err.message.includes('EXPENSE_NOT_FOUND')) {
          res.status(404).json({ error: 'EXPENSE_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'EXPENSE_DELETION_FAILED', message: err.message });
      }
    }
  );

  return {
    app,
    appDb,
    authService,
    invitationService,
    familyService,
    budgetService,
    expenseService,
  };
};
