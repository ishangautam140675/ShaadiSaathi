import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('ShaadiSaathi Application Shell & Navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, 'Test', '/');
  });

  it('renders the Dashboard by default with wedding overview metrics', () => {
    render(<App />);

    // Brand and headline
    expect(screen.getAllByText('ShaadiSaathi').length).toBeGreaterThan(0);
    expect(screen.getByText('Wedding Overview')).toBeInTheDocument();
    expect(screen.getByText('Total Wedding Budget')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses Paid')).toBeInTheDocument();
    expect(screen.getByText('Remaining Balance')).toBeInTheDocument();
    expect(screen.getByText('Pending Payments')).toBeInTheDocument();
  });

  it('renders the Development Preview Banner honestly declaring mock data', () => {
    render(<App />);

    expect(screen.getAllByText(/Development Preview/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/No actual financial records are persisted until Phase 2/i)
    ).toBeInTheDocument();
  });

  it('allows toggling between Preview Demo Data and Clean Empty State', () => {
    render(<App />);

    // Initially preview data is on, showing recent transactions
    expect(screen.getByText(/The Grand Heritage Palace - 50% Booking Advance/i)).toBeInTheDocument();

    // Find the toggle button in the preview banner
    const toggleButtons = screen.getAllByRole('button', { name: /Switch to Empty State|Demo Preview ON/i });
    fireEvent.click(toggleButtons[0]);

    // Now empty state should be active
    expect(screen.getByText(/No Expenses Recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Clean first-time empty state active/i)).toBeInTheDocument();
  });

  it('navigates to Welcome screen with invite-only family notice', () => {
    window.history.pushState({}, 'Welcome', '/welcome');
    render(<App />);

    expect(
      screen.getByText('Plan Your Dream Wedding with Absolute Peace of Mind')
    ).toBeInTheDocument();
    expect(screen.getByText('Private Family Access Only')).toBeInTheDocument();
    expect(
      screen.getByText(/No public registration is permitted to guarantee complete family privacy/i)
    ).toBeInTheDocument();
  });

  it('navigates to Expenses screen and displays expense register', () => {
    window.history.pushState({}, 'Expenses', '/expenses');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Wedding Expenses' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search expenses by title or recipient/i)).toBeInTheDocument();
  });

  it('navigates to Gifts & Shagun screen and enforces cultural separation notice', () => {
    window.history.pushState({}, 'Gifts', '/gifts');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Shagun & Gift Register' })).toBeInTheDocument();
    expect(
      screen.getByText(/In Indian weddings, Shagun envelopes \(लिफ़ाफ़ा\) and gift offerings are sacred blessings/i)
    ).toBeInTheDocument();
  });

  it('navigates to SmartScan screen and presents honest 4-step workflow without claiming fake OCR works', () => {
    window.history.pushState({}, 'SmartScan', '/smartscan');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'SmartScan Receipt Staging' })).toBeInTheDocument();
    expect(screen.getByText(/Engineering Principle: Zero Fake AI Claims/i)).toBeInTheDocument();
    expect(screen.getByText(/Document OCR and AI extraction are scheduled for Phase 5/i)).toBeInTheDocument();
  });

  it('navigates to Settings screen and shows architecture & language preferences', () => {
    window.history.pushState({}, 'Settings', '/settings');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Application Settings' })).toBeInTheDocument();
    expect(screen.getByText('Language & Localization')).toBeInTheDocument();
    expect(screen.getByText('Cloudflare Pages & Workers (100% Free Tier)')).toBeInTheDocument();
  });
});
