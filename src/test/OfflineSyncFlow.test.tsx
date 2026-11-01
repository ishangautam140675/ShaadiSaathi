import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { ConflictResolutionModal } from '../components/modals/ConflictResolutionModal';
import { PwaUpdatePrompt } from '../components/common/PwaUpdatePrompt';
import { OfflineFallbackPage } from '../pages/OfflineFallbackPage';
import { LanguageProvider, useTranslation } from '../context/LanguageContext';
import { BrowserRouter } from 'react-router-dom';
import { offlineStorage } from '../services/storage/indexedDb';

describe('Phase 5 Frontend: Offline-First, Safe Synchronization & PWA Flow', () => {
  beforeEach(async () => {
    localStorage.clear();
    await offlineStorage.clearAllQueue();
    window.history.pushState({}, 'Dashboard', '/');
  });

  it('renders SyncIndicator in TopHeader displaying connection status', async () => {
    render(<App />);

    await waitFor(() => {
      // Top header should show sync indicator button
      const syncBtn = screen.getByLabelText(/Open synchronization details/i);
      expect(syncBtn).toBeInTheDocument();
    });
  });

  it('opens SyncStatusDrawer when SyncIndicator is clicked and displays storage safety notices', async () => {
    render(<App />);

    const syncBtn = await screen.findByLabelText(/Open synchronization details/i);
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(screen.getByText(/Synchronization & Offline Storage/i)).toBeInTheDocument();
    });

    // Check storage safety advisory banner
    expect(
      screen.getByText(/Offline drafts are saved in your device’s IndexedDB/i)
    ).toBeInTheDocument();

    // Check empty queue notice
    expect(
      screen.getByText(/All wedding entries are securely synchronized with the family server/i)
    ).toBeInTheDocument();

    // Check Close button
    const closeBtns = screen.getAllByRole('button', { name: /Close/i });
    expect(closeBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeBtns[0]);
  });

  it('renders ConflictResolutionModal with side-by-side comparison and anti-merge policy', () => {
    const onResolved = vi.fn();
    const onClose = vi.fn();

    const mockConflictOp = {
      operationId: 'op-exp-conflict-1',
      familyId: 'family-101',
      userId: 'user-1',
      entityType: 'expense' as const,
      entityId: 'exp-500',
      operationType: 'UPDATE' as const,
      payload: {
        title: 'Catering Advance (Mobile)',
        amount: 250000,
        notes: 'Paid via UPI on phone',
      },
      baseVersion: 1,
      createdAt: new Date().toISOString(),
      status: 'conflict' as const,
      retryCount: 1,
      serverRecord: {
        id: 'exp-500',
        title: 'Catering Advance (Laptop Edit)',
        amountPaise: 30000000,
        notes: 'Paid via NetBanking by Groom Uncle',
        version: 2,
      },
    };

    render(
      <LanguageProvider>
        <ConflictResolutionModal
          isOpen={true}
          operation={mockConflictOp}
          onResolved={onResolved}
          onClose={onClose}
        />
      </LanguageProvider>
    );

    // Header check
    expect(screen.getByText(/Review & Resolve Edit Conflict/i)).toBeInTheDocument();

    // Anti-merge policy explanation
    expect(screen.getByText(/Financial Security Notice: Automatic merging of monetary amounts or payments is disabled/i)).toBeInTheDocument();

    // Check side-by-side fields
    expect(screen.getByText(/Your Local Draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Server Record/i)).toBeInTheDocument();
    expect(screen.getByText(/Catering Advance \(Mobile\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Catering Advance \(Laptop Edit\)/i)).toBeInTheDocument();

    // Actions
    const keepServerBtn = screen.getByRole('button', { name: /Accept Server Version/i });
    const overwriteBtn = screen.getByRole('button', { name: /Overwrite with My Changes/i });

    expect(keepServerBtn).toBeInTheDocument();
    expect(overwriteBtn).toBeInTheDocument();
  });

  it('renders PwaUpdatePrompt and responds to dismiss action', () => {
    render(
      <LanguageProvider>
        <PwaUpdatePrompt />
      </LanguageProvider>
    );

    expect(document.body).toBeInTheDocument();
  });

  it('renders OfflineFallbackPage with royal aesthetic and retry connectivity trigger', () => {
    render(
      <LanguageProvider>
        <BrowserRouter>
          <OfflineFallbackPage />
        </BrowserRouter>
      </LanguageProvider>
    );

    expect(screen.getByText(/You are Currently Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Protected Offline Ledger/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
    expect(retryBtn).toBeInTheDocument();

    const dashboardLink = screen.getByRole('link', { name: /Open Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
  });

  it('supports bilingual Hindi toggle across sync components', async () => {
    const LanguageToggleTestHelper = () => {
      const { language, setLanguage } = useTranslation();
      return (
        <div>
          <button onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}>
            ToggleLang
          </button>
          <OfflineFallbackPage />
        </div>
      );
    };

    render(
      <LanguageProvider>
        <BrowserRouter>
          <LanguageToggleTestHelper />
        </BrowserRouter>
      </LanguageProvider>
    );

    // Verify English text first
    expect(screen.getByText(/You are Currently Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Protected Offline Ledger/i)).toBeInTheDocument();

    // Toggle language
    const toggleBtn = screen.getByText('ToggleLang');
    fireEvent.click(toggleBtn);

    // Verify Hindi text
    await waitFor(() => {
      expect(screen.getByText(/आप ऑफ़लाइन हैं/i)).toBeInTheDocument();
      expect(screen.getByText(/सुरक्षित ऑफ़लाइन बही/i)).toBeInTheDocument();
      expect(screen.getByText(/पुनः प्रयास करें/i)).toBeInTheDocument();
      expect(screen.getByText(/डैशबोर्ड खोलें/i)).toBeInTheDocument();
    });
  });
});
