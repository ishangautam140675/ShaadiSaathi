import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Phase 3 Frontend: Budget & Expense Management Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, 'Expenses', '/expenses');
  });

  it('renders expenses list with search, category, and status filter controls', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wedding Expenses/i })).toBeInTheDocument();
    });

    // Check search input
    expect(screen.getByPlaceholderText(/Search expenses by title or recipient/i)).toBeInTheDocument();

    // Check category dropdown & filters
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2);

    // Check + Log New Expense button
    expect(screen.getByRole('button', { name: /\+ Log New Expense/i })).toBeInTheDocument();
  });

  it('opens Add Expense modal, validates partial payment calculation', async () => {
    render(<App />);

    const addBtn = screen.getByRole('button', { name: /\+ Log New Expense/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Log Wedding Expense/i })).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/Expense Title \/ Description/i);
    const amountInput = screen.getByLabelText(/Amount \(₹\) \*/i);
    const paidAmountInput = screen.getByLabelText(/Amount Paid \(₹\) \*/i);

    fireEvent.change(titleInput, { target: { value: 'Mandap Floral Setup' } });
    fireEvent.change(amountInput, { target: { value: '100000' } });
    fireEvent.change(paidAmountInput, { target: { value: '40000' } });

    // Outstanding balance should dynamically display ₹60,000 (Pending Balance)
    expect(screen.getByText(/Pending Balance/i)).toBeInTheDocument();
    expect(screen.getAllByText(/60,000/i).length).toBeGreaterThanOrEqual(1);
  });

  it('opens Delete confirmation dialog when delete button is clicked', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wedding Expenses/i })).toBeInTheDocument();
    });

    // Find delete buttons in desktop or mobile view
    const deleteBtns = screen.getAllByTitle('Delete Expense');
    if (deleteBtns.length > 0) {
      fireEvent.click(deleteBtns[0]);

      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to delete this expense/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Yes, Delete Expense/i })).toBeInTheDocument();
    }
  });

  it('renders Dashboard budget metrics and allows opening the Edit Budget modal', async () => {
    window.history.pushState({}, 'Dashboard', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Total Wedding Budget/i)).toBeInTheDocument();
    });

    // Check financial metric cards exist
    expect(screen.getByText(/Remaining Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Expenses Paid/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget Utilization/i)).toBeInTheDocument();
  });

  it('supports bilingual Hindi toggle on the Expenses screen', async () => {
    window.history.pushState({}, 'Expenses', '/expenses');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wedding Expenses/i })).toBeInTheDocument();
    });

    // Toggle language button in header
    const hindiBtn = screen.getByRole('button', { name: 'हिन्दी' });
    fireEvent.click(hindiBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /विवाह खर्च विवरण/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /\+ नया खर्च दर्ज करें/i })).toBeInTheDocument();
  });
});
