import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Expenses Modal & Validation Behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, 'Expenses', '/expenses');
  });

  it('opens Add Expense modal and validates required fields', async () => {
    render(<App />);

    // Click on '+ Log New Expense'
    const addBtns = screen.getAllByRole('button', { name: /\+ Log New Expense/i });
    fireEvent.click(addBtns[0]);

    // Modal should be open
    expect(screen.getByRole('heading', { name: 'Log Wedding Expense' })).toBeInTheDocument();

    // Clear inputs and submit to trigger validation
    const submitBtn = screen.getByRole('button', { name: /Log Expense \(Phase 1 Preview\)/i });
    fireEvent.click(submitBtn);

    // HTML5 validation or form error
    const titleInput = screen.getByLabelText(/Expense Title \/ Description/i);
    expect(titleInput).toBeRequired();
  });

  it('adds an expense to the local session preview with honest persistence notice', async () => {
    render(<App />);

    const addBtns = screen.getAllByRole('button', { name: /\+ Log New Expense/i });
    fireEvent.click(addBtns[0]);

    const titleInput = screen.getByLabelText(/Expense Title \/ Description/i);
    const amountInput = screen.getByLabelText(/Amount \(₹\)/i);

    fireEvent.change(titleInput, { target: { value: 'Band Baaja Brass Ensemble' } });
    fireEvent.change(amountInput, { target: { value: '45000' } });

    const submitBtn = screen.getByRole('button', { name: /Log Expense \(Phase 1 Preview\)/i });
    fireEvent.click(submitBtn);

    // Expect success message
    await waitFor(() => {
      expect(
        screen.getAllByText(/Form validated! Staged in local preview\. Database persistence comes in Phase 2\./i).length
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
