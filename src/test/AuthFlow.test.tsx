import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';

describe('ShaadiSaathi Phase 2 Auth & Family Routing', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, 'Test', '/');
  });

  it('renders Sign-In screen with session isolation notice and credentials form', async () => {
    window.history.pushState({}, 'Sign In', '/sign-in');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome to ShaadiSaathi/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Multi-Device Isolation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Wedding/i })).toBeInTheDocument();
  });

  it('renders First-Time Family Setup Wizard on /setup', async () => {
    window.history.pushState({}, 'Setup', '/setup');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Initialize Wedding Workspace/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Family Wedding Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bride's Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Groom's Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Auspicious Wedding Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Full Name \(Owner \/ Admin\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Initialize Wedding & Create Owner Account/i })).toBeInTheDocument();
  });

  it('renders Invite Acceptance page on /invite/:token', async () => {
    window.history.pushState({}, 'Invite', '/invite/test-token-123');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Accept Family Wedding Invitation/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Kavya & Rohan/i)).toBeInTheDocument();
    });
  });

  it('renders Family screen and displays role-based access information', async () => {
    window.history.pushState({}, 'Family', '/family');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Family Members & Roles/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Active Family Members/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Owner \/ Admin/i).length).toBeGreaterThan(0);
    });
  });

  it('allows language switching on Sign In page to Hindi and back', async () => {
    window.history.pushState({}, 'Sign In', '/sign-in');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome to ShaadiSaathi/i)).toBeInTheDocument();
    });

    // Toggle language button in header
    const hindiBtn = screen.getByRole('button', { name: 'हिन्दी' });
    fireEvent.click(hindiBtn);

    await waitFor(() => {
      expect(screen.getByText(/शादीसाथी में आपका स्वागत है/i)).toBeInTheDocument();
    });
  });
});
