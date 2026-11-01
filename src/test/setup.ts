import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Provide standard mock fetch for frontend unit & integration tests
if (!global.fetch || typeof global.fetch !== 'function' || vi.isMockFunction(global.fetch) === false) {
  global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    if (urlStr.includes('/api/setup/status')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ setupRequired: false }),
      });
    }
    if (urlStr.includes('/api/auth/me')) {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });
    }
    if (urlStr.includes('/api/invitations/verify')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          invitation: {
            id: 'inv-test',
            name: 'Priya Sharma',
            email: 'priya@family.com',
            role: 'FAMILY_MEMBER',
            expires_at: '2026-12-31T00:00:00.000Z',
          },
          family: {
            id: 'fam-1',
            name: 'Sharma & Verma Wedding',
            bride_name: 'Kavya',
            groom_name: 'Rohan',
          },
        }),
      });
    }
    if (urlStr.includes('/api/family/members')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          members: [
            {
              id: 'user-1',
              family_id: 'fam-1',
              name: 'Amit Sharma',
              email: 'admin@sharma.com',
              role: 'OWNER',
              side: 'groom',
              is_active: 1,
              created_at: '2026-10-31T00:00:00.000Z',
              updated_at: '2026-10-31T00:00:00.000Z',
            },
          ],
        }),
      });
    }
    if (urlStr.includes('/api/invitations')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          invitations: [],
        }),
      });
    }
    if (urlStr.includes('/api/budget')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          totalBudget: 2500000,
          totalBudgetPaise: 250000000,
          currency: 'INR',
          updatedAt: '2026-11-01T00:00:00.000Z',
          budgetUpdatedByUserId: null,
        }),
      });
    }
    if (urlStr.includes('/api/expenses/summary')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          totalBudget: 2500000,
          totalBudgetPaise: 250000000,
          totalCommitted: 0,
          totalCommittedPaise: 0,
          totalPaid: 0,
          totalPaidPaise: 0,
          totalOutstanding: 0,
          totalOutstandingPaise: 0,
          remainingBudget: 2500000,
          remainingBudgetPaise: 250000000,
          cashRemaining: 2500000,
          cashRemainingPaise: 250000000,
          budgetUtilizationPercentage: 0,
          totalExpenseCount: 0,
          categoryBreakdown: [],
          recentExpenses: [],
        }),
      });
    }
    if (urlStr.includes('/api/expenses')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          expenses: [],
          totalCount: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
  });
}

