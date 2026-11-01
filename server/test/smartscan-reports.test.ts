import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import { AppDatabase } from '../db/database.ts';
import { createServerApp, type AppContext } from '../app.ts';

describe('Phase 6 Backend: SmartScan, Financial Reports, Safe Export & Backups', () => {
  let ctx: AppContext;
  let ownerToken: string;
  let memberToken: string;
  let viewerToken: string;
  let familyAId: string;

  let familyBOwnerToken: string;
  let familyBId: string;

  const sampleReceiptText = `
    ROYAL PALACE & BANQUETS
    GSTIN: 07AAAAA0000A1Z5
    Date: 2026-11-15
    Bill No: RPB-9942

    Item Description          Qty     Rate       Amount
    ---------------------------------------------------
    Lawn & Mandap Booking       1   250000   250,000.00
    Floral & Lighting Decor     1    85000    85,000.00
    Catering Welcome Drinks   500      150    75,000.00

    ---------------------------------------------------
    Subtotal:                             410,000.00
    GST (18%):                             73,800.00
    Grand Total:                          483,800.00
    Paid via UPI:                         100,000.00
    Balance Due:                          383,800.00
  `;

  beforeEach(async () => {
    const db = new AppDatabase({ inMemory: true });
    ctx = createServerApp(db);

    // 1. Setup Family A (Kapoor & Malhotra Wedding)
    const setupRes = await request(ctx.app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Kapoor Wedding',
        brideName: 'Riya Kapoor',
        groomName: 'Kabir Malhotra',
        weddingDate: '2026-12-25',
        totalBudget: 5000000, // 50 Lakhs
        adminName: 'Rajesh Kapoor',
        adminEmail: 'rajesh@kapoor.com',
        adminPassword: 'Password123!',
      });
    expect(setupRes.status).toBe(201);
    ownerToken = setupRes.body.token;
    familyAId = setupRes.body.family.id;

    // 2. Member User
    const memberInvRes = await request(ctx.app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Simran Kapoor',
        email: 'simran@kapoor.com',
        role: 'FAMILY_MEMBER',
      });
    const acceptMemberRes = await request(ctx.app)
      .post('/api/invitations/accept')
      .send({
        token: memberInvRes.body.rawToken,
        password: 'Password123!',
        name: 'Simran Kapoor',
      });
    memberToken = acceptMemberRes.body.token;

    // 3. Viewer User
    const viewerInvRes = await request(ctx.app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Uncle Vinod',
        email: 'vinod@kapoor.com',
        role: 'VIEWER',
      });
    const acceptViewerRes = await request(ctx.app)
      .post('/api/invitations/accept')
      .send({
        token: viewerInvRes.body.rawToken,
        password: 'Password123!',
        name: 'Uncle Vinod',
      });
    viewerToken = acceptViewerRes.body.token;

    // 4. Setup Family B
    familyBId = 'family-b-scan-uuid';
    const famBUserId = 'user-b-scan-uuid';
    const famBNow = new Date().toISOString();

    ctx.appDb.db.prepare(`
      INSERT INTO families (id, name, bride_name, groom_name, wedding_date, total_budget, total_budget_paise, created_at, updated_at)
      VALUES (?, 'Sharma Wedding', 'Priya Sharma', 'Rohan Verma', '2027-01-10', 2500000, 250000000, ?, ?)
    `).run(familyBId, famBNow, famBNow);

    ctx.appDb.db.prepare(`
      INSERT INTO users (id, family_id, email, password_hash, password_salt, name, role, is_active, created_at, updated_at)
      VALUES (?, ?, 'amit@sharma.com', 'fakehash', 'fakesalt', 'Amit Sharma', 'OWNER', 1, ?, ?)
    `).run(famBUserId, familyBId, famBNow, famBNow);

    const sessionBToken = 'token_for_family_b_scan_123';
    const { CryptoService } = await import('../services/cryptoService.ts');
    const tokenBHash = CryptoService.hashToken(sessionBToken);

    ctx.appDb.db.prepare(`
      INSERT INTO sessions (id, user_id, family_id, token_hash, user_agent, ip_address, expires_at, created_at, last_active_at)
      VALUES ('session-b-scan-1', ?, ?, ?, 'TestAgent', '127.0.0.1', datetime('now', '+7 days'), datetime('now'), datetime('now'))
    `).run(famBUserId, familyBId, tokenBHash);

    familyBOwnerToken = sessionBToken;
  });

  describe('1. Document Upload & Metadata Security', () => {
    it('allows OWNER and FAMILY_MEMBER to upload receipts', async () => {
      const tempFilePath = path.join(ctx.documentService.getUploadsDir(), 'temp_receipt.txt');
      fs.writeFileSync(tempFilePath, sampleReceiptText);

      const res = await request(ctx.app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('file', tempFilePath);

      expect(res.status).toBe(201);
      expect(res.body.document).toBeDefined();
      expect(res.body.document.familyId).toBe(familyAId);
      expect(res.body.document.originalFilename).toBe('temp_receipt.txt');
      expect(res.body.document.ocrStatus).toBe('pending');
      expect(res.body.document.importStatus).toBe('unreviewed');

      // Cleanup
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    });

    it('denies VIEWER from uploading documents', async () => {
      const tempFilePath = path.join(ctx.documentService.getUploadsDir(), 'viewer_test.txt');
      fs.writeFileSync(tempFilePath, 'Test Content');

      const res = await request(ctx.app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${viewerToken}`)
        .attach('file', tempFilePath);

      expect(res.status).toBe(403);
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    });

    it('rejects forbidden file types', async () => {
      const tempExePath = path.join(ctx.documentService.getUploadsDir(), 'malicious.exe');
      fs.writeFileSync(tempExePath, 'MZ binary content');

      const res = await request(ctx.app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', tempExePath);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('INVALID_FILE_TYPE');
      if (fs.existsSync(tempExePath)) fs.unlinkSync(tempExePath);
    });
  });

  describe('2. Text Parsing, Line Item Extraction & Discrepancy Detection', () => {
    it('heuristically extracts vendor, date, line items, and detects grand total discrepancy', () => {
      const parsed = ctx.ocrService.parseReceiptText(sampleReceiptText, 95);

      expect(parsed.detectedVendor).toBe('ROYAL PALACE & BANQUETS');
      expect(parsed.detectedDate).toBe('2026-11-15');
      expect(parsed.detectedGrandTotal).toBe(483800);
      expect(parsed.lineItems.length).toBeGreaterThanOrEqual(3);

      // Line items sum: 250000 + 85000 + 75000 = 410,000 (pre-tax subtotal)
      // Grand total detected is 483,800 (with GST).
      // Discrepancy should be detected accurately without inventing numbers!
      expect(parsed.hasTotalDiscrepancy).toBe(true);
      expect(parsed.discrepancyAmount).toBe(73800);
      expect(parsed.warnings.some((w) => w.includes('Discrepancy'))).toBe(true);

      // Verify category heuristics
      const venueItem = parsed.lineItems.find((l) => l.description.includes('Mandap'));
      expect(venueItem?.category).toBe('venue');

      const decorItem = parsed.lineItems.find((l) => l.description.includes('Decor'));
      expect(decorItem?.category).toBe('decoration');
    });

    it('handles clean matching totals with zero discrepancy', () => {
      const cleanReceipt = `
        SHARMA SWEETS & CATERING
        Date: 2026-11-20
        Motichoor Ladoo 10kg     5000.00
        Kaju Katli 5kg           6000.00
        Total:                  11000.00
      `;
      const parsed = ctx.ocrService.parseReceiptText(cleanReceipt, 98);
      expect(parsed.detectedGrandTotal).toBe(11000);
      expect(parsed.sumOfExtractedRows).toBe(11000);
      expect(parsed.hasTotalDiscrepancy).toBe(false);
      expect(parsed.discrepancyAmount).toBe(0);
    });
  });

  describe('3. Duplicate Detection & Transactional Import', () => {
    let docId: string;

    beforeEach(async () => {
      const tempFilePath = path.join(ctx.documentService.getUploadsDir(), 'catering_bill.txt');
      fs.writeFileSync(tempFilePath, sampleReceiptText);

      const uploadRes = await request(ctx.app)
        .post('/api/documents/upload?autoOcr=true')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', tempFilePath);

      docId = uploadRes.body.document.id;
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    });

    it('detects duplicate expenses matching existing database records', async () => {
      // 1. Pre-insert an expense into family A
      await request(ctx.app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Royal Palace Lawn Advance',
          amount: 250000,
          category: 'venue',
          date: '2026-11-15',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'upi',
          paymentStatus: 'paid',
        });

      // 2. Check duplicates for proposed rows
      const checkRes = await request(ctx.app)
        .post(`/api/documents/${docId}/check-duplicates`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          rows: [
            { title: 'Lawn & Mandap Booking', amount: 250000, date: '2026-11-15' },
            { title: 'Floral Decor', amount: 85000, date: '2026-11-15' },
          ],
        });

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.results[0].isDuplicate).toBe(true);
      expect(checkRes.body.results[0].matchedTitle).toBe('Royal Palace Lawn Advance');
      expect(checkRes.body.results[1].isDuplicate).toBe(false);
    });

    it('transactionally imports reviewed rows with source_document_id and audit trail', async () => {
      const importRes = await request(ctx.app)
        .post(`/api/documents/${docId}/import`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          rows: [
            {
              title: 'Lawn & Mandap Booking',
              amount: 250000,
              category: 'venue',
              date: '2026-11-15',
              vendorName: 'Royal Palace',
              paymentStatus: 'paid',
            },
            {
              title: 'Floral & Lighting Decor',
              amount: 85000,
              category: 'decoration',
              date: '2026-11-15',
              vendorName: 'Royal Palace',
              paymentStatus: 'pending',
            },
          ],
        });

      expect(importRes.status).toBe(201);
      expect(importRes.body.count).toBe(2);
      expect(importRes.body.importedExpenses[0].sourceDocumentId).toBe(docId);
      expect(importRes.body.document.importStatus).toBe('imported');
      expect(importRes.body.document.acceptedCount).toBe(2);

      // Verify in expenses database
      const expensesRes = await request(ctx.app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`);

      const imported = expensesRes.body.expenses.filter((e: any) => e.sourceDocumentId === docId);
      expect(imported.length).toBe(2);
    });
  });

  describe('4. AI Enhancement Safety & Consent Enforcement', () => {
    it('strictly requires user consent for cloud AI processing', async () => {
      const tempFilePath = path.join(ctx.documentService.getUploadsDir(), 'consent_test.txt');
      fs.writeFileSync(tempFilePath, sampleReceiptText);

      const uploadRes = await request(ctx.app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', tempFilePath);

      const docId = uploadRes.body.document.id;

      // Call without consent
      const res = await request(ctx.app)
        .post(`/api/documents/${docId}/enhance`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userConsent: false });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('CONSENT_REQUIRED');

      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    });

    it('returns graceful fallback when GEMINI_API_KEY is not configured', async () => {
      const tempFilePath = path.join(ctx.documentService.getUploadsDir(), 'api_test.txt');
      fs.writeFileSync(tempFilePath, sampleReceiptText);

      const uploadRes = await request(ctx.app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', tempFilePath);

      const docId = uploadRes.body.document.id;

      const res = await request(ctx.app)
        .post(`/api/documents/${docId}/enhance`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userConsent: true });

      // Either 503 fallback if no key, or 200 if key provided in env
      if (!process.env.GEMINI_API_KEY) {
        expect(res.status).toBe(503);
        expect(res.body.error).toBe('GEMINI_UNAVAILABLE');
      }

      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    });
  });

  describe('5. Database-Backed Financial Reports & Multi-Module Analytics', () => {
    beforeEach(async () => {
      // 1. Add Expenses across categories
      await request(ctx.app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Mandap Booking',
          amount: 500000,
          category: 'venue',
          date: '2026-11-01',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'upi',
          paymentStatus: 'paid',
        });

      await request(ctx.app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Bridal Jewellery Advance',
          amount: 300000,
          category: 'jewellery',
          date: '2026-11-05',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'card',
          paymentStatus: 'partially_paid',
          paidAmount: 100000,
        });

      // 2. Add Vendor
      await request(ctx.app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Grand Caterers',
          category: 'catering',
          agreedAmount: 800000,
          paidAmount: 200000,
        });

      // 3. Add Sacred Shagun (Decoupled from expenses!)
      await request(ctx.app)
        .post('/api/gifts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          giverName: 'Maaji & Bauji',
          side: 'bride',
          giftType: 'cash',
          amount: 101000,
          dateReceived: '2026-11-10',
        });

      await request(ctx.app)
        .post('/api/gifts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          giverName: 'Chacha Ji',
          side: 'groom',
          giftType: 'jewellery',
          description: 'Gold Coin 10g',
          dateReceived: '2026-11-12',
        });
    });

    it('computes accurate integer paise financial metrics and category breakdowns', async () => {
      const res = await request(ctx.app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const data = res.body;

      // Budget = 50,00,000
      expect(data.budgetSummary.totalBudget).toBe(5000000);
      // Committed = 500000 + 300000 = 800,000
      expect(data.budgetSummary.totalCommitted).toBe(800000);
      // Paid = 500000 + 100000 = 600,000
      expect(data.budgetSummary.totalPaid).toBe(600000);
      // Outstanding = 200,000
      expect(data.budgetSummary.totalOutstanding).toBe(200000);
      // Remaining Budget = 50,00,000 - 8,00,000 = 42,00,000
      expect(data.budgetSummary.remainingBudget).toBe(4200000);

      // Verify category metrics
      expect(data.categories.length).toBeGreaterThanOrEqual(2);
      const venueCat = data.categories.find((c: any) => c.category === 'venue');
      expect(venueCat.totalAmount).toBe(500000);
      expect(venueCat.paidAmount).toBe(500000);

      // Verify Decoupled Sacred Shagun metrics
      expect(data.shagunGifts.totalCashShagun).toBe(101000);
      expect(data.shagunGifts.brideSideAmount).toBe(101000);
      expect(data.shagunGifts.jewelleryGiftsCount).toBe(1);
    });
  });

  describe('6. Safe RFC 4180 CSV Export with Formula Injection Guard & UTF-8 BOM', () => {
    it('sanitizes formula-triggering characters (=, +, -, @, \\t, \\r)', () => {
      expect(ctx.exportService.sanitizeCsvCell('=1+1')).toBe(`'=1+1`);
      expect(ctx.exportService.sanitizeCsvCell('+919876543210')).toBe(`'+919876543210`);
      expect(ctx.exportService.sanitizeCsvCell('@cmd')).toBe(`'@cmd`);
      expect(ctx.exportService.sanitizeCsvCell('-500')).toBe(`'-500`);
      expect(ctx.exportService.sanitizeCsvCell('Normal Text')).toBe('Normal Text');
    });

    it('exports expenses CSV with UTF-8 BOM for Excel Hindi support', async () => {
      await request(ctx.app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: '=cmd|’ /C calc’!A0', // malicious injection test string
          amount: 5000,
          category: 'other',
          date: '2026-11-01',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'cash',
          paymentStatus: 'paid',
        });

      const res = await request(ctx.app)
        .get('/api/export/csv?type=expenses')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      // Starts with UTF-8 BOM
      expect(res.text.charCodeAt(0)).toBe(0xFEFF);
      // Malicious cell was neutralized
      expect(res.text).toContain(`'=cmd`);
    });
  });

  describe('7. Portable JSON Backup Export & Isolated Restoration', () => {
    it('exports clean JSON backup without exposing password hashes or session tokens', async () => {
      const res = await request(ctx.app)
        .get('/api/export/json')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const archive = res.body;
      expect(archive.archiveFormat).toBe('ShaadiSaathi-Wedding-Backup-V1');
      expect(archive.family.name).toBe('Kapoor Wedding');
      expect(Array.isArray(archive.members)).toBe(true);

      // Verify strict security scrubbing
      for (const m of archive.members) {
        expect((m as any).password_hash).toBeUndefined();
        expect((m as any).password_salt).toBeUndefined();
      }
      expect(archive.sessions).toBeUndefined();
      expect(archive.invitations).toBeUndefined();
    });

    it('restores backup archive transactionally into a new wedding family', async () => {
      // 1. Pre-populate an expense in Family A
      await request(ctx.app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Wedding Band & Baaja',
          amount: 50000,
          category: 'other',
          date: '2026-11-20',
          paidByName: 'Rajesh Kapoor',
          paymentMethod: 'cash',
          paymentStatus: 'paid',
        });

      // 2. Get Family A's archive
      const backupRes = await request(ctx.app)
        .get('/api/export/json')
        .set('Authorization', `Bearer ${ownerToken}`);

      const archive = backupRes.body;

      // 3. Restore into Family B using Family B Owner token
      const restoreRes = await request(ctx.app)
        .post('/api/backup/restore')
        .set('Authorization', `Bearer ${familyBOwnerToken}`)
        .send({ archive });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.result.success).toBe(true);
      expect(restoreRes.body.result.importedCounts.expenses).toBeGreaterThanOrEqual(1);

      // Verify data exists under Family B
      const expBRes = await request(ctx.app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${familyBOwnerToken}`);

      expect(expBRes.body.expenses.length).toBeGreaterThanOrEqual(1);
      // And verify family A remains untouched
      expect(expBRes.body.expenses.every((e: any) => e.familyId === familyBId)).toBe(true);
    });

    it('rejects backup restoration from non-OWNER users', async () => {
      const res = await request(ctx.app)
        .post('/api/backup/restore')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ archive: { archiveFormat: 'ShaadiSaathi-Wedding-Backup-V1' } });

      expect(res.status).toBe(403);
    });
  });

  describe('8. Family Tenant Isolation across Phase 6 Endpoints', () => {
    it('prevents Family B from viewing or deleting Family A documents', async () => {
      const tempFilePath = path.join(ctx.documentService.getUploadsDir(), 'secret_a.txt');
      fs.writeFileSync(tempFilePath, sampleReceiptText);

      const uploadRes = await request(ctx.app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', tempFilePath);

      const docAId = uploadRes.body.document.id;

      // Family B tries to get document A
      const getRes = await request(ctx.app)
        .get(`/api/documents/${docAId}`)
        .set('Authorization', `Bearer ${familyBOwnerToken}`);
      expect(getRes.status).toBe(404);

      // Family B tries to delete document A
      const deleteRes = await request(ctx.app)
        .delete(`/api/documents/${docAId}`)
        .set('Authorization', `Bearer ${familyBOwnerToken}`);
      expect(deleteRes.status).toBe(404);

      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    });
  });
});
