import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { TopHeader } from './TopHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileDrawer } from './MobileDrawer';
import { DevPreviewBanner } from '../common/DevPreviewBanner';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col antialiased">
      <div className="flex flex-1">
        {/* Desktop Left Sidebar */}
        <DesktopSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <TopHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

          {/* Development / Architecture Banner */}
          <DevPreviewBanner />

          {/* Page Routing Outlet */}
          <main className="flex-1 pb-20 lg:pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto py-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Navigation Controls */}
      <MobileBottomNav onOpenMore={() => setIsMobileMenuOpen(true)} />
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
};
