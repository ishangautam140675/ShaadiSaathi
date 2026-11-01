import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { AppDatabase, getDatabase } from './db/database.ts';
import { AuthService } from './services/authService.ts';
import { InvitationService } from './services/invitationService.ts';
import { FamilyService } from './services/familyService.ts';
import { BudgetService } from './services/budgetService.ts';
import { ExpenseService, type ExpenseCategory, type PaymentStatus } from './services/expenseService.ts';
import { VendorService } from './services/vendorService.ts';
import { ShoppingService } from './services/shoppingService.ts';
import { GiftService } from './services/giftService.ts';
import { ChecklistService } from './services/checklistService.ts';
import { SyncService } from './services/syncService.ts';
import { DocumentService } from './services/documentService.ts';
import { OcrService } from './services/ocrService.ts';
import { GeminiService } from './services/geminiService.ts';
import { ImportService } from './services/importService.ts';
import { ReportsService } from './services/reportsService.ts';
import { ExportService } from './services/exportService.ts';
import { BackupService } from './services/backupService.ts';
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
  vendorService: VendorService;
  shoppingService: ShoppingService;
  giftService: GiftService;
  checklistService: ChecklistService;
  syncService: SyncService;
  documentService: DocumentService;
  ocrService: OcrService;
  geminiService: GeminiService;
  importService: ImportService;
  reportsService: ReportsService;
  exportService: ExportService;
  backupService: BackupService;
}

export const createServerApp = (customDb?: AppDatabase): AppContext => {
  const app = express();
  app.set('trust proxy', true);
  const appDb = customDb || getDatabase();

  const authService = new AuthService(appDb);
  const invitationService = new InvitationService(appDb);
  const familyService = new FamilyService(appDb);
  const budgetService = new BudgetService(appDb);
  const expenseService = new ExpenseService(appDb);
  const vendorService = new VendorService(appDb);
  const shoppingService = new ShoppingService(appDb);
  const giftService = new GiftService(appDb);
  const checklistService = new ChecklistService(appDb);
  const syncService = new SyncService(appDb);
  const documentService = new DocumentService(appDb);
  const ocrService = new OcrService();
  const geminiService = new GeminiService();
  const importService = new ImportService(appDb, documentService);
  const reportsService = new ReportsService(appDb);
  const exportService = new ExportService(appDb, reportsService);
  const backupService = new BackupService(appDb);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, documentService.getUploadsDir());
    },
    filename: (_req, file, cb) => {
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${sanitized}`);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 15 * 1024 * 1024, // 15MB limit
    },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('INVALID_FILE_TYPE: Allowed formats are JPG, PNG, WEBP, and PDF.'));
      }
    },
  });

  const authMiddleware = createAuthMiddleware(authService);
  const rateLimitMiddleware = createRateLimitMiddleware(appDb);

  // Production Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : true;

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  // CSRF Origin verification for state-changing requests in production
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const origin = req.headers.origin;
      const host = req.headers.host;
      const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0].trim();
      if (origin && (host || forwardedHost)) {
        try {
          const originHost = new URL(origin).host;
          const matchesHost = (host && originHost === host) || (forwardedHost && originHost === forwardedHost);
          const isWhitelisted = Array.isArray(allowedOrigins) && allowedOrigins.includes(origin);
          const isCloudflareTunnel = originHost.endsWith('.trycloudflare.com') && !!req.headers['cf-ray'];

          if (!matchesHost && !isWhitelisted && !isCloudflareTunnel) {
            res.status(403).json({ error: 'CSRF_BLOCKED', message: 'Cross-origin request blocked.' });
            return;
          }
        } catch {
          res.status(403).json({ error: 'CSRF_BLOCKED', message: 'Invalid origin header.' });
          return;
        }
      }
    }
    next();
  });
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
    res.clearCookie('shaadisaathi_session', { path: '/' });
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
        const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || req.body?.operationId) as string | undefined;
        if (idempotencyKey) {
          const cached = syncService.getIdempotencyResult(idempotencyKey, req.user!.family_id);
          if (cached) {
            res.status(cached.status).json(cached.body);
            return;
          }
        }

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

        const responsePayload = {
          message: 'Expense successfully recorded.',
          expense,
        };

        if (idempotencyKey) {
          syncService.saveIdempotencyResult(idempotencyKey, req.user!.family_id, req.user!.id, '/api/expenses', 201, responsePayload);
        }

        res.status(201).json(responsePayload);
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
        const expectedVersion = req.body.expectedVersion ?? req.body.baseVersion;
        if (expectedVersion !== undefined) {
          const current = appDb.db.prepare('SELECT version FROM expenses WHERE id = ? AND family_id = ?').get(req.params.id as string, req.user!.family_id) as { version: number } | undefined;
          if (current && current.version !== expectedVersion) {
            const fullServer = expenseService.getExpenseById(req.user!.family_id, req.params.id as string);
            res.status(409).json({
              error: 'CONFLICT_DETECTED',
              message: 'Concurrent edit detected. The expense was updated by another family member.',
              serverRecord: fullServer,
              currentVersion: current.version,
            });
            return;
          }
        }

        // Increment version on successful update
        appDb.db.prepare('UPDATE expenses SET version = version + 1 WHERE id = ? AND family_id = ?').run(req.params.id as string, req.user!.family_id);

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

  // -------------------------------------------------------------
  // 6. Vendor & Payment Tracking Routes (Phase 4)
  // -------------------------------------------------------------
  app.get('/api/vendors', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, category, status, sortBy, sortOrder } = req.query;
      const vendors = vendorService.listVendors(req.user!.family_id, {
        search: typeof search === 'string' ? search : undefined,
        category: typeof category === 'string' ? category : undefined,
        status: typeof status === 'string' ? status : undefined,
        sortBy: typeof sortBy === 'string' ? (sortBy as any) : undefined,
        sortOrder: typeof sortOrder === 'string' ? (sortOrder as any) : undefined,
      });
      res.json({ vendors });
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_VENDORS_FAILED', message: err.message });
    }
  });

  app.get('/api/vendors/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = vendorService.getVendorFinancialSummary(req.user!.family_id);
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_VENDOR_SUMMARY_FAILED', message: err.message });
    }
  });

  app.get('/api/vendors/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const vendor = vendorService.getVendorById(req.params.id as string, req.user!.family_id);
      if (!vendor) {
        res.status(404).json({ error: 'VENDOR_NOT_FOUND', message: 'Vendor not found.' });
        return;
      }
      res.json({ vendor });
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_VENDOR_FAILED', message: err.message });
    }
  });

  app.post(
    '/api/vendors',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          name,
          category,
          contactPerson,
          phone,
          email,
          city,
          address,
          agreedAmount,
          advancePaid,
          dueDate,
          eventName,
          notes,
          recordAdvanceInExpenses,
        } = req.body;

        const numericAgreed = typeof agreedAmount === 'string' ? parseFloat(agreedAmount) : Number(agreedAmount);
        const numericAdvance = advancePaid !== undefined && advancePaid !== null && advancePaid !== ''
          ? (typeof advancePaid === 'string' ? parseFloat(advancePaid) : Number(advancePaid))
          : undefined;

        const vendor = vendorService.createVendor(req.user!.family_id, req.user!.id, {
          name,
          category,
          contactPerson,
          phone,
          email,
          city,
          address,
          agreedAmount: numericAgreed,
          advancePaid: numericAdvance,
          dueDate,
          eventName,
          notes,
          recordAdvanceInExpenses: Boolean(recordAdvanceInExpenses),
        });

        res.status(201).json({
          message: 'Vendor successfully registered.',
          vendor,
        });
      } catch (err: any) {
        res.status(400).json({ error: 'CREATE_VENDOR_FAILED', message: err.message });
      }
    }
  );

  app.put(
    '/api/vendors/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          name,
          category,
          contactPerson,
          phone,
          email,
          city,
          address,
          agreedAmount,
          dueDate,
          status,
          eventName,
          notes,
        } = req.body;

        const numericAgreed = agreedAmount !== undefined && agreedAmount !== null && agreedAmount !== ''
          ? (typeof agreedAmount === 'string' ? parseFloat(agreedAmount) : Number(agreedAmount))
          : undefined;

        const updated = vendorService.updateVendor(req.params.id as string, req.user!.family_id, req.user!.id, {
          name,
          category,
          contactPerson,
          phone,
          email,
          city,
          address,
          agreedAmount: numericAgreed,
          dueDate,
          status,
          eventName,
          notes,
        });

        res.json({
          message: 'Vendor successfully updated.',
          vendor: updated,
        });
      } catch (err: any) {
        if (err.message.includes('VENDOR_NOT_FOUND')) {
          res.status(404).json({ error: 'VENDOR_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'UPDATE_VENDOR_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/vendors/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        vendorService.deleteVendor(req.params.id as string, req.user!.family_id);
        res.json({ message: 'Vendor record successfully deleted.' });
      } catch (err: any) {
        if (err.message.includes('VENDOR_NOT_FOUND')) {
          res.status(404).json({ error: 'VENDOR_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'DELETE_VENDOR_FAILED', message: err.message });
      }
    }
  );

  // Vendor Payments
  app.get('/api/vendors/:id/payments', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const payments = vendorService.listVendorPayments(req.params.id as string, req.user!.family_id);
      res.json({ payments });
    } catch (err: any) {
      if (err.message.includes('VENDOR_NOT_FOUND')) {
        res.status(404).json({ error: 'VENDOR_NOT_FOUND', message: err.message });
        return;
      }
      res.status(400).json({ error: 'FETCH_VENDOR_PAYMENTS_FAILED', message: err.message });
    }
  });

  app.post(
    '/api/vendors/:id/payments',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || req.body?.operationId) as string | undefined;
        if (idempotencyKey) {
          const cached = syncService.getIdempotencyResult(idempotencyKey, req.user!.family_id);
          if (cached) {
            res.status(cached.status).json(cached.body);
            return;
          }
        }

        const { amount, paymentDate, paymentMethod, transactionReference, notes, recordInExpenses, allowOverpayment } = req.body;
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

        const payment = vendorService.addVendorPayment(req.params.id as string, req.user!.family_id, req.user!.id, {
          amount: numericAmount,
          paymentDate,
          paymentMethod: paymentMethod || 'other',
          transactionReference,
          notes,
          recordInExpenses: Boolean(recordInExpenses),
          allowOverpayment: Boolean(allowOverpayment),
        });

        const responsePayload = {
          message: 'Payment successfully logged for vendor.',
          payment,
        };

        if (idempotencyKey) {
          syncService.saveIdempotencyResult(idempotencyKey, req.user!.family_id, req.user!.id, `/api/vendors/${req.params.id}/payments`, 201, responsePayload);
        }

        res.status(201).json(responsePayload);
      } catch (err: any) {
        if (err.message.includes('VENDOR_NOT_FOUND')) {
          res.status(404).json({ error: 'VENDOR_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'LOG_PAYMENT_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/vendors/:id/payments/:paymentId',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        vendorService.deleteVendorPayment(
          req.params.paymentId as string,
          req.params.id as string,
          req.user!.family_id
        );
        res.json({ message: 'Vendor payment record successfully removed.' });
      } catch (err: any) {
        if (err.message.includes('NOT_FOUND')) {
          res.status(404).json({ error: 'NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'DELETE_PAYMENT_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 7. Shopping Register Routes (Phase 4)
  // -------------------------------------------------------------
  app.get('/api/shopping', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, category, status, priority, assignedTo } = req.query;
      const items = shoppingService.listShoppingItems(req.user!.family_id, {
        search: typeof search === 'string' ? search : undefined,
        category: typeof category === 'string' ? category : undefined,
        status: typeof status === 'string' ? status : undefined,
        priority: typeof priority === 'string' ? priority : undefined,
        assignedTo: typeof assignedTo === 'string' ? assignedTo : undefined,
      });
      res.json({ items });
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_SHOPPING_FAILED', message: err.message });
    }
  });

  app.get('/api/shopping/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = shoppingService.getShoppingSummary(req.user!.family_id);
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_SHOPPING_SUMMARY_FAILED', message: err.message });
    }
  });

  app.get('/api/shopping/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = shoppingService.getShoppingItemById(req.params.id as string, req.user!.family_id);
      if (!item) {
        res.status(404).json({ error: 'ITEM_NOT_FOUND', message: 'Shopping item not found.' });
        return;
      }
      res.json({ item });
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_ITEM_FAILED', message: err.message });
    }
  });

  app.post(
    '/api/shopping',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          name,
          category,
          description,
          estimatedPrice,
          actualPrice,
          quantity,
          status,
          assignedTo,
          priority,
          deadline,
          storeName,
          notes,
        } = req.body;

        const numericEstimated = typeof estimatedPrice === 'string' ? parseFloat(estimatedPrice) : Number(estimatedPrice);
        const numericActual = actualPrice !== undefined && actualPrice !== null && actualPrice !== ''
          ? (typeof actualPrice === 'string' ? parseFloat(actualPrice) : Number(actualPrice))
          : undefined;

        const item = shoppingService.createShoppingItem(req.user!.family_id, req.user!.id, {
          name,
          category: category || 'other',
          description,
          estimatedPrice: numericEstimated,
          actualPrice: numericActual,
          quantity: quantity ? Number(quantity) : 1,
          status,
          assignedTo,
          priority,
          deadline,
          storeName,
          notes,
        });

        res.status(201).json({
          message: 'Shopping item successfully recorded.',
          item,
        });
      } catch (err: any) {
        res.status(400).json({ error: 'CREATE_SHOPPING_FAILED', message: err.message });
      }
    }
  );

  app.put(
    '/api/shopping/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          name,
          category,
          description,
          estimatedPrice,
          actualPrice,
          quantity,
          status,
          assignedTo,
          priority,
          deadline,
          storeName,
          notes,
        } = req.body;

        const numericEstimated = estimatedPrice !== undefined && estimatedPrice !== null && estimatedPrice !== ''
          ? (typeof estimatedPrice === 'string' ? parseFloat(estimatedPrice) : Number(estimatedPrice))
          : undefined;
        const numericActual = actualPrice !== undefined && actualPrice !== null && actualPrice !== ''
          ? (typeof actualPrice === 'string' ? parseFloat(actualPrice) : Number(actualPrice))
          : undefined;

        const updated = shoppingService.updateShoppingItem(req.params.id as string, req.user!.family_id, req.user!.id, {
          name,
          category,
          description,
          estimatedPrice: numericEstimated,
          actualPrice: numericActual,
          quantity: quantity !== undefined ? Number(quantity) : undefined,
          status,
          assignedTo,
          priority,
          deadline,
          storeName,
          notes,
        });

        res.json({
          message: 'Shopping item successfully updated.',
          item: updated,
        });
      } catch (err: any) {
        if (err.message.includes('ITEM_NOT_FOUND')) {
          res.status(404).json({ error: 'ITEM_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'UPDATE_SHOPPING_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/shopping/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        shoppingService.deleteShoppingItem(req.params.id as string, req.user!.family_id);
        res.json({ message: 'Shopping item successfully removed.' });
      } catch (err: any) {
        if (err.message.includes('ITEM_NOT_FOUND')) {
          res.status(404).json({ error: 'ITEM_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'DELETE_SHOPPING_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 8. Gifts & Shagun Register Routes (Phase 4)
  // -------------------------------------------------------------
  app.get('/api/gifts', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, side, giftType } = req.query;
      const gifts = giftService.listGifts(req.user!.family_id, {
        search: typeof search === 'string' ? search : undefined,
        side: typeof side === 'string' ? side : undefined,
        giftType: typeof giftType === 'string' ? giftType : undefined,
      });
      res.json({ gifts });
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_GIFTS_FAILED', message: err.message });
    }
  });

  app.get('/api/gifts/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = giftService.getGiftsSummary(req.user!.family_id);
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_GIFTS_SUMMARY_FAILED', message: err.message });
    }
  });

  app.get('/api/gifts/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gift = giftService.getGiftById(req.params.id as string, req.user!.family_id);
      if (!gift) {
        res.status(404).json({ error: 'GIFT_NOT_FOUND', message: 'Gift record not found.' });
        return;
      }
      res.json({ gift });
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_GIFT_FAILED', message: err.message });
    }
  });

  app.post(
    '/api/gifts',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          giverName,
          donorName,
          relation,
          giftType,
          amount,
          cashAmount,
          description,
          itemDescription,
          dateReceived,
          recipient,
          side,
          notes,
        } = req.body;

        const rawAmount = amount !== undefined ? amount : cashAmount;
        const numericAmount = rawAmount !== undefined && rawAmount !== null && rawAmount !== ''
          ? (typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount))
          : 0;

        const gift = giftService.createGift(req.user!.family_id, req.user!.id, {
          giverName,
          donorName,
          relation,
          giftType: giftType || 'cash',
          amount: numericAmount,
          description,
          itemDescription,
          dateReceived,
          recipient,
          side,
          notes,
        });

        res.status(201).json({
          message: 'Gift / Shagun successfully recorded.',
          gift,
        });
      } catch (err: any) {
        res.status(400).json({ error: 'CREATE_GIFT_FAILED', message: err.message });
      }
    }
  );

  app.put(
    '/api/gifts/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          giverName,
          donorName,
          relation,
          giftType,
          amount,
          cashAmount,
          description,
          itemDescription,
          dateReceived,
          recipient,
          side,
          notes,
        } = req.body;

        const rawAmount = amount !== undefined ? amount : cashAmount;
        const numericAmount = rawAmount !== undefined && rawAmount !== null && rawAmount !== ''
          ? (typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount))
          : undefined;

        const updated = giftService.updateGift(req.params.id as string, req.user!.family_id, req.user!.id, {
          giverName,
          donorName,
          relation,
          giftType,
          amount: numericAmount,
          description,
          itemDescription,
          dateReceived,
          recipient,
          side,
          notes,
        });

        res.json({
          message: 'Gift record successfully updated.',
          gift: updated,
        });
      } catch (err: any) {
        if (err.message.includes('GIFT_NOT_FOUND')) {
          res.status(404).json({ error: 'GIFT_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'UPDATE_GIFT_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/gifts/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        giftService.deleteGift(req.params.id as string, req.user!.family_id);
        res.json({ message: 'Gift record successfully deleted.' });
      } catch (err: any) {
        if (err.message.includes('GIFT_NOT_FOUND')) {
          res.status(404).json({ error: 'GIFT_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'DELETE_GIFT_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 9. Wedding Checklist / Tasks Routes (Phase 4)
  // -------------------------------------------------------------
  app.get('/api/checklist', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { phase, status, priority } = req.query;
      const tasks = checklistService.listTasks(req.user!.family_id, {
        phase: typeof phase === 'string' ? phase : undefined,
        status: typeof status === 'string' ? status : undefined,
        priority: typeof priority === 'string' ? priority : undefined,
      });
      res.json({ tasks });
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_CHECKLIST_FAILED', message: err.message });
    }
  });

  app.get('/api/checklist/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = checklistService.getChecklistSummary(req.user!.family_id);
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_CHECKLIST_SUMMARY_FAILED', message: err.message });
    }
  });

  app.get('/api/checklist/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = checklistService.getTaskById(req.params.id as string, req.user!.family_id);
      if (!task) {
        res.status(404).json({ error: 'TASK_NOT_FOUND', message: 'Task not found.' });
        return;
      }
      res.json({ task });
    } catch (err: any) {
      res.status(400).json({ error: 'FETCH_TASK_FAILED', message: err.message });
    }
  });

  app.post(
    '/api/checklist',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const { title, category, phase, assignedTo, priority, dueDate, notes } = req.body;
        const task = checklistService.createTask(req.user!.family_id, req.user!.id, {
          title,
          category,
          phase,
          assignedTo,
          priority,
          dueDate,
          notes,
        });

        res.status(201).json({
          message: 'Task successfully created.',
          task,
        });
      } catch (err: any) {
        res.status(400).json({ error: 'CREATE_TASK_FAILED', message: err.message });
      }
    }
  );

  app.put(
    '/api/checklist/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const { title, category, phase, status, assignedTo, priority, dueDate, notes } = req.body;
        const updated = checklistService.updateTask(req.params.id as string, req.user!.family_id, req.user!.id, {
          title,
          category,
          phase,
          status,
          assignedTo,
          priority,
          dueDate,
          notes,
        });

        res.json({
          message: 'Task successfully updated.',
          task: updated,
        });
      } catch (err: any) {
        if (err.message.includes('TASK_NOT_FOUND')) {
          res.status(404).json({ error: 'TASK_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'UPDATE_TASK_FAILED', message: err.message });
      }
    }
  );

  app.patch(
    '/api/checklist/:id/toggle',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const updated = checklistService.toggleTaskCompletion(req.params.id as string, req.user!.family_id);
        res.json({
          message: 'Task status toggled.',
          task: updated,
        });
      } catch (err: any) {
        if (err.message.includes('TASK_NOT_FOUND')) {
          res.status(404).json({ error: 'TASK_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'TOGGLE_TASK_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/checklist/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        checklistService.deleteTask(req.params.id as string, req.user!.family_id);
        res.json({ message: 'Task successfully deleted.' });
      } catch (err: any) {
        if (err.message.includes('TASK_NOT_FOUND')) {
          res.status(404).json({ error: 'TASK_NOT_FOUND', message: err.message });
          return;
        }
        res.status(400).json({ error: 'DELETE_TASK_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 12. Health & Connectivity Verification (Phase 5)
  // -------------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ShaadiSaathi Core API',
    });
  });

  // -------------------------------------------------------------
  // 13. Distributed Synchronization & Concurrency Engine (Phase 5)
  // -------------------------------------------------------------
  app.get(
    '/api/sync/changes',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const since = typeof req.query.since === 'string' ? req.query.since : undefined;
        const changes = syncService.pullChanges(req.user!.family_id, since);
        res.json(changes);
      } catch (err: any) {
        res.status(500).json({ error: 'PULL_CHANGES_FAILED', message: err.message });
      }
    }
  );

  app.post(
    '/api/sync/batch',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const operations = Array.isArray(req.body.operations) ? req.body.operations : [];
        const results = syncService.processBatch(
          req.user!.family_id,
          req.user!.id,
          req.user!.role,
          operations
        );

        res.json({
          processedAt: new Date().toISOString(),
          familyId: req.user!.family_id,
          total: operations.length,
          results,
        });
      } catch (err: any) {
        res.status(500).json({ error: 'BATCH_SYNC_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 14. SmartScan Document Processing & Reviewable Imports (Phase 6)
  // -------------------------------------------------------------
  app.post(
    '/api/documents/upload',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      upload.single('file')(req as any, res as any, async (err: any) => {
        if (err) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'File exceeds 15MB limit.' });
            return;
          }
          res.status(400).json({ error: 'UPLOAD_FAILED', message: err.message });
          return;
        }

        const file = (req as any).file;

        if (req.user!.role !== 'OWNER' && req.user!.role !== 'FAMILY_MEMBER') {
          if (file && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch {}
          }
          res.status(403).json({
            error: 'FORBIDDEN',
            message: 'INSUFFICIENT_PERMISSIONS: Viewers cannot upload documents.',
          });
          return;
        }

        if (!file) {
          res.status(400).json({ error: 'FILE_REQUIRED', message: 'No file uploaded.' });
          return;
        }

        try {
          const doc = documentService.createDocument({
            familyId: req.user!.family_id,
            userId: req.user!.id,
            originalFilename: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
          });

          if (req.query.autoOcr === 'true') {
            try {
              const ocrResult = await ocrService.processDocument(doc.filePath, doc.mimeType);
              documentService.updateDocumentOcr(doc.id, {
                ocrStatus: 'completed',
                ocrEngine: 'local_tesseract',
                extractedText: ocrResult.rawText,
                confidenceScore: ocrResult.confidenceScore,
                extractedData: ocrResult,
                proposedCount: ocrResult.lineItems.length,
              });
              const updatedDoc = documentService.getDocumentById(req.user!.family_id, doc.id);
              res.status(201).json({ document: updatedDoc, ocrResult });
              return;
            } catch (ocrErr: any) {
              documentService.updateDocumentOcr(doc.id, {
                ocrStatus: 'failed',
                errorSummary: ocrErr.message,
              });
            }
          }

          res.status(201).json({ document: doc });
        } catch (saveErr: any) {
          res.status(500).json({ error: 'DOCUMENT_CREATION_FAILED', message: saveErr.message });
        }
      });
    }
  );

  app.get(
    '/api/documents',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const docs = documentService.getDocumentsByFamily(req.user!.family_id);
        res.json({ documents: docs, total: docs.length });
      } catch (err: any) {
        res.status(500).json({ error: 'FETCH_DOCUMENTS_FAILED', message: err.message });
      }
    }
  );

  app.get(
    '/api/documents/:id',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const doc = documentService.getDocumentById(req.user!.family_id, req.params.id as string);
        if (!doc) {
          res.status(404).json({ error: 'DOCUMENT_NOT_FOUND', message: 'Document not found in this family.' });
          return;
        }
        res.json({ document: doc });
      } catch (err: any) {
        res.status(500).json({ error: 'GET_DOCUMENT_FAILED', message: err.message });
      }
    }
  );

  app.get(
    '/api/documents/:id/file',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const doc = documentService.getDocumentById(req.user!.family_id, req.params.id as string);
        if (!doc || !fs.existsSync(doc.filePath)) {
          res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'File not found on server.' });
          return;
        }

        res.setHeader('Content-Type', doc.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.originalFilename}"`);
        const readStream = fs.createReadStream(doc.filePath);
        readStream.pipe(res);
      } catch (err: any) {
        res.status(500).json({ error: 'STREAM_FILE_FAILED', message: err.message });
      }
    }
  );

  app.post(
    '/api/documents/:id/ocr',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const doc = documentService.getDocumentById(req.user!.family_id, req.params.id as string);
        if (!doc) {
          res.status(404).json({ error: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' });
          return;
        }

        documentService.updateDocumentOcr(doc.id, { ocrStatus: 'processing' });
        const language = (req.body?.language as string) || 'eng';
        const ocrResult = await ocrService.processDocument(doc.filePath, doc.mimeType, language);

        documentService.updateDocumentOcr(doc.id, {
          ocrStatus: 'completed',
          ocrEngine: 'local_tesseract',
          extractedText: ocrResult.rawText,
          confidenceScore: ocrResult.confidenceScore,
          extractedData: ocrResult,
          proposedCount: ocrResult.lineItems.length,
        });

        const updatedDoc = documentService.getDocumentById(req.user!.family_id, doc.id);
        res.json({ document: updatedDoc, result: ocrResult });
      } catch (err: any) {
        documentService.updateDocumentOcr(req.params.id as string, {
          ocrStatus: 'failed',
          errorSummary: err.message,
        });
        res.status(500).json({ error: 'OCR_PROCESSING_FAILED', message: err.message });
      }
    }
  );

  app.post(
    '/api/documents/:id/enhance',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const doc = documentService.getDocumentById(req.user!.family_id, req.params.id as string);
        if (!doc) {
          res.status(404).json({ error: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' });
          return;
        }

        const userConsent = Boolean(req.body?.userConsent);
        if (!userConsent) {
          res.status(400).json({
            error: 'CONSENT_REQUIRED',
            message: 'Explicit user consent is required before processing documents with cloud AI.',
          });
          return;
        }

        if (!geminiService.isAvailable()) {
          res.status(503).json({
            error: 'GEMINI_UNAVAILABLE',
            message: 'Gemini API is not configured on the server. Please use local OCR.',
          });
          return;
        }

        documentService.updateDocumentOcr(doc.id, { ocrStatus: 'processing' });
        const result = await geminiService.extractWithGemini(doc.filePath, doc.mimeType, {
          userConsent: true,
          modelName: req.body?.modelName,
        });

        documentService.updateDocumentOcr(doc.id, {
          ocrStatus: 'completed',
          ocrEngine: 'gemini_flash',
          extractedText: result.rawText,
          confidenceScore: result.confidenceScore,
          extractedData: result,
          proposedCount: result.lineItems.length,
        });

        const updatedDoc = documentService.getDocumentById(req.user!.family_id, doc.id);
        res.json({ document: updatedDoc, result });
      } catch (err: any) {
        documentService.updateDocumentOcr(req.params.id as string, {
          ocrStatus: 'failed',
          errorSummary: err.message,
        });
        res.status(500).json({ error: 'AI_ENHANCE_FAILED', message: err.message });
      }
    }
  );

  app.post(
    '/api/documents/:id/check-duplicates',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
        const results = importService.checkDuplicates(req.user!.family_id, rows);
        res.json({ results });
      } catch (err: any) {
        res.status(500).json({ error: 'DUPLICATE_CHECK_FAILED', message: err.message });
      }
    }
  );

  app.post(
    '/api/documents/:id/import',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const doc = documentService.getDocumentById(req.user!.family_id, req.params.id as string);
        if (!doc) {
          res.status(404).json({ error: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' });
          return;
        }

        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
        if (rows.length === 0) {
          res.status(400).json({ error: 'EMPTY_IMPORT', message: 'No expense rows provided for import.' });
          return;
        }

        const importedExpenses = importService.importConfirmedRows(
          req.user!.family_id,
          req.user!.id,
          req.user!.name,
          doc.id,
          rows
        );

        const updatedDoc = documentService.getDocumentById(req.user!.family_id, doc.id);

        res.status(201).json({
          message: `Successfully imported ${importedExpenses.length} expense(s).`,
          count: importedExpenses.length,
          importedExpenses,
          document: updatedDoc,
        });
      } catch (err: any) {
        res.status(400).json({ error: 'IMPORT_FAILED', message: err.message });
      }
    }
  );

  app.delete(
    '/api/documents/:id',
    authMiddleware,
    requireRoles('OWNER', 'FAMILY_MEMBER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const deleted = documentService.deleteDocument(req.user!.family_id, req.params.id as string);
        if (!deleted) {
          res.status(404).json({ error: 'DOCUMENT_NOT_FOUND', message: 'Document not found or already deleted.' });
          return;
        }
        res.json({ message: 'Document successfully deleted.' });
      } catch (err: any) {
        res.status(500).json({ error: 'DELETE_DOCUMENT_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 15. Financial Reports & Comprehensive Analytics (Phase 6)
  // -------------------------------------------------------------
  app.get(
    '/api/reports/summary',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        const report = reportsService.getComprehensiveReport(req.user!.family_id, { startDate, endDate });
        res.json(report);
      } catch (err: any) {
        res.status(500).json({ error: 'GENERATE_REPORT_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 16. Safe RFC 4180 CSV & Portable JSON Export (Phase 6)
  // -------------------------------------------------------------
  app.get(
    '/api/export/csv',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const type = (req.query.type as string) || 'expenses';
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

        let csv = '';
        let filename = `shaadisaathi-${type}-${req.user!.family_id}.csv`;

        if (type === 'vendors') {
          csv = exportService.exportVendorsCsv(req.user!.family_id);
          filename = `shaadisaathi-vendors-${req.user!.family_id}.csv`;
        } else if (type === 'gifts') {
          csv = exportService.exportGiftsCsv(req.user!.family_id);
          filename = `shaadisaathi-gifts-shagun-${req.user!.family_id}.csv`;
        } else {
          csv = exportService.exportExpensesCsv(req.user!.family_id, { startDate, endDate });
          filename = `shaadisaathi-expenses-${req.user!.family_id}.csv`;
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
      } catch (err: any) {
        res.status(500).json({ error: 'CSV_EXPORT_FAILED', message: err.message });
      }
    }
  );

  app.get(
    '/api/export/json',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const archive = exportService.exportCompleteArchiveJson(req.user!.family_id);
        const filename = `shaadisaathi-backup-${req.user!.family_id}-${Date.now()}.json`;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(archive);
      } catch (err: any) {
        res.status(500).json({ error: 'JSON_EXPORT_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 17. Backup Archive Validation & Isolated Restoration (Phase 6)
  // -------------------------------------------------------------
  app.post(
    '/api/backup/restore',
    authMiddleware,
    requireRoles('OWNER'),
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const archive = req.body?.archive;
        if (!archive) {
          res.status(400).json({ error: 'ARCHIVE_REQUIRED', message: 'No backup archive provided in payload.' });
          return;
        }

        const result = backupService.restoreArchive(req.user!.family_id, req.user!.id, archive);
        res.json({ message: 'Backup restored successfully.', result });
      } catch (err: any) {
        res.status(400).json({ error: 'BACKUP_RESTORE_FAILED', message: err.message });
      }
    }
  );

  // -------------------------------------------------------------
  // 18. Production Static File Serving & SPA Fallback (Phase 7)
  // -------------------------------------------------------------
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir) && (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true')) {
    app.use(express.static(distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.[a-f0-9]{8}\./) || filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }));

    // SPA fallback: send index.html for non-API GET requests
    app.use((req: Request, res: Response, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return {
    app,
    appDb,
    authService,
    invitationService,
    familyService,
    budgetService,
    expenseService,
    vendorService,
    shoppingService,
    giftService,
    checklistService,
    syncService,
    documentService,
    ocrService,
    geminiService,
    importService,
    reportsService,
    exportService,
    backupService,
  };
};
