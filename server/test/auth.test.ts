import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServerApp } from '../app.ts';
import { AppDatabase } from '../db/database.ts';

describe('Phase 2 Backend: Authentication, Multi-Device Isolation & Family RBAC', () => {
  let app: any;
  let testDb: AppDatabase;

  beforeEach(() => {
    testDb = new AppDatabase({ inMemory: true });
    const context = createServerApp(testDb);
    app = context.app;
  });

  it('reports setupRequired: true initially, then false after first admin is created', async () => {
    // 1. Check status
    const statusRes1 = await request(app).get('/api/setup/status');
    expect(statusRes1.status).toBe(200);
    expect(statusRes1.body.setupRequired).toBe(true);

    // 2. Initialize first admin
    const initRes = await request(app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Sharma & Verma Wedding',
        brideName: 'Kavya Sharma',
        groomName: 'Rohan Verma',
        weddingDate: '2026-12-18',
        totalBudget: 2500000,
        adminName: 'Rajesh Sharma',
        adminEmail: 'rajesh@sharmafamily.org',
        adminPassword: 'Password@123',
        adminSide: 'bride',
      });

    expect(initRes.status).toBe(201);
    expect(initRes.body.user.role).toBe('OWNER');
    expect(initRes.body.user.email).toBe('rajesh@sharmafamily.org');
    expect(initRes.headers['set-cookie']).toBeDefined();

    // 3. Status should now be setupRequired: false
    const statusRes2 = await request(app).get('/api/setup/status');
    expect(statusRes2.status).toBe(200);
    expect(statusRes2.body.setupRequired).toBe(false);

    // 4. Repeated initialization should be strictly FORBIDDEN (prevent replay)
    const replayRes = await request(app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Attacker Wedding',
        brideName: 'Alice',
        groomName: 'Bob',
        weddingDate: '2026-12-18',
        adminName: 'Attacker',
        adminEmail: 'attacker@evil.com',
        adminPassword: 'Password@123',
      });

    expect(replayRes.status).toBe(403);
    expect(replayRes.body.error).toBe('FORBIDDEN');
  });

  it('authenticates valid credentials, sets HttpOnly cookie, and rejects invalid attempts', async () => {
    // Setup first admin
    await request(app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Royal Wedding',
        brideName: 'Kavya',
        groomName: 'Rohan',
        weddingDate: '2026-12-18',
        adminName: 'Rajesh Sharma',
        adminEmail: 'rajesh@sharma.org',
        adminPassword: 'SuperSecurePassword@2026',
      });

    // 1. Invalid password
    const failRes = await request(app)
      .post('/api/auth/sign-in')
      .send({
        email: 'rajesh@sharma.org',
        password: 'WrongPassword',
      });
    expect(failRes.status).toBe(401);
    expect(failRes.body.error).toBe('AUTH_FAILED');

    // 2. Non-existent user
    const unknownRes = await request(app)
      .post('/api/auth/sign-in')
      .send({
        email: 'nobody@sharma.org',
        password: 'SuperSecurePassword@2026',
      });
    expect(unknownRes.status).toBe(401);

    // 3. Successful sign-in
    const successRes = await request(app)
      .post('/api/auth/sign-in')
      .send({
        email: 'rajesh@sharma.org',
        password: 'SuperSecurePassword@2026',
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.user.email).toBe('rajesh@sharma.org');
    expect(successRes.body.token).toBeDefined();

    // Verify /api/auth/me using the returned Bearer token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${successRes.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.name).toBe('Rajesh Sharma');
    expect(meRes.body.user.role).toBe('OWNER');
    expect(meRes.body.family.name).toBe('Royal Wedding');
  });

  it('guarantees multi-device session isolation and independent logout', async () => {
    // Setup first admin
    await request(app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Verma Wedding',
        brideName: 'Kavya',
        groomName: 'Rohan',
        weddingDate: '2026-12-18',
        adminName: 'Sunil Verma',
        adminEmail: 'sunil@verma.org',
        adminPassword: 'Password@2026',
      });

    // Device 1 (e.g. Laptop) logs in
    const device1Res = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: 'sunil@verma.org', password: 'Password@2026' })
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');

    const token1 = device1Res.body.token;

    // Device 2 (e.g. Mobile phone) logs in
    const device2Res = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: 'sunil@verma.org', password: 'Password@2026' })
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');

    const token2 = device2Res.body.token;

    // Verify tokens are unique
    expect(token1).not.toBe(token2);

    // Both sessions should be active
    const check1Before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token1}`);
    const check2Before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token2}`);
    expect(check1Before.status).toBe(200);
    expect(check2Before.status).toBe(200);

    // Logout from Device 1 only
    const logoutRes = await request(app)
      .post('/api/auth/sign-out')
      .set('Authorization', `Bearer ${token1}`);
    expect(logoutRes.status).toBe(200);

    // Device 1 should now be UNAUTHORIZED
    const check1After = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token1}`);
    expect(check1After.status).toBe(401);

    // Device 2 MUST REMAIN AUTHENTICATED! (Crucial multi-device test requirement)
    const check2After = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token2}`);
    expect(check2After.status).toBe(200);
    expect(check2After.body.user.email).toBe('sunil@verma.org');
  });

  it('manages the complete invitation lifecycle with role escalation prevention', async () => {
    // Setup first admin
    const adminInit = await request(app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Sharma Wedding',
        brideName: 'Kavya',
        groomName: 'Rohan',
        weddingDate: '2026-12-18',
        adminName: 'Rajesh Sharma',
        adminEmail: 'admin@sharma.org',
        adminPassword: 'Password@123',
      });
    const adminToken = adminInit.body.token;

    // 1. Reject role escalation (attempting to invite as OWNER directly)
    const escalateRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'cousin@sharma.org',
        name: 'Aman',
        role: 'OWNER', // Not allowed in invitation
      });
    expect(escalateRes.status).toBe(400);

    // 2. Successfully create invitation for FAMILY_MEMBER
    const inviteRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'aman@sharma.org',
        name: 'Aman Sharma',
        role: 'FAMILY_MEMBER',
        side: 'bride',
      });

    expect(inviteRes.status).toBe(201);
    const rawToken = inviteRes.body.rawToken;
    expect(rawToken).toBeDefined();

    // 3. Verify public invitation endpoint
    const verifyRes = await request(app).get(`/api/invitations/verify/${rawToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.invitation.email).toBe('aman@sharma.org');
    expect(verifyRes.body.invitation.role).toBe('FAMILY_MEMBER');

    // 4. Accept invitation and register
    const acceptRes = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: rawToken,
        name: 'Aman Sharma',
        password: 'AmanPassword@2026',
      });

    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.user.role).toBe('FAMILY_MEMBER');
    const memberToken = acceptRes.body.token;

    // 5. Attempting to reuse the accepted invitation must be REJECTED (One-time use)
    const reuseRes = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: rawToken,
        name: 'Attacker Reusing',
        password: 'Password@999',
      });
    expect(reuseRes.status).toBe(400);

    // 6. Test RBAC: Family Member CANNOT create new invitations (Only OWNER can)
    const unauthorizedInviteRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        email: 'friend@test.org',
        name: 'Friend',
        role: 'VIEWER',
      });
    expect(unauthorizedInviteRes.status).toBe(403);
    expect(unauthorizedInviteRes.body.error).toBe('FORBIDDEN');
  });

  it('rejects revoked invitations and enforces family member removal', async () => {
    // Setup admin
    const adminInit = await request(app)
      .post('/api/setup/initialize')
      .send({
        familyName: 'Wedding',
        brideName: 'Kavya',
        groomName: 'Rohan',
        weddingDate: '2026-12-18',
        adminName: 'Rajesh',
        adminEmail: 'rajesh@test.org',
        adminPassword: 'Password@123',
      });
    const adminToken = adminInit.body.token;

    // Create invitation for a Viewer
    const inviteRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'guest@test.org',
        name: 'Guest User',
        role: 'VIEWER',
      });
    const rawToken = inviteRes.body.rawToken;
    const invId = inviteRes.body.invitation.id;

    // Admin revokes invitation
    const revokeRes = await request(app)
      .delete(`/api/invitations/${invId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(revokeRes.status).toBe(200);

    // Verification must fail with REVOKED
    const verifyRevoked = await request(app).get(`/api/invitations/verify/${rawToken}`);
    expect(verifyRevoked.status).toBe(400);
    expect(verifyRevoked.body.reason).toBe('REVOKED');

    // Acceptance must fail
    const acceptRevoked = await request(app)
      .post('/api/invitations/accept')
      .send({ token: rawToken, password: 'Password@123' });
    expect(acceptRevoked.status).toBe(400);
  });
});
