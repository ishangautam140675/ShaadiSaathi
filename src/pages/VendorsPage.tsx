import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { AddVendorModal } from '../components/modals/AddVendorModal';
import { PhaseNoticeModal } from '../components/common/PhaseNoticeModal';
import type { ExpenseCategory } from '../types';
import {
  Users,
  Plus,
  Phone,
  Calendar,
  MapPin,
  ShieldAlert,
} from 'lucide-react';

export const VendorsPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { vendors, isPreviewMode, togglePreviewMode } = useWedding();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentGatewayNoticeOpen, setIsPaymentGatewayNoticeOpen] = useState(false);

  const totalContracted = vendors.reduce((sum, v) => sum + v.agreedAmount, 0);
  const totalAdvances = vendors.reduce((sum, v) => sum + v.advancePaid, 0);
  const totalBalanceDue = vendors.reduce((sum, v) => sum + v.balanceDue, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
            {t.vendors.title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.vendors.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-light" />
          <span>{t.vendors.addVendorBtn}</span>
        </button>
      </div>

      {/* Honest Architecture Alert: Zero Fake Payment Processing */}
      <div className="p-4 rounded-2xl bg-gold/15 border border-gold/40 text-xs text-charcoal flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-burgundy flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-burgundy block mb-0.5">
              {language === 'hi' ? 'ईमानदार वित्तीय नीति' : 'Zero Fake Payment Processing Guarantee'}
            </strong>
            <span>{t.vendors.noFakePaymentsNotice}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPaymentGatewayNoticeOpen(true)}
          className="px-3 py-1.5 rounded-lg border border-gold/60 bg-ivory text-burgundy text-[11px] font-bold hover:bg-rose/40 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          {language === 'hi' ? 'भुगतान नीति विवरण' : 'Read Payment Policy'}
        </button>
      </div>

      {/* Vendor Contract Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.vendors.totalContracted}
          </span>
          <div className="text-xl font-bold text-burgundy mt-1">
            ₹{totalContracted.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.vendors.totalAdvances}
          </span>
          <div className="text-xl font-bold text-sage-dark mt-1">
            ₹{totalAdvances.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow">
          <span className="text-xs font-semibold text-charcoal-muted">
            {t.vendors.totalBalanceDue}
          </span>
          <div className="text-xl font-bold text-burgundy mt-1">
            ₹{totalBalanceDue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Vendor Cards List */}
      {vendors.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-burgundy" />}
          title={t.vendors.emptyTitle}
          description={t.vendors.emptySubtitle}
          actionLabel={t.vendors.addVendorBtn}
          onAction={() => setIsModalOpen(true)}
          secondaryActionLabel={
            isPreviewMode ? undefined : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={togglePreviewMode}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow flex flex-col justify-between space-y-4 hover:border-gold/60 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" size="sm">
                    {t.categories[vendor.category as ExpenseCategory]}
                  </Badge>

                  <Badge
                    variant={
                      vendor.status === 'fully_paid'
                        ? 'sage'
                        : vendor.status === 'advance_paid'
                        ? 'gold'
                        : 'rose'
                    }
                    size="sm"
                  >
                    {vendor.status === 'fully_paid'
                      ? t.vendors.fullyPaid
                      : vendor.status === 'advance_paid'
                      ? t.vendors.advanceStatus
                      : t.vendors.booked}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-burgundy font-royal">
                  {vendor.name}
                </h3>

                <div className="flex items-center gap-3 text-xs text-charcoal-muted mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-charcoal font-medium">
                    <Users className="w-3.5 h-3.5 text-gold-dark" />
                    {vendor.contactPerson}
                  </span>
                  <span className="flex items-center gap-1 text-charcoal-muted">
                    <MapPin className="w-3.5 h-3.5 text-burgundy" />
                    {vendor.city}
                  </span>
                </div>

                {vendor.phone && (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs text-burgundy font-bold mt-2 hover:underline"
                  >
                    <Phone className="w-3 h-3 text-gold-dark" />
                    <span>{vendor.phone}</span>
                  </a>
                )}

                {vendor.notes && (
                  <p className="text-xs text-charcoal-muted mt-2 italic bg-ivory p-2 rounded-lg border border-gold/20">
                    "{vendor.notes}"
                  </p>
                )}
              </div>

              {/* Financial Terms */}
              <div className="pt-3 border-t border-gold/25 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-charcoal-muted">{t.vendors.agreedAmount}</span>
                  <span className="font-bold text-charcoal">
                    ₹{vendor.agreedAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-charcoal-muted">{t.vendors.advancePaid}</span>
                  <span className="font-bold text-sage-dark">
                    ₹{vendor.advancePaid.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-gold/20">
                  <span className="text-burgundy">{t.vendors.balanceDue}</span>
                  <span className="font-bold text-burgundy text-sm">
                    ₹{vendor.balanceDue.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-charcoal-muted pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gold-dark" />
                    {t.vendors.dueDate}:
                  </span>
                  <span className="font-semibold text-charcoal">{vendor.dueDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AddVendorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Payment Gateway Policy Notice */}
      <PhaseNoticeModal
        isOpen={isPaymentGatewayNoticeOpen}
        onClose={() => setIsPaymentGatewayNoticeOpen(false)}
        featureName="Direct Payment Policy"
        targetPhase="Strict Architectural Principle"
        description={
          language === 'hi'
            ? 'शादीसाथी कभी भी कोई सशुल्क भुगतान गेटवे (जैसे Razorpay / Stripe) अनिवार्य नहीं करेगा, जो कमीशन या सब्सक्रिप्शन मांगते हैं। उपयोगकर्ता अपने सुरक्षित बैंक, चेक या यूपीआई से भुगतान करते हैं और यहां केवल पारदर्शी रिकॉर्ड रखते हैं।'
            : 'ShaadiSaathi will never force a proprietary payment gateway fee or merchant surcharge on Indian families. Wedding payments happen through your existing banking apps (UPI, NEFT, Cheques), and ShaadiSaathi functions as your private family ledger.'
        }
        checklistItems={[
          'No transaction surcharge or percentage cut',
          'Audit trail of cheque numbers and NEFT transaction IDs',
          'Automatic balance calculation upon advance logging',
          'Due date reminders for family admins',
        ]}
      />
    </div>
  );
};
