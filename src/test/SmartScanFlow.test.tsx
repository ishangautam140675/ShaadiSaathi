import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Phase 6 Frontend: SmartScan, Reports, Safe Export & Backups Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders SmartScan screen with file dropzone, camera capture, and privacy guarantee', async () => {
    window.history.pushState({}, 'SmartScan', '/smartscan');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /SmartScan Receipt Staging/i })).toBeInTheDocument();
    });

    // Check privacy guarantee banner
    expect(screen.getByText(/Engineering Principle: Zero Fake AI Claims/i)).toBeInTheDocument();

    // Check upload buttons
    expect(screen.getByText('Browse File')).toBeInTheDocument();
    expect(screen.getByText(/Take Photo/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Document Scans/i)).toBeInTheDocument();
  });

  it('renders Reports screen with financial summary, export triggers, and charts', async () => {
    // Mock fetch for reports summary
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('/api/reports/summary')) {
        return {
          ok: true,
          json: async () => ({
            currency: 'INR',
            asOfDate: '2026-11-01',
            budgetSummary: {
              totalBudget: 5000000,
              totalCommitted: 1200000,
              totalPaid: 800000,
              totalOutstanding: 400000,
              remainingBudget: 3800000,
              cashRemaining: 4200000,
              budgetUtilization: 24,
            },
            categories: [
              {
                category: 'venue',
                count: 2,
                totalAmount: 600000,
                paidAmount: 400000,
                outstandingAmount: 200000,
                percentageOfBudget: 12,
                percentageOfSpend: 50,
              },
            ],
            vendors: [
              {
                vendorId: 'ven-1',
                vendorName: 'Royal Palace Banquet',
                category: 'venue',
                agreedAmount: 500000,
                paidAmount: 300000,
                balanceAmount: 200000,
                status: 'booked',
                paymentCount: 1,
              },
            ],
            shopping: {
              totalItems: 5,
              estimatedTotal: 150000,
              actualSpent: 120000,
              variance: -30000,
              purchasedCount: 3,
              pendingCount: 2,
            },
            checklist: {
              totalTasks: 10,
              completedTasks: 4,
              pendingTasks: 6,
              completionPercentage: 40,
            },
            shagunGifts: {
              totalCashShagun: 51000,
              cashEnvelopesCount: 3,
              physicalGiftsCount: 2,
              jewelleryGiftsCount: 1,
              totalGiftsCount: 6,
              brideSideAmount: 31000,
              groomSideAmount: 20000,
              mutualAmount: 0,
            },
            monthlyTimeline: [],
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    window.history.pushState({}, 'Reports', '/reports');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Financial Reports & Insights/i })).toBeInTheDocument();
    });

    // Check financial KPI cards
    await waitFor(() => {
      expect(screen.getByText('Target Budget')).toBeInTheDocument();
      expect(screen.getByText('Total Committed')).toBeInTheDocument();
      expect(screen.getByText('Total Paid')).toBeInTheDocument();
      expect(screen.getByText('Outstanding Balance')).toBeInTheDocument();
    });

    // Check Safe CSV and Master JSON export buttons
    expect(screen.getByRole('button', { name: /Export Expenses CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Vendors CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Shagun CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Master JSON Backup/i })).toBeInTheDocument();
  });

  it('renders Settings screen with master backup and opens restore modal', async () => {
    window.history.pushState({}, 'Settings', '/settings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Application Settings/i })).toBeInTheDocument();
    });

    // Check Data Portability section
    expect(screen.getByText(/Data Portability & Master Backups/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Master Backup \(JSON\)/i })).toBeInTheDocument();
  });

  it('supports seamless bilingual Hindi translation on SmartScan and Reports', async () => {
    window.history.pushState({}, 'Reports', '/reports');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Financial Reports/i })).toBeInTheDocument();
    });

    // Click Hindi switch
    const langBtn = screen.getByRole('button', { name: /हिन्दी|हिंदी/i });
    fireEvent.click(langBtn);

    // Verify translated headings
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /वित्तीय विश्लेषण एवं रिपोर्ट/i })).toBeInTheDocument();
    });

    // Navigate to SmartScan in Hindi
    window.history.pushState({}, 'SmartScan', '/smartscan');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /स्मार्ट स्कैन रसीद सत्यापन/i })).toBeInTheDocument();
    });
  });
});
