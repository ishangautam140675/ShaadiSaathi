import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { WeddingProvider } from './context/WeddingContext';
import { AppLayout } from './components/layout/AppLayout';

import { WelcomePage } from './pages/WelcomePage';
import { SignInPage } from './pages/SignInPage';
import { SetupPage } from './pages/SetupPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { FamilyPage } from './pages/FamilyPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ShoppingPage } from './pages/ShoppingPage';
import { VendorsPage } from './pages/VendorsPage';
import { GiftsPage } from './pages/GiftsPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { ReportsPage } from './pages/ReportsPage';
import { SmartScanPage } from './pages/SmartScanPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <WeddingProvider>
          <BrowserRouter>
            <Routes>
              {/* Public & Entry Routes */}
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/invite/:token" element={<AcceptInvitePage />} />

              {/* Core Application Shell with Persistent Layout */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="shopping" element={<ShoppingPage />} />
                <Route path="vendors" element={<VendorsPage />} />
                <Route path="gifts" element={<GiftsPage />} />
                <Route path="checklist" element={<ChecklistPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="smartscan" element={<SmartScanPage />} />
                <Route path="family" element={<FamilyPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </WeddingProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
