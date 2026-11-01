import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Phase 4 Frontend: Vendors, Payments, Shopping, Gifts & Checklist Flows', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Vendors screen with contract totals, search, and opens Add Vendor modal', async () => {
    window.history.pushState({}, 'Vendors', '/vendors');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Vendors & Contracts/i })).toBeInTheDocument();
    });

    // Check financial aggregate metrics
    expect(screen.getByText(/Total Contracted/i)).toBeInTheDocument();
    expect(screen.getByText(/Advances Paid/i)).toBeInTheDocument();
    expect(screen.getByText(/Outstanding Balances/i)).toBeInTheDocument();

    // Check zero-fake payment guarantee alert
    expect(screen.getByText(/Zero Fake Payment Processing Guarantee/i)).toBeInTheDocument();

    // Check + Add New Vendor CTA
    const addBtns = screen.getAllByRole('button', { name: /\+ Add New Vendor/i });
    expect(addBtns.length).toBeGreaterThan(0);
    fireEvent.click(addBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add Vendor & Payment Terms/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Vendor \/ Business Name \*/i)).toBeInTheDocument();
  });

  it('renders Shopping Register with variance analysis and opens Add Shopping Item modal', async () => {
    window.history.pushState({}, 'Shopping', '/shopping');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wedding Shopping Register/i })).toBeInTheDocument();
    });

    // Check metrics
    expect(screen.getByText(/Estimated Total/i)).toBeInTheDocument();
    expect(screen.getByText(/Actual Spent/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget Variance/i)).toBeInTheDocument();

    // Check + Add Shopping Item CTA
    const addBtns = screen.getAllByRole('button', { name: /\+ Add Shopping Item/i });
    expect(addBtns.length).toBeGreaterThan(0);
    fireEvent.click(addBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add Shopping Item/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Item Description \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Cost \(₹\) \*/i)).toBeInTheDocument();
  });

  it('renders Sacred Gifts & Shagun register with cultural separation and opens Record modal', async () => {
    window.history.pushState({}, 'Gifts', '/gifts');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Shagun & Gift Register/i })).toBeInTheDocument();
    });

    // Sacred cultural separation
    expect(screen.getByText(/Sacred Indian Wedding Shagun Separation/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Shagun \(Cash\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Envelopes Recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Physical Gifts Received/i)).toBeInTheDocument();

    // Open Record Shagun modal
    const recordBtns = screen.getAllByRole('button', { name: /Record Shagun/i });
    expect(recordBtns.length).toBeGreaterThan(0);
    fireEvent.click(recordBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Record Shagun/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Blessing Giver \/ Family Name \*/i)).toBeInTheDocument();
  });

  it('renders Wedding Checklist with progress metrics, phase tabs, and opens Add Task modal', async () => {
    window.history.pushState({}, 'Checklist', '/checklist');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wedding Checklist/i })).toBeInTheDocument();
    });

    // Phase tabs
    expect(screen.getByRole('button', { name: /All Timeline Stages/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /6-12 Months Before/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wedding Week/i })).toBeInTheDocument();

    // Open Add Task modal
    const addBtns = screen.getAllByRole('button', { name: /\+ Add Custom Task/i });
    expect(addBtns.length).toBeGreaterThan(0);
    fireEvent.click(addBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add Checklist Item/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Task Title \*/i)).toBeInTheDocument();
  });

  it('supports seamless bilingual Hindi translation on Phase 4 screens', async () => {
    window.history.pushState({}, 'Vendors', '/vendors');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Vendors & Contracts/i })).toBeInTheDocument();
    });

    // Switch to Hindi
    const hindiBtn = screen.getByRole('button', { name: 'हिन्दी' });
    fireEvent.click(hindiBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /विक्रेता एवं अनुबंध/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/ईमानदार वित्तीय नीति/i)).toBeInTheDocument();
    expect(screen.getByText(/कुल तय राशि/i)).toBeInTheDocument();
  });
});
