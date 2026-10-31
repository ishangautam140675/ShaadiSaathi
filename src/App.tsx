import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { WeddingProvider } from './context/WeddingContext';
import { AppLayout } from './components/layout/AppLayout';

import { WelcomePage } from './pages/WelcomePage';
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
      <WeddingProvider>
        <BrowserRouter>
          <Routes>
            {/* Entry / Welcome Screen */}
            <Route path="/welcome" element={<WelcomePage />} />

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
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WeddingProvider>
    </LanguageProvider>
  );
}

export default App;
