import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServerApp } from '../app.ts';
import { AppDatabase } from '../db/database.ts';

describe('Phase 3 Backend: Wedding Budget & Expense Management', () => {
  let app: any;
  let testDb: AppDatabase;
  let ownerToken: string;
  let memberToken: string;
  let viewerToken: string;
  let otherFamilyOwnerToken: string;

  beforeEach(async () => {
    testDb = new AppDatabase({ inMemory: true });
    const context = createServerApp(testDb);
    app = context.app;

    // 1. Initialize Family A with Owner
    const setupRes = await request(app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Sharma & Verma Wedding',
        brideName: 'Kavya Sharma',
        groomName: 'Rohan Verma',
        weddingDate: '2026-12-18',
        totalBudget: 2500000,
        adminName: 'Rajesh Sharma',
        adminEmail: 'rajesh@sharma.org',
        adminPassword: 'Password@123',
        adminSide: 'bride',
      });
    ownerToken = setupRes.body.token;

    // 2. Create Family Member in Family A
    const memberInviteRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'priya@sharma.org',
        name: 'Priya Sharma',
        role: 'FAMILY_MEMBER',
        side: 'bride',
      });
    const memberRawToken = memberInviteRes.body.rawToken;
    const memberAcceptRes = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: memberRawToken,
        name: 'Priya Sharma',
        password: 'Password@123',
      });
    memberToken = memberAcceptRes.body.token;

    // 3. Create Viewer in Family A
    const viewerInviteRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'uncle@sharma.org',
        name: 'Uncle Ji',
        role: 'VIEWER',
        side: 'groom',
      });
    const viewerRawToken = viewerInviteRes.body.rawToken;
    const viewerAcceptRes = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: viewerRawToken,
        name: 'Uncle Ji',
        password: 'Password@123',
      });
    viewerToken = viewerAcceptRes.body.token;

    // 4. Create Family B (for cross-family isolation tests)
    // Directly insert into DB to simulate second tenant
    const famBId = 'fam_other_family';
    testDb.db.prepare(`
      INSERT INTO families (id, name, bride_name, groom_name, wedding_date, total_budget, total_budget_paise, currency)
      VALUES (?, 'Kapoor Wedding', 'Ananya', 'Siddharth', '2027-01-20', 1000000, 100000000, 'INR')
    `).run(famBId);

    const userBId = 'usr_kapoor_owner';
    testDb.db.prepare(`
      INSERT INTO users (id, family_id, name, email, password_hash, password_salt, role, side, is_active)
      VALUES (?, ?, 'Vikram Kapoor', 'vikram@kapoor.org', 'fakehash', 'fakesalt', 'OWNER', 'groom', 1)
    `).run(userBId, famBId);

    // Create session for Family B owner
    const sessionToken = 'token_for_other_family_owner_xyz_123';
    const cryptoService = await import('../services/cryptoService.ts');
    const tokenHash = cryptoService.CryptoService.hashToken(sessionToken);

    testDb.db.prepare(`
      INSERT INTO sessions (id, user_id, family_id, token_hash, expires_at)
      VALUES ('sess_kapoor', ?, ?, ?, datetime('now', '+30 days'))
    `).run(userBId, famBId, tokenHash);

    otherFamilyOwnerToken = sessionToken;
  });

  // -------------------------------------------------------------
  // Budget Management Tests
  // -------------------------------------------------------------
  describe('Budget Management', () => {
    it('fetches initial family budget accurately', async () => {
      const res = await request(app)
        .get('/api/budget')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalBudget).toBe(2500000);
      expect(res.body.totalBudgetPaise).toBe(250000000);
      expect(res.body.currency).toBe('INR');
    });

    it('allows OWNER and FAMILY_MEMBER to update budget with exact monetary precision', async () => {
      // Owner updates budget
      const updateRes = await request(app)
        .put('/api/budget')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ totalBudget: 3500000.50 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.budget.totalBudget).toBe(3500000.50);
      expect(updateRes.body.budget.totalBudgetPaise).toBe(350000050);

      // Family Member updates budget
      const memberUpdateRes = await request(app)
        .put('/api/budget')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ totalBudget: 4000000 });

      expect(memberUpdateRes.status).toBe(200);
      expect(memberUpdateRes.body.budget.totalBudget).toBe(4000000);
    });

    it('rejects invalid, negative, or non-numeric budget updates', async () => {
      const negRes = await request(app)
        .put('/api/budget')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ totalBudget: -5000 });

      expect(negRes.status).toBe(400);
      expect(negRes.body.error).toBe('BUDGET_UPDATE_FAILED');

      const strRes = await request(app)
        .put('/api/budget')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ totalBudget: 'not-a-number' });

      expect(strRes.status).toBe(400);
    });

    it('rejects VIEWER from modifying budget (RBAC enforcement)', async () => {
      const viewerRes = await request(app)
        .put('/api/budget')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ totalBudget: 5000000 });

      expect(viewerRes.status).toBe(403);
      expect(viewerRes.body.error).toBe('FORBIDDEN');
    });
  });

  // -------------------------------------------------------------
  // Expense CRUD & Validation Tests
  // -------------------------------------------------------------
  describe('Expense CRUD & Validation', () => {
    it('creates a valid expense with full payment', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Royal Palace Venue Booking Advance',
          amount: 500000,
          paidAmount: 500000,
          category: 'venue',
          date: '2026-11-15',
          paidByName: 'Rajesh Sharma',
          vendorName: 'The Grand Heritage Palace',
          paymentMethod: 'bank_transfer',
          paymentStatus: 'paid',
          notes: '50% advance for main banquet hall and lawns',
        });

      expect(res.status).toBe(201);
      expect(res.body.expense.id).toBeDefined();
      expect(res.body.expense.title).toBe('Royal Palace Venue Booking Advance');
      expect(res.body.expense.amount).toBe(500000);
      expect(res.body.expense.amountPaise).toBe(50000000);
      expect(res.body.expense.paidAmount).toBe(500000);
      expect(res.body.expense.outstandingBalance).toBe(0);
      expect(res.body.expense.paymentStatus).toBe('paid');
    });

    it('handles partially paid expenses and calculates outstanding balance correctly', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Bridal Lehenga Order',
          amount: 150000,
          paidAmount: 50000,
          category: 'clothing',
          date: '2026-11-20',
          paidByName: 'Priya Sharma',
          vendorName: 'Sabyasachi Bridal Boutique',
          paymentMethod: 'card',
          notes: 'Initial fitting advance paid',
        });

      expect(res.status).toBe(201);
      expect(res.body.expense.amount).toBe(150000);
      expect(res.body.expense.paidAmount).toBe(50000);
      expect(res.body.expense.outstandingBalance).toBe(100000);
      expect(res.body.expense.paymentStatus).toBe('partially_paid');
    });

    it('rejects invalid expense inputs (negative amounts, invalid categories, paid > total)', async () => {
      // 1. Negative amount
      const res1 = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Invalid Negative',
          amount: -100,
          category: 'catering',
          date: '2026-11-15',
          paidByName: 'Test',
          paymentMethod: 'cash',
        });
      expect(res1.status).toBe(400);

      // 2. Paid amount exceeding total amount
      const res2 = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Excess Paid',
          amount: 5000,
          paidAmount: 6000,
          category: 'catering',
          date: '2026-11-15',
          paidByName: 'Test',
          paymentMethod: 'cash',
        });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('Paid amount cannot exceed total');

      // 3. Invalid category
      const res3 = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Bad Category',
          amount: 5000,
          category: 'crypto_investment',
          date: '2026-11-15',
          paidByName: 'Test',
          paymentMethod: 'cash',
        });
      expect(res3.status).toBe(400);

      // 4. Invalid date
      const res4 = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Bad Date',
          amount: 5000,
          category: 'catering',
          date: 'invalid-date',
          paidByName: 'Test',
          paymentMethod: 'cash',
        });
      expect(res4.status).toBe(400);
    });

    it('updates an existing expense and preserves audit logs', async () => {
      // Create
      const createRes = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Catering Tasting & Deposit',
          amount: 80000,
          paidAmount: 20000,
          category: 'catering',
          date: '2026-11-10',
          paidByName: 'Rajesh Sharma',
          paymentMethod: 'upi',
        });
      const expenseId = createRes.body.expense.id;

      // Update to full payment
      const updateRes = await request(app)
        .put(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Catering Tasting & Full Advance Deposit',
          amount: 80000,
          paidAmount: 80000,
          category: 'catering',
          date: '2026-11-10',
          paidByName: 'Priya Sharma',
          paymentMethod: 'upi',
          notes: 'Full advance cleared',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.expense.title).toBe('Catering Tasting & Full Advance Deposit');
      expect(updateRes.body.expense.paidAmount).toBe(80000);
      expect(updateRes.body.expense.outstandingBalance).toBe(0);
      expect(updateRes.body.expense.paymentStatus).toBe('paid');
    });

    it('deletes an expense with authorization enforcement', async () => {
      const createRes = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Temporary Decoration Sample',
          amount: 15000,
          category: 'decoration',
          date: '2026-11-12',
          paidByName: 'Rajesh Sharma',
          paymentMethod: 'cash',
        });
      const expenseId = createRes.body.expense.id;

      // Viewer cannot delete
      const viewerDel = await request(app)
        .delete(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(viewerDel.status).toBe(403);

      // Owner can delete
      const ownerDel = await request(app)
        .delete(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(ownerDel.status).toBe(200);

      // Should no longer exist
      const getRes = await request(app)
        .get(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(getRes.status).toBe(404);
    });
  });

  // -------------------------------------------------------------
  // Financial Summary & Calculations Tests
  // -------------------------------------------------------------
  describe('Authoritative Financial Calculations', () => {
    it('calculates total budget, committed, paid, outstanding, and utilization without rounding error', async () => {
      // Set budget: ₹25,00,000
      // Expense 1: ₹5,00,000 total, ₹3,00,000 paid (Outstanding: ₹2,00,000)
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Banquet Hall',
          amount: 500000,
          paidAmount: 300000,
          category: 'venue',
          date: '2026-11-01',
          paidByName: 'Rajesh',
          paymentMethod: 'bank_transfer',
        });

      // Expense 2: ₹2,50,000.75 total, ₹2,50,000.75 paid (Outstanding: ₹0)
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Catering Package',
          amount: 250000.75,
          paidAmount: 250000.75,
          category: 'catering',
          date: '2026-11-02',
          paidByName: 'Rajesh',
          paymentMethod: 'bank_transfer',
        });

      // Expense 3: ₹50,000.25 total, ₹0 paid (Outstanding: ₹50,000.25)
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Wedding Invitations Box Printing',
          amount: 50000.25,
          paidAmount: 0,
          category: 'invitations',
          date: '2026-11-03',
          paidByName: 'Priya',
          paymentMethod: 'cash',
        });

      // Fetch summary
      const summaryRes = await request(app)
        .get('/api/expenses/summary')
        .set('Authorization', `Bearer ${viewerToken}`); // Viewers CAN read summary

      expect(summaryRes.status).toBe(200);
      const s = summaryRes.body;

      // Total Budget = ₹25,00,000
      expect(s.totalBudget).toBe(2500000);
      expect(s.totalBudgetPaise).toBe(250000000);

      // Total Committed = 500,000 + 250,000.75 + 50,000.25 = ₹8,00,001.00
      expect(s.totalCommitted).toBe(800001);
      expect(s.totalCommittedPaise).toBe(80000100);

      // Total Paid = 300,000 + 250,000.75 + 0 = ₹5,50,000.75
      expect(s.totalPaid).toBe(550000.75);
      expect(s.totalPaidPaise).toBe(55000075);

      // Total Outstanding = 200,000 + 0 + 50,000.25 = ₹2,50,000.25
      expect(s.totalOutstanding).toBe(250000.25);
      expect(s.totalOutstandingPaise).toBe(25000025);

      // Remaining Budget = 25,00,000 - 8,00,001 = ₹16,99,999.00
      expect(s.remainingBudget).toBe(1699999);
      expect(s.remainingBudgetPaise).toBe(169999900);

      // Cash Remaining = 25,00,000 - 5,50,000.75 = ₹19,49,999.25
      expect(s.cashRemaining).toBe(1949999.25);

      // Budget Utilization = (800001 / 2500000) * 100 = 32%
      expect(s.budgetUtilizationPercentage).toBe(32);

      // Category breakdown checks
      expect(s.categoryBreakdown.length).toBe(3);
      const venueCat = s.categoryBreakdown.find((c: any) => c.category === 'venue');
      expect(venueCat.totalAmount).toBe(500000);
      expect(venueCat.totalPaid).toBe(300000);
      expect(venueCat.totalOutstanding).toBe(200000);
    });
  });

  // -------------------------------------------------------------
  // Search, Filters & Pagination Tests
  // -------------------------------------------------------------
  describe('Search, Filters & Pagination', () => {
    beforeEach(async () => {
      // Seed 3 expenses
      await request(app).post('/api/expenses').set('Authorization', `Bearer ${ownerToken}`).send({
        title: 'Floral Mandap Setup',
        amount: 85000,
        category: 'decoration',
        date: '2026-11-01',
        paidByName: 'Rajesh Sharma',
        vendorName: 'Ferns & Petals',
        paymentMethod: 'upi',
      });

      await request(app).post('/api/expenses').set('Authorization', `Bearer ${ownerToken}`).send({
        title: 'Catering Mocktails Bar',
        amount: 45000,
        category: 'catering',
        date: '2026-11-05',
        paidByName: 'Priya Sharma',
        vendorName: 'Flavor Delight Caterers',
        paymentMethod: 'cash',
      });

      await request(app).post('/api/expenses').set('Authorization', `Bearer ${ownerToken}`).send({
        title: 'Catering Dinner Buffet',
        amount: 220000,
        category: 'catering',
        date: '2026-11-10',
        paidByName: 'Rajesh Sharma',
        vendorName: 'Flavor Delight Caterers',
        paymentMethod: 'bank_transfer',
      });
    });

    it('filters expenses by category', async () => {
      const res = await request(app)
        .get('/api/expenses?category=catering')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(2);
      expect(res.body.expenses.every((e: any) => e.category === 'catering')).toBe(true);
    });

    it('searches expenses by vendor or description keyword', async () => {
      const res = await request(app)
        .get('/api/expenses?search=Mandap')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.expenses[0].title).toBe('Floral Mandap Setup');

      const vendorRes = await request(app)
        .get('/api/expenses?search=Flavor')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(vendorRes.status).toBe(200);
      expect(vendorRes.body.totalCount).toBe(2);
    });

    it('paginates expenses accurately', async () => {
      const res = await request(app)
        .get('/api/expenses?limit=2&page=1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.expenses.length).toBe(2);
      expect(res.body.totalCount).toBe(3);
      expect(res.body.totalPages).toBe(2);
    });
  });

  // -------------------------------------------------------------
  // Security & Cross-Family Isolation Tests
  // -------------------------------------------------------------
  describe('Multi-Tenancy & Security Isolation', () => {
    it('strictly prevents Family B from viewing, updating, or deleting Family A expenses', async () => {
      // 1. Create expense in Family A
      const createRes = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Family A Secret Jewellery Order',
          amount: 500000,
          category: 'jewellery',
          date: '2026-11-12',
          paidByName: 'Rajesh',
          paymentMethod: 'bank_transfer',
        });
      const expenseId = createRes.body.expense.id;

      // 2. Family B attempts to fetch Family A expense
      const getRes = await request(app)
        .get(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${otherFamilyOwnerToken}`);
      expect(getRes.status).toBe(404);

      // 3. Family B attempts to update Family A expense
      const updateRes = await request(app)
        .put(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${otherFamilyOwnerToken}`)
        .send({
          title: 'Tampered Title',
          amount: 100,
          category: 'other',
          date: '2026-11-12',
          paidByName: 'Hacker',
          paymentMethod: 'cash',
        });
      expect(updateRes.status).toBe(404);

      // 4. Family B attempts to delete Family A expense
      const deleteRes = await request(app)
        .delete(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${otherFamilyOwnerToken}`);
      expect(deleteRes.status).toBe(404);

      // 5. Family B summary should NOT include Family A's expense
      const summaryB = await request(app)
        .get('/api/expenses/summary')
        .set('Authorization', `Bearer ${otherFamilyOwnerToken}`);
      expect(summaryB.body.totalCommitted).toBe(0);
      expect(summaryB.body.totalExpenseCount).toBe(0);
    });

    it('strictly blocks unauthenticated requests from accessing budget or expenses', async () => {
      const getBudget = await request(app).get('/api/budget');
      expect(getBudget.status).toBe(401);

      const getExpenses = await request(app).get('/api/expenses');
      expect(getExpenses.status).toBe(401);

      const postExpense = await request(app).post('/api/expenses').send({ title: 'Hack' });
      expect(postExpense.status).toBe(401);
    });
  });
});

