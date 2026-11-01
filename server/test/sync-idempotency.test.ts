import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { AppDatabase } from '../db/database.ts';
import { createServerApp, type AppContext } from '../app.ts';

describe('Phase 5 Backend: Offline Sync, Idempotency & Concurrency Tests', () => {
  let ctx: AppContext;
  let ownerToken: string;
  let memberToken: string;
  let _viewerToken: string;
  let memberUserId: string;

  let familyAId: string;
  let familyBOwnerToken: string;

  beforeEach(async () => {
    const db = new AppDatabase({ inMemory: true });
    ctx = createServerApp(db);

    // 1. Setup Family A with Owner
    const setupRes = await request(ctx.app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Kapoor & Malhotra Wedding',
        brideName: 'Riya Kapoor',
        groomName: 'Kabir Malhotra',
        weddingDate: '2026-12-25',
        totalBudget: 4000000,
        adminName: 'Rajesh Kapoor',
        adminEmail: 'rajesh@kapoor.com',
        adminPassword: 'Password123!',
      });
    expect(setupRes.status).toBe(201);
    ownerToken = setupRes.body.token;
    familyAId = setupRes.body.family.id;

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
    memberUserId = acceptMemberRes.body.user.id;

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
    _viewerToken = acceptViewerRes.body.token;

    // 4. Create separate Family B with its own Owner
    const famBId = 'family-b-sync-uuid';
    const famBUserId = 'user-b-sync-uuid';
    const famBNow = new Date().toISOString();

    ctx.appDb.db.prepare(`
      INSERT INTO families (id, name, bride_name, groom_name, wedding_date, total_budget, total_budget_paise, created_at, updated_at)
      VALUES (?, 'Sharma Wedding', 'Neha', 'Vikram', '2027-01-10', 3000000, 300000000, ?, ?)
    `).run(famBId, famBNow, famBNow);

    ctx.appDb.db.prepare(`
      INSERT INTO users (id, family_id, email, password_hash, password_salt, name, role, is_active, created_at, updated_at)
      VALUES (?, ?, 'sharma@sync.com', 'fakehash', 'fakesalt', 'Suresh Sharma', 'OWNER', 1, ?, ?)
    `).run(famBUserId, famBId, famBNow, famBNow);

    const sessionToken = 'token_for_family_b_sync_123';
    const { CryptoService } = await import('../services/cryptoService.ts');
    const tokenHash = CryptoService.hashToken(sessionToken);

    ctx.appDb.db.prepare(`
      INSERT INTO sessions (id, user_id, family_id, token_hash, user_agent, ip_address, expires_at, created_at, last_active_at)
      VALUES ('session-b-sync-1', ?, ?, ?, 'TestAgent', '127.0.0.1', datetime('now', '+7 days'), datetime('now'), datetime('now'))
    `).run(famBUserId, famBId, tokenHash);

    familyBOwnerToken = sessionToken;
  });

  describe('Idempotency & Duplicate Operation Prevention', () => {
    it('prevents duplicate expense creation when a network retry sends the same Idempotency-Key', async () => {
      const idempotencyKey = 'offline-op-expense-001';

      // First attempt (e.g. initial online send or sync push)
      const res1 = await request(ctx.app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          title: 'Bridal Mehendi Artist Deposit',
          amount: 25000,
          paidAmount: 10000,
          category: 'makeup',
          date: '2026-11-20',
          paidByName: 'Simran Kapoor',
          paymentMethod: 'upi',
          paymentStatus: 'partially_paid',
        });

      expect(res1.status).toBe(201);
      const createdExpenseId = res1.body.expense.id;

      // Second attempt with exact same key (e.g. network dropped before client received ACK)
      const res2 = await request(ctx.app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          title: 'Bridal Mehendi Artist Deposit',
          amount: 25000,
          paidAmount: 10000,
          category: 'makeup',
          date: '2026-11-20',
          paidByName: 'Simran Kapoor',
          paymentMethod: 'upi',
          paymentStatus: 'partially_paid',
        });

      // Must return identical successful response without creating a duplicate row in DB
      expect(res2.status).toBe(201);
      expect(res2.body.expense.id).toBe(createdExpenseId);

      // Verify DB row count: strictly 1 row in expenses
      const rows = ctx.appDb.db.prepare('SELECT COUNT(*) as count FROM expenses WHERE family_id = ?').get(familyAId) as { count: number };
      expect(rows.count).toBe(1);
    });

    it('prevents duplicate vendor payment when retry contains same Idempotency-Key', async () => {
      // Create vendor first
      const vendorRes = await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Royal Heritage Caterers',
          category: 'catering',
          contactPerson: 'Sanjay Chef',
          phone: '9876543210',
          agreedAmount: 500000,
        });
      const vendorId = vendorRes.body.vendor.id;

      const paymentKey = 'payment-retry-key-999';

      // First payment send
      const pay1 = await request(ctx.app)
        .post(`/api/vendors/${vendorId}/payments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', paymentKey)
        .send({
          amount: 150000,
          paymentDate: '2026-11-15',
          paymentMethod: 'bank_transfer',
          transactionReference: 'NEFT998877',
          recordInExpenses: true,
        });
      expect(pay1.status).toBe(201);

      // Retry payment send with same key
      const pay2 = await request(ctx.app)
        .post(`/api/vendors/${vendorId}/payments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', paymentKey)
        .send({
          amount: 150000,
          paymentDate: '2026-11-15',
          paymentMethod: 'bank_transfer',
          transactionReference: 'NEFT998877',
          recordInExpenses: true,
        });
      expect(pay2.status).toBe(201);

      // Verify vendor's advance paid is strictly 150,000 (NOT 300,000!)
      const vendorCheck = await request(ctx.app)
        .get(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(vendorCheck.body.vendor.paidAmount).toBe(150000);
      expect(vendorCheck.body.vendor.balanceDue).toBe(350000);
    });
  });

  describe('Optimistic Concurrency & Conflict Detection', () => {
    it('detects concurrent edits when an update provides an outdated expectedVersion', async () => {
      // 1. Create an expense initially (version = 1)
      const expRes = await request(ctx.app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Mandap Floral Decor',
          amount: 80000,
          paidAmount: 80000,
          category: 'decoration',
          date: '2026-11-10',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'cash',
          paymentStatus: 'paid',
        });
      const expenseId = expRes.body.expense.id;

      // 2. User A (on laptop) updates the expense (increments version to 2)
      const updateA = await request(ctx.app)
        .put(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Mandap Floral & Crystal Decor',
          amount: 95000,
          paidAmount: 95000,
          category: 'decoration',
          date: '2026-11-10',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          expectedVersion: 1, // Matches current version 1
        });
      expect(updateA.status).toBe(200);

      // 3. User B (on mobile phone, offline during update A) tries to sync edit based on version 1
      const updateB = await request(ctx.app)
        .put(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Mandap Fresh Marigold Decor',
          amount: 85000,
          paidAmount: 85000,
          category: 'decoration',
          date: '2026-11-10',
          paidByName: 'Simran Kapoor',
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          expectedVersion: 1, // Outdated! Current server version is 2
        });

      // Must return HTTP 409 Conflict with full server record and current version
      expect(updateB.status).toBe(409);
      expect(updateB.body.error).toBe('CONFLICT_DETECTED');
      expect(updateB.body.currentVersion).toBe(2);
      expect(updateB.body.serverRecord.title).toBe('Mandap Floral & Crystal Decor');
    });
  });

  describe('Batch Sync Queue & Permission Revocation', () => {
    it('processes batch synchronization queue with multiple entities', async () => {
      const batchPayload = {
        operations: [
          {
            operationId: 'sync-op-1',
            entityType: 'shopping',
            operationType: 'CREATE',
            payload: {
              name: 'Bridal Reception Lehenga',
              category: 'bride_clothing',
              estimatedPrice: 65000,
              quantity: 1,
              status: 'to_buy',
              assignedTo: 'Simran',
              priority: 'high',
            },
          },
          {
            operationId: 'sync-op-2',
            entityType: 'gift',
            operationType: 'CREATE',
            payload: {
              giverName: 'Bua Ji & Fufa Ji',
              relation: 'Paternal Aunt',
              giftType: 'cash',
              amount: 21000,
              dateReceived: '2026-11-01',
              side: 'groom',
            },
          },
          {
            operationId: 'sync-op-3',
            entityType: 'checklist',
            operationType: 'CREATE',
            payload: {
              title: 'Confirm Dhol & Brass Band Timings',
              category: 'Music',
              phase: 'wedding_week',
              assignedTo: 'Rajesh',
              priority: 'urgent',
            },
          },
        ],
      };

      const syncRes = await request(ctx.app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(batchPayload);

      expect(syncRes.status).toBe(200);
      expect(syncRes.body.total).toBe(3);
      expect(syncRes.body.results.length).toBe(3);

      for (const res of syncRes.body.results) {
        expect(res.status).toBe('synced');
        expect(res.serverRecord).toBeDefined();
      }
    });

    it('rejects queued sync operations if the users permissions were revoked while offline', async () => {
      // 1. Demote member to VIEWER on server while member was "offline"
      ctx.appDb.db.prepare('UPDATE users SET role = ? WHERE id = ?').run('VIEWER', memberUserId);

      // 2. Member comes back online and tries to sync a queued expense mutation
      const syncRes = await request(ctx.app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          operations: [
            {
              operationId: 'offline-revoked-op-1',
              entityType: 'expense',
              operationType: 'CREATE',
              payload: {
                title: 'Unauthorized Sangeet DJ Bill',
                amount: 30000,
                category: 'other',
                date: '2026-11-20',
                paidByName: 'Simran',
              },
            },
          ],
        });

      expect(syncRes.status).toBe(200);
      const opResult = syncRes.body.results[0];
      expect(opResult.status).toBe('error');
      expect(opResult.error.code).toBe('PERMISSION_DENIED');

      // Verify no expense was created
      const rows = ctx.appDb.db.prepare('SELECT COUNT(*) as count FROM expenses WHERE family_id = ?').get(familyAId) as { count: number };
      expect(rows.count).toBe(0);
    });
  });

  describe('Pull Synchronization & Multi-Tenancy Isolation', () => {
    it('pulls all family changes since a given timestamp for multi-device sync', async () => {
      const pullRes = await request(ctx.app)
        .get('/api/sync/changes')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(pullRes.status).toBe(200);
      expect(pullRes.body.familyId).toBe(familyAId);
      expect(pullRes.body.budget).toBeDefined();
      expect(Array.isArray(pullRes.body.expenses)).toBe(true);
      expect(Array.isArray(pullRes.body.vendors)).toBe(true);
      expect(Array.isArray(pullRes.body.shopping)).toBe(true);
      expect(Array.isArray(pullRes.body.gifts)).toBe(true);
      expect(Array.isArray(pullRes.body.checklist)).toBe(true);
    });

    it('strictly prevents Family B from viewing or modifying Family A sync data', async () => {
      const famBChanges = await request(ctx.app)
        .get('/api/sync/changes')
        .set('Authorization', `Bearer ${familyBOwnerToken}`);

      expect(famBChanges.status).toBe(200);
      expect(famBChanges.body.familyId).not.toBe(familyAId);
      // Family B has 0 expenses
      expect(famBChanges.body.expenses.length).toBe(0);
    });
  });
});
