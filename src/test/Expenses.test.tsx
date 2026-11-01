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

    // Title input has required attribute
    const titleInput = screen.getByLabelText(/Expense Title \/ Description/i);
    expect(titleInput).toBeRequired();

    // Amount input has required attribute
    const amountInput = screen.getByLabelText(/Amount \(₹\) \*/i);
    expect(amountInput).toBeRequired();
  });

  it('adds an expense with validated amounts and success notification', async () => {
    render(<App />);

    const addBtns = screen.getAllByRole('button', { name: /\+ Log New Expense/i });
    fireEvent.click(addBtns[0]);

    const titleInput = screen.getByLabelText(/Expense Title \/ Description/i);
    const amountInput = screen.getByLabelText(/Amount \(₹\) \*/i);

    fireEvent.change(titleInput, { target: { value: 'Band Baaja Brass Ensemble' } });
    fireEvent.change(amountInput, { target: { value: '45000' } });

    const submitBtns = screen.getAllByRole('button', { name: /Save Expense to Database|Log Wedding Expense/i });
    fireEvent.click(submitBtns[0]);

    // Expect success confirmation status
    await waitFor(() => {
      expect(
        screen.getAllByText(/Expense record successfully saved to database|Form validated/i).length
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
