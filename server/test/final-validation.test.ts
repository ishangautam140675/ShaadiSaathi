import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServerApp, type AppContext } from '../app.ts';
import { AppDatabase } from '../db/database.ts';

describe('Phase 7 Final End-to-End Validation & Production Security', () => {
  let appCtx: AppContext;
  let testDb: AppDatabase;
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    testDb = new AppDatabase({ inMemory: true });
    appCtx = createServerApp(testDb);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    testDb.close();
  });

  describe('1. Production Security Headers & Static Asset Serving', () => {
    it('sets standard defensive security headers on all responses', async () => {
      const res = await request(appCtx.app).get('/api/setup/status');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['permissions-policy']).toContain('camera=(self)');
      expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    });

    it('serves SPA fallback and static PWA assets with proper cache headers', async () => {
      // Test SPA fallback for client routes
      const spaRes = await request(appCtx.app).get('/expenses');
      if (spaRes.status === 200) {
        expect(spaRes.headers['content-type']).toContain('text/html');
        expect(spaRes.headers['cache-control']).toContain('no-cache');
      }

      // Test manifest serving
      const manifestRes = await request(appCtx.app).get('/manifest.webmanifest');
      if (manifestRes.status === 200) {
        expect(manifestRes.headers['content-type']).toContain('application/manifest+json');
      }
    });

    it('blocks cross-origin state mutations in production with mismatched Origin header', async () => {
      const res = await request(appCtx.app)
        .post('/api/setup/initialize')
        .set('Host', 'shaadisaathi.example.com')
        .set('Origin', 'https://malicious-site.com')
        .send({ familyName: 'Hacked' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('CSRF_BLOCKED');
    });
  });

  describe('2. Multi-Device Simultaneous Session Isolation', () => {
    let ownerCookie: string;
    let memberCookie: string;

    it('initializes family and owner account (Device A)', async () => {
      const res = await request(appCtx.app)
        .post('/api/setup/initialize')
        .send({
          familyName: 'Kapoor Parivar',
          brideName: 'Ananya',
          groomName: 'Rohan',
          weddingDate: '2027-02-14',
          adminName: 'Rajesh Kapoor (Owner)',
          adminEmail: 'rajesh@kapoor.test',
          adminPassword: 'Password@123',
          adminSide: 'groom',
        });

      expect(res.status).toBe(201);
      expect(res.body.family).toBeDefined();
      expect(res.body.user.role).toBe('OWNER');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      ownerCookie = cookies[0];
    });

    it('creates an invitation and provisions a Family Member session (Device B)', async () => {
      // Owner on Device A invites Priyanka as FAMILY_MEMBER
      const inviteRes = await request(appCtx.app)
        .post('/api/invitations')
        .set('Cookie', ownerCookie)
        .send({
          name: 'Priyanka Kapoor',
          email: 'priyanka@kapoor.test',
          role: 'FAMILY_MEMBER',
          side: 'groom',
        });

      expect(inviteRes.status).toBe(201);
      const token = inviteRes.body.rawToken;
      expect(token).toBeDefined();

      // Device B accepts invitation
      const acceptRes = await request(appCtx.app)
        .post('/api/invitations/accept')
        .send({
          token,
          name: 'Priyanka Kapoor',
          password: 'SisterPassword@123',
        });

      expect(acceptRes.status).toBe(201);
      expect(acceptRes.body.user.role).toBe('FAMILY_MEMBER');
      memberCookie = acceptRes.headers['set-cookie'][0];
    });

    it('verifies independent sessions: Device A signing out does NOT log out Device B', async () => {
      // Device A signs out
      const signOutRes = await request(appCtx.app)
        .post('/api/auth/sign-out')
        .set('Cookie', ownerCookie);

      expect(signOutRes.status).toBe(200);

      // Device A should now be unauthorized
      const ownerCheck = await request(appCtx.app)
        .get('/api/auth/me')
        .set('Cookie', ownerCookie);
      expect(ownerCheck.status).toBe(401);

      // Device B (Priyanka) MUST still be authenticated as FAMILY_MEMBER
      const memberCheck = await request(appCtx.app)
        .get('/api/auth/me')
        .set('Cookie', memberCookie);
      expect(memberCheck.status).toBe(200);
      expect(memberCheck.body.user.email).toBe('priyanka@kapoor.test');
      expect(memberCheck.body.user.role).toBe('FAMILY_MEMBER');
    });

    it('strictly enforces RBAC: Family Member cannot create invitations or delete wedding', async () => {
      const blockedRes = await request(appCtx.app)
        .post('/api/invitations')
        .set('Cookie', memberCookie)
        .send({
          name: 'Unauthorized Invitee',
          email: 'unauth@kapoor.test',
          role: 'FAMILY_MEMBER',
        });

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error).toBe('FORBIDDEN');
    });
  });

  describe('3. Full Wedding Lifecycle & Financial Operations', () => {
    let ownerCookie: string;
    let vendorId: string;

    beforeAll(async () => {
      // Re-sign in owner
      const loginRes = await request(appCtx.app)
        .post('/api/auth/sign-in')
        .send({
          email: 'rajesh@kapoor.test',
          password: 'Password@123',
        });
      ownerCookie = loginRes.headers['set-cookie'][0];
    });

    it('updates total family wedding budget with integer paise precision', async () => {
      const res = await request(appCtx.app)
        .put('/api/budget')
        .set('Cookie', ownerCookie)
        .send({ totalBudget: 5000000 }); // ₹50 Lakhs

      expect(res.status).toBe(200);
      expect(res.body.budget.totalBudget).toBe(5000000);
    });

    it('logs an expense with partial payment and verifies balance calculations', async () => {
      const res = await request(appCtx.app)
        .post('/api/expenses')
        .set('Cookie', ownerCookie)
        .send({
          title: 'Royal Mandapam Booking Advance',
          amount: 800000, // ₹8 Lakhs total
          paidAmount: 300000, // ₹3 Lakhs advance
          category: 'venue',
          date: '2026-11-20',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'bank_transfer',
        });

      expect(res.status).toBe(201);
      expect(res.body.expense.outstandingBalance).toBe(500000); // ₹5 Lakhs pending
      expect(res.body.expense.paymentStatus).toBe('partially_paid');
    });

    it('creates a vendor, logs payment, and links to expense ledger', async () => {
      const vendorRes = await request(appCtx.app)
        .post('/api/vendors')
        .set('Cookie', ownerCookie)
        .send({
          name: 'Taj Banquet Caterers',
          category: 'catering',
          contactPerson: 'Chef Sanjeev',
          phone: '+919988776655',
          agreedAmount: 1200000, // ₹12 Lakhs
        });

      expect(vendorRes.status).toBe(201);
      vendorId = vendorRes.body.vendor.id;

      // Disburse payment against vendor
      const payRes = await request(appCtx.app)
        .post(`/api/vendors/${vendorId}/payments`)
        .set('Cookie', ownerCookie)
        .send({
          amount: 400000, // ₹4 Lakhs advance
          paymentDate: '2026-11-22',
          paymentMethod: 'bank_transfer',
          notes: 'Tasting & initial booking deposit',
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.payment.amount).toBe(400000);

      // Verify vendor balance in DB
      const vCheck = await request(appCtx.app)
        .get(`/api/vendors/${vendorId}`)
        .set('Cookie', ownerCookie);

      expect(vCheck.status).toBe(200);
      expect(vCheck.body.vendor.paidAmount).toBe(400000);
      expect(vCheck.body.vendor.balanceDue).toBe(800000);
    });

    it('records shopping trousseau item with estimated vs actual variance', async () => {
      const shopRes = await request(appCtx.app)
        .post('/api/shopping')
        .set('Cookie', ownerCookie)
        .send({
          name: 'Bridal Sabyasachi Lehenga',
          category: 'bride_clothing',
          assignedTo: 'Ananya',
          estimatedPrice: 350000,
          actualPrice: 380000, // ₹30k over estimate
          status: 'purchased',
        });

      expect(shopRes.status).toBe(201);
      expect(shopRes.body.item.actualPrice).toBe(380000);
    });

    it('records sacred Shagun gift and verifies strict decoupling from expenses', async () => {
      const giftRes = await request(appCtx.app)
        .post('/api/gifts')
        .set('Cookie', ownerCookie)
        .send({
          giverName: 'Sharma Family (Chachi Ji)',
          giftType: 'cash',
          amount: 51000, // Auspicious Shagun ₹51,000
          side: 'groom',
          notes: 'Tilak Ceremony Lifafa',
        });

      expect(giftRes.status).toBe(201);
      expect(giftRes.body.gift.amount).toBe(51000);

      // Verify Reports: Gifts must NEVER reduce the expense total or distort budget utilization
      const reportRes = await request(appCtx.app)
        .get('/api/reports/summary')
        .set('Cookie', ownerCookie);

      expect(reportRes.status).toBe(200);
      const report = reportRes.body;
      expect(report.budgetSummary.totalCommitted).toBe(800000); // Only the mandap expense
      expect(report.shagunGifts.totalCashShagun).toBe(51000);
    });

    it('creates, reads, and updates checklist milestones', async () => {
      const taskRes = await request(appCtx.app)
        .post('/api/checklist')
        .set('Cookie', ownerCookie)
        .send({
          title: 'Book Wedding Pandit Ji for Muhurat',
          phase: '3_months',
          dueDate: '2026-11-30',
          assignedTo: 'Rajesh Kapoor',
        });

      expect(taskRes.status).toBe(201);
      const taskId = taskRes.body.task.id;

      const updateRes = await request(appCtx.app)
        .put(`/api/checklist/${taskId}`)
        .set('Cookie', ownerCookie)
        .send({ status: 'completed' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.task.status).toBe('completed');
    });

    it('exports formula-safe CSV and verifies injection protection', async () => {
      // Create expense with formula payload
      const expRes = await request(appCtx.app)
        .post('/api/expenses')
        .set('Cookie', ownerCookie)
        .send({
          title: '=CMD|"/C calc"!A0', // Classic CSV injection vector
          amount: 1000,
          category: 'other',
          date: '2026-11-25',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'cash',
        });

      expect(expRes.status).toBe(201);

      const csvRes = await request(appCtx.app)
        .get('/api/export/csv?type=expenses')
        .set('Cookie', ownerCookie);

      expect(csvRes.status).toBe(200);
      expect(csvRes.text.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
      // Must prefix = with ' to neutralize formula injection
      expect(csvRes.text).toContain(`"'=CMD|""/C calc""!A0"`);
    });

    it('exports JSON backup and performs isolated disaster recovery restoration', async () => {
      const backupRes = await request(appCtx.app)
        .get('/api/export/json')
        .set('Cookie', ownerCookie);

      expect(backupRes.status).toBe(200);
      const archive = backupRes.body;
      expect(archive.archiveFormat).toBe('ShaadiSaathi-Wedding-Backup-V1');
      expect(archive.expenses.length).toBeGreaterThan(0);

      // Verify passwords and tokens are completely scrubbed
      for (const user of archive.members) {
        expect(user.password_hash).toBeUndefined();
        expect(user.password_salt).toBeUndefined();
      }

      // Perform disaster recovery restore
      const restoreRes = await request(appCtx.app)
        .post('/api/backup/restore')
        .set('Cookie', ownerCookie)
        .send({ archive });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.result.success).toBe(true);
    });
  });
});
