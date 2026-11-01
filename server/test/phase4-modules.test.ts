import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServerApp, type AppContext } from '../app.ts';
import { AppDatabase } from '../db/database.ts';

describe('Phase 4 Backend: Vendors, Payments, Shopping, Gifts & Checklist', () => {
  let ctx: AppContext;
  let ownerToken: string;
  let memberToken: string;
  let viewerToken: string;

  let _familyAId: string;
  let _familyBId: string;
  let familyBOwnerToken: string;

  beforeEach(async () => {
    const db = new AppDatabase({ inMemory: true });
    ctx = createServerApp(db);

    // 1. Setup Family A Primary Admin / Owner
    const setupRes = await request(ctx.app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Kapoor & Malhotra Wedding',
        brideName: 'Ananya',
        groomName: 'Kabir',
        weddingDate: '2026-12-25',
        totalBudget: 4000000,
        adminName: 'Rajesh Kapoor',
        adminEmail: 'rajesh@kapoor.com',
        adminPassword: 'Password123!',
      });
    expect(setupRes.status).toBe(201);
    ownerToken = setupRes.body.token;
    _familyAId = setupRes.body.family.id;

    // 2. Issue Invitation for Family Member
    const memberInvRes = await request(ctx.app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Simran Kapoor',
        email: 'simran@kapoor.com',
        role: 'FAMILY_MEMBER',
      });
    const memberTokenRaw = memberInvRes.body.rawToken;

    const acceptMemberRes = await request(ctx.app)
      .post('/api/invitations/accept')
      .send({
        token: memberTokenRaw,
        password: 'Password123!',
        name: 'Simran Kapoor',
      });
    memberToken = acceptMemberRes.body.token;

    // 3. Issue Invitation for Viewer
    const viewerInvRes = await request(ctx.app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Uncle Vinod',
        email: 'vinod@kapoor.com',
        role: 'VIEWER',
      });
    const viewerTokenRaw = viewerInvRes.body.rawToken;

    const acceptViewerRes = await request(ctx.app)
      .post('/api/invitations/accept')
      .send({
        token: viewerTokenRaw,
        password: 'Password123!',
        name: 'Uncle Vinod',
      });
    viewerToken = acceptViewerRes.body.token;

    // 4. Create separate Family B with its own Owner
    const famBId = 'family-b-uuid';
    const famBUserId = 'user-b-uuid';
    const famBNow = new Date().toISOString();

    ctx.appDb.db.prepare(`
      INSERT INTO families (id, name, bride_name, groom_name, wedding_date, total_budget, total_budget_paise, created_at, updated_at)
      VALUES (?, 'Sharma Wedding', 'Neha', 'Vikram', '2027-01-10', 3000000, 300000000, ?, ?)
    `).run(famBId, famBNow, famBNow);

    _familyBId = famBId;

    ctx.appDb.db.prepare(`
      INSERT INTO users (id, family_id, email, password_hash, password_salt, name, role, is_active, created_at, updated_at)
      VALUES (?, ?, 'sharma@owner.com', 'fakehash', 'fakesalt', 'Suresh Sharma', 'OWNER', 1, ?, ?)
    `).run(famBUserId, famBId, famBNow, famBNow);

    const sessionToken = 'token_for_family_b_owner_123';
    const { CryptoService } = await import('../services/cryptoService.ts');
    const tokenHash = CryptoService.hashToken(sessionToken);

    ctx.appDb.db.prepare(`
      INSERT INTO sessions (id, user_id, family_id, token_hash, expires_at)
      VALUES ('sess_b_owner', ?, ?, ?, datetime('now', '+30 days'))
    `).run(famBUserId, famBId, tokenHash);

    familyBOwnerToken = sessionToken;
  });

  // -------------------------------------------------------------
  // VENDOR MANAGEMENT TESTS
  // -------------------------------------------------------------
  describe('Vendor Management', () => {
    it('creates, reads, updates, and deletes a vendor with integer paise precision', async () => {
      // Create vendor
      const createRes = await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Royal Palace Banquet & Resort',
          category: 'venue',
          contactPerson: 'Harish Mehta',
          phone: '+91 98765 43210',
          city: 'Udaipur',
          agreedAmount: 1200000,
          advancePaid: 300000,
          dueDate: '2026-11-15',
          notes: 'Includes lakeside lawn and 20 AC rooms',
        });

      expect(createRes.status).toBe(201);
      const vendor = createRes.body.vendor;
      expect(vendor.name).toBe('Royal Palace Banquet & Resort');
      expect(vendor.agreedAmount).toBe(1200000);
      expect(vendor.agreedAmountPaise).toBe(120000000);
      expect(vendor.paidAmount).toBe(300000);
      expect(vendor.balanceDue).toBe(900000);
      expect(vendor.status).toBe('advance_paid');

      // Read vendor list
      const listRes = await request(ctx.app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.vendors.length).toBe(1);

      // Update vendor
      const updateRes = await request(ctx.app)
        .put(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          contactPerson: 'Mr. Rajesh Rawat (General Manager)',
          agreedAmount: 1300000,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.vendor.contactPerson).toBe('Mr. Rajesh Rawat (General Manager)');
      expect(updateRes.body.vendor.agreedAmount).toBe(1300000);
      expect(updateRes.body.vendor.balanceDue).toBe(1000000); // 13L - 3L = 10L

      // Delete vendor
      const deleteRes = await request(ctx.app)
        .delete(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(deleteRes.status).toBe(200);

      const verifyRes = await request(ctx.app)
        .get(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(verifyRes.status).toBe(404);
    });

    it('rejects invalid inputs on vendor creation and modification', async () => {
      // Empty name
      const emptyNameRes = await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: '',
          category: 'catering',
          agreedAmount: 500000,
        });
      expect(emptyNameRes.status).toBe(400);

      // Negative amount
      const negativeRes = await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Delhi Caterers',
          category: 'catering',
          agreedAmount: -100,
        });
      expect(negativeRes.status).toBe(400);

      // Advance exceeding agreed amount
      const excessRes = await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Delhi Caterers',
          category: 'catering',
          agreedAmount: 100000,
          advancePaid: 150000,
        });
      expect(excessRes.status).toBe(400);
    });
  });

  // -------------------------------------------------------------
  // VENDOR PAYMENT TRACKING & DOUBLE COUNTING PREVENTION
  // -------------------------------------------------------------
  describe('Vendor Payment Tracking & Expense Integration', () => {
    it('records payments transactionally, prevents overpayment, and verifies zero double-counting', async () => {
      // 1. Create a Photographer vendor (agreed ₹2,00,000, 0 advance)
      const vRes = await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Stories by Joseph Photography',
          category: 'photography',
          agreedAmount: 200000,
          advancePaid: 0,
        });
      const vendorId = vRes.body.vendor.id;

      // Initial financial summary before payment
      const initialExpSummary = await request(ctx.app)
        .get('/api/expenses/summary')
        .set('Authorization', `Bearer ${ownerToken}`);
      const initialCommitted = initialExpSummary.body.totalCommitted;

      // 2. Add partial payment of ₹50,000 linked to wedding expenses
      const pay1Res = await request(ctx.app)
        .post(`/api/vendors/${vendorId}/payments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 50000,
          paymentDate: '2026-10-15',
          paymentMethod: 'upi',
          transactionReference: 'UPI/294829/HDFC',
          notes: 'Pre-wedding shoot advance',
          recordInExpenses: true,
        });
      expect(pay1Res.status).toBe(201);
      expect(pay1Res.body.payment.amount).toBe(50000);
      expect(pay1Res.body.payment.linkedExpenseId).toBeDefined();

      // Check vendor totals updated
      const vAfterPay1 = await request(ctx.app)
        .get(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(vAfterPay1.body.vendor.paidAmount).toBe(50000);
      expect(vAfterPay1.body.vendor.balanceDue).toBe(150000);
      expect(vAfterPay1.body.vendor.status).toBe('advance_paid');

      // Check expense module received exactly one entry of ₹50,000
      const expAfterPay1 = await request(ctx.app)
        .get('/api/expenses/summary')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(expAfterPay1.body.totalCommitted).toBe(initialCommitted + 50000);
      expect(expAfterPay1.body.totalPaid).toBe(50000);

      // 3. Attempt overpayment (> ₹1,50,000 remaining) without allowOverpayment flag
      const overpayRes = await request(ctx.app)
        .post(`/api/vendors/${vendorId}/payments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 160000,
          paymentDate: '2026-11-01',
          paymentMethod: 'bank_transfer',
          allowOverpayment: false,
        });
      expect(overpayRes.status).toBe(400);

      // 4. Settle remaining ₹1,50,000
      const pay2Res = await request(ctx.app)
        .post(`/api/vendors/${vendorId}/payments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 150000,
          paymentDate: '2026-11-01',
          paymentMethod: 'bank_transfer',
          recordInExpenses: true,
        });
      expect(pay2Res.status).toBe(201);

      // Check vendor is now fully settled
      const vAfterPay2 = await request(ctx.app)
        .get(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(vAfterPay2.body.vendor.paidAmount).toBe(200000);
      expect(vAfterPay2.body.vendor.balanceDue).toBe(0);
      expect(vAfterPay2.body.vendor.status).toBe('fully_paid');

      // Check wedding expenses reflect exactly ₹2,00,000 without duplication
      const finalExpSummary = await request(ctx.app)
        .get('/api/expenses/summary')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(finalExpSummary.body.totalCommitted).toBe(initialCommitted + 200000);
      expect(finalExpSummary.body.totalPaid).toBe(200000);
    });
  });

  // -------------------------------------------------------------
  // SHOPPING MANAGEMENT TESTS
  // -------------------------------------------------------------
  describe('Shopping Register', () => {
    it('manages shopping items, categories, priorities, and computes variance correctly', async () => {
      // 1. Create bridal lehenga item
      const item1Res = await request(ctx.app)
        .post('/api/shopping')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Sabyasachi Crimson Velvet Lehenga',
          category: 'bride_clothing',
          estimatedPrice: 350000,
          actualPrice: 320000,
          quantity: 1,
          status: 'purchased',
          assignedTo: 'Mami Ji & Bride',
          priority: 'urgent',
          deadline: '2026-11-10',
          storeName: 'Sabyasachi Mehrauli',
        });
      expect(item1Res.status).toBe(201);
      const item1 = item1Res.body.item;
      expect(item1.estimatedPrice).toBe(350000);
      expect(item1.actualPrice).toBe(320000);
      expect(item1.status).toBe('purchased');

      // 2. Create groom sherwani item (planned)
      const item2Res = await request(ctx.app)
        .post('/api/shopping')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Raw Silk Ivory Sherwani',
          category: 'groom_clothing',
          estimatedPrice: 150000,
          quantity: 1,
          status: 'planned',
          assignedTo: 'Kabir & Brother',
          priority: 'high',
          deadline: '2026-11-20',
          storeName: 'Manyavar Mohey',
        });
      expect(item2Res.status).toBe(201);

      // 3. Fetch Shopping Summary
      const summaryRes = await request(ctx.app)
        .get('/api/shopping/summary')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(summaryRes.status).toBe(200);
      const summary = summaryRes.body;
      expect(summary.totalItems).toBe(2);
      expect(summary.purchasedItems).toBe(1);
      expect(summary.pendingItems).toBe(1);
      expect(summary.estimatedTotal).toBe(500000); // 350k + 150k
      expect(summary.actualSpent).toBe(320000);   // only purchased item
      expect(summary.variance).toBe(180000);      // 500k - 320k

      // 4. Filter by priority
      const urgentList = await request(ctx.app)
        .get('/api/shopping?priority=urgent')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(urgentList.body.items.length).toBe(1);
      expect(urgentList.body.items[0].name).toBe('Sabyasachi Crimson Velvet Lehenga');

      // 5. Update and Delete
      const updateRes = await request(ctx.app)
        .put(`/api/shopping/${item2Res.body.item.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          status: 'in_tailoring',
          notes: 'Fittings scheduled for next Tuesday',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.item.status).toBe('in_tailoring');

      const delRes = await request(ctx.app)
        .delete(`/api/shopping/${item2Res.body.item.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(delRes.status).toBe(200);
    });
  });

  // -------------------------------------------------------------
  // GIFTS & SHAGUN REGISTER TESTS
  // -------------------------------------------------------------
  describe('Gifts & Shagun Register', () => {
    it('records cash and physical gifts, computes separate summary, and protects expense decoupling', async () => {
      // 1. Record Cash Shagun Envelope
      const shagunRes = await request(ctx.app)
        .post('/api/gifts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          giverName: 'Shri Ramakant Sharma (Tau Ji)',
          relation: 'Paternal Uncle',
          giftType: 'cash',
          amount: 51001,
          dateReceived: '2026-10-24',
          recipient: 'couple',
          side: 'groom',
          notes: 'Traditional Shagun lifafa with silver coin',
        });
      expect(shagunRes.status).toBe(201);
      expect(shagunRes.body.gift.amount).toBe(51001);
      expect(shagunRes.body.gift.amountPaise).toBe(5100100);

      // 2. Record Physical Gift (Silver Dinner Set, amount = 0)
      const physicalRes = await request(ctx.app)
        .post('/api/gifts')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          giverName: 'Mehra Family',
          relation: 'Close Friends',
          giftType: 'physical_gift',
          amount: 0,
          description: 'Silver-Plated 24-Piece Dinner Set',
          dateReceived: '2026-10-25',
          recipient: 'couple',
          side: 'bride',
        });
      expect(physicalRes.status).toBe(201);
      expect(physicalRes.body.gift.amount).toBeUndefined();

      // 3. Record Jewellery Gift
      const jewelleryRes = await request(ctx.app)
        .post('/api/gifts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          giverName: 'Dadi Ji',
          relation: 'Paternal Grandmother',
          giftType: 'jewellery',
          description: 'Ancestral Gold Kundan Necklace',
          dateReceived: '2026-10-25',
          side: 'groom',
        });
      expect(jewelleryRes.status).toBe(201);

      // 4. Get Gifts Summary
      const summaryRes = await request(ctx.app)
        .get('/api/gifts/summary')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.totalGiftsCount).toBe(3);
      expect(summaryRes.body.cashEnvelopesCount).toBe(1);
      expect(summaryRes.body.physicalGiftsCount).toBe(1);
      expect(summaryRes.body.jewelleryGiftsCount).toBe(1);
      expect(summaryRes.body.totalCashShagun).toBe(51001);

      // 5. Sacred Separation Guarantee: Check that wedding expenses and budget remained 100% untouched
      const expSummary = await request(ctx.app)
        .get('/api/expenses/summary')
        .set('Authorization', `Bearer ${ownerToken}`);
      // Gifts are NEVER counted as income or subtracted from expenses
      expect(expSummary.body.totalCommitted).toBe(0);
      expect(expSummary.body.totalPaid).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // WEDDING CHECKLIST TESTS
  // -------------------------------------------------------------
  describe('Wedding Checklist', () => {
    it('manages time-phased tasks, toggles completion, and calculates progress percentage', async () => {
      // 1. Create task
      const taskRes = await request(ctx.app)
        .post('/api/checklist')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Finalize Pandit Ji and auspicious Muhurat',
          category: 'Rituals & Ceremony',
          phase: '3_months',
          assignedTo: 'Dad & Chacha Ji',
          priority: 'high',
          dueDate: '2026-09-25',
        });
      expect(taskRes.status).toBe(201);
      const taskId = taskRes.body.task.id;
      expect(taskRes.body.task.status).toBe('pending');
      expect(taskRes.body.task.isCompleted).toBe(false);

      // Create a second task
      await request(ctx.app)
        .post('/api/checklist')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Send digital save-the-date invites on WhatsApp',
          category: 'Invitations',
          phase: '3_months',
          priority: 'urgent',
        });

      // Check summary: 0 / 2 completed = 0%
      let summaryRes = await request(ctx.app)
        .get('/api/checklist/summary')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(summaryRes.body.totalTasks).toBe(2);
      expect(summaryRes.body.completedTasks).toBe(0);
      expect(summaryRes.body.completionPercentage).toBe(0);

      // 2. Toggle completion on task 1
      const toggleRes = await request(ctx.app)
        .patch(`/api/checklist/${taskId}/toggle`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.task.status).toBe('completed');
      expect(toggleRes.body.task.isCompleted).toBe(true);
      expect(toggleRes.body.task.completedAt).toBeDefined();

      // Check summary: 1 / 2 completed = 50%
      summaryRes = await request(ctx.app)
        .get('/api/checklist/summary')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(summaryRes.body.completedTasks).toBe(1);
      expect(summaryRes.body.completionPercentage).toBe(50);

      // 3. Delete task
      const delRes = await request(ctx.app)
        .delete(`/api/checklist/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(delRes.status).toBe(200);
    });
  });

  // -------------------------------------------------------------
  // MULTI-TENANCY & RBAC SECURITY ISOLATION
  // -------------------------------------------------------------
  describe('Multi-Tenancy & RBAC Security Enforcement', () => {
    it('strictly isolates Family A data from Family B', async () => {
      // Create vendor for Family A
      const vA = await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Family A Caterer',
          category: 'catering',
          agreedAmount: 500000,
        });

      // Family B tries to read Family A vendor
      const leakRes = await request(ctx.app)
        .get(`/api/vendors/${vA.body.vendor.id}`)
        .set('Authorization', `Bearer ${familyBOwnerToken}`);
      expect(leakRes.status).toBe(404);

      // Family B list only contains Family B vendors (0 items)
      const listBRes = await request(ctx.app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${familyBOwnerToken}`);
      expect(listBRes.body.vendors.length).toBe(0);

      // Create shopping item for Family A
      const sA = await request(ctx.app)
        .post('/api/shopping')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Family A Sherwani',
          category: 'groom_clothing',
          estimatedPrice: 50000,
        });

      // Family B tries to delete Family A shopping item
      const sDelRes = await request(ctx.app)
        .delete(`/api/shopping/${sA.body.item.id}`)
        .set('Authorization', `Bearer ${familyBOwnerToken}`);
      expect(sDelRes.status).toBe(404);
    });

    it('enforces RBAC: VIEWER cannot create, update, or delete records', async () => {
      // Viewer attempts to create vendor -> 403 Forbidden
      const vCreateRes = await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Hacked Vendor',
          category: 'other',
          agreedAmount: 100000,
        });
      expect(vCreateRes.status).toBe(403);

      // Viewer attempts to create shopping item -> 403 Forbidden
      const sCreateRes = await request(ctx.app)
        .post('/api/shopping')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Hacked Item',
          category: 'other',
          estimatedPrice: 1000,
        });
      expect(sCreateRes.status).toBe(403);

      // Viewer attempts to record gift -> 403 Forbidden
      const gCreateRes = await request(ctx.app)
        .post('/api/gifts')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          giverName: 'Attacker',
          giftType: 'cash',
          amount: 500,
        });
      expect(gCreateRes.status).toBe(403);

      // Viewer attempts to create checklist task -> 403 Forbidden
      const tCreateRes = await request(ctx.app)
        .post('/api/checklist')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Unauthorized task',
        });
      expect(tCreateRes.status).toBe(403);
    });
  });
});
