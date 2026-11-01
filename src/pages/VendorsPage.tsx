import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../context/useAuth';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { AddVendorModal } from '../components/modals/AddVendorModal';
import { RecordVendorPaymentModal } from '../components/modals/RecordVendorPaymentModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import type { ExpenseCategory, Vendor, VendorEntity } from '../types';
import {
  Users,
  Plus,
  Phone,
  Calendar,
  MapPin,
  ShieldAlert,
  Search,
  Filter,
  CreditCard,
  Edit2,
  Trash2,
  Lock,
} from 'lucide-react';

export const VendorsPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { vendors, deleteVendor, vendorSummary, isPreviewMode, togglePreviewMode } = useWedding();
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | VendorEntity | null>(null);
  const [vendorForPayment, setVendorForPayment] = useState<Vendor | VendorEntity | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | VendorEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        v.name.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'all' || v.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' || v.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [vendors, searchQuery, selectedCategory, selectedStatus]);

  const totalContracted = vendorSummary?.totalContracted ?? filteredVendors.reduce((sum, v) => sum + v.agreedAmount, 0);
  const totalAdvances = vendorSummary?.totalPaid ?? filteredVendors.reduce((sum, v) => sum + (v.advancePaid || v.paidAmount || 0), 0);
  const totalBalanceDue = vendorSummary?.totalBalanceDue ?? filteredVendors.reduce((sum, v) => sum + v.balanceDue, 0);

  const handleDeleteConfirm = async () => {
    if (!vendorToDelete) return;
    try {
      setIsDeleting(true);
      await deleteVendor(vendorToDelete.id);
      setVendorToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

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

        <div className="flex items-center gap-2">
          {isViewer ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/15 text-gold-dark text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'केवल पठन अनुमति' : 'Read-Only (Viewer)'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setVendorToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-gold-light" />
              <span>{t.vendors.addVendorBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Honest Architecture Alert: Zero Fake Payment Processing */}
      <div className="p-3.5 rounded-2xl bg-gold/15 border border-gold/40 text-xs text-charcoal flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-burgundy flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-burgundy block mb-0.5">
            {language === 'hi' ? 'ईमानदार वित्तीय नीति' : 'Zero Fake Payment Processing Guarantee'}
          </strong>
          <span>{t.vendors.noFakePaymentsNotice}</span>
        </div>
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

      {/* Search & Filter Bar */}
      <div className="bg-ivory-light rounded-2xl p-4 border border-gold/30 card-shadow flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gold-dark absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'hi' ? 'विक्रेता या शहर खोजें...' : 'Search vendor name, contact person, or city...'}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Filter className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none capitalize"
            >
              <option value="all">{t.expenses.allCategories}</option>
              <option value="venue">{t.categories.venue}</option>
              <option value="catering">{t.categories.catering}</option>
              <option value="decoration">{t.categories.decoration || t.categories.decor}</option>
              <option value="photography">{t.categories.photography}</option>
              <option value="makeup">{t.categories.makeup}</option>
              <option value="clothing">{t.categories.clothing || t.categories.attire}</option>
              <option value="jewellery">{t.categories.jewellery || t.categories.jewelry}</option>
              <option value="transport">{t.categories.transport || t.categories.logistics_travel}</option>
              <option value="invitations">{t.categories.invitations || t.categories.invitations_gifts}</option>
              <option value="gifts">{t.categories.gifts}</option>
              <option value="other">{t.categories.other || t.categories.miscellaneous}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.expenses.allStatuses}</option>
              <option value="booked">{t.vendors.booked}</option>
              <option value="advance_paid">{t.vendors.advanceStatus}</option>
              <option value="fully_paid">{t.vendors.fullyPaid}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {filteredVendors.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-burgundy" />}
          title={t.vendors.emptyTitle}
          description={t.vendors.emptySubtitle}
          actionLabel={!isViewer ? t.vendors.addVendorBtn : undefined}
          onAction={() => {
            setVendorToEdit(null);
            setIsAddModalOpen(true);
          }}
          secondaryActionLabel={
            isPreviewMode ? undefined : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={togglePreviewMode}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => {
            const paid = vendor.paidAmount ?? vendor.advancePaid ?? 0;
            return (
              <div
                key={vendor.id}
                className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow flex flex-col justify-between space-y-4 hover:border-gold/60 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" size="sm">
                      {t.categories[vendor.category as ExpenseCategory] || vendor.category}
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
                    <div className="flex items-center gap-1.5 text-xs text-charcoal font-medium mt-1">
                      <Phone className="w-3.5 h-3.5 text-sage-dark" />
                      <a href={`tel:${vendor.phone}`} className="hover:underline">
                        {vendor.phone}
                      </a>
                    </div>
                  )}

                  {vendor.dueDate && (
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-muted mt-2">
                      <Calendar className="w-3.5 h-3.5 text-gold-dark" />
                      <span>{t.vendors.dueDate}: <strong>{vendor.dueDate}</strong></span>
                    </div>
                  )}

                  {vendor.notes && (
                    <p className="text-xs text-charcoal-muted italic mt-2.5 p-2 rounded-lg bg-ivory border border-gold/20 line-clamp-2">
                      "{vendor.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gold/25 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-charcoal-muted block text-[11px]">
                        {t.vendors.agreedAmount}
                      </span>
                      <strong className="text-charcoal font-bold">
                        ₹{vendor.agreedAmount.toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div>
                      <span className="text-charcoal-muted block text-[11px]">
                        {t.vendors.advancePaid}
                      </span>
                      <strong className="text-sage-dark font-bold">
                        ₹{paid.toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-gold/15 flex items-center justify-between">
                      <span className="text-charcoal-muted text-[11px]">
                        {t.vendors.balanceDue}:
                      </span>
                      <strong className="text-burgundy font-bold text-sm">
                        ₹{vendor.balanceDue.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {!isViewer && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setVendorForPayment(vendor)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold transition-all cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-gold-light" />
                        <span>{language === 'hi' ? 'भुगतान दर्ज करें' : 'Log Payment'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVendorToEdit(vendor);
                          setIsAddModalOpen(true);
                        }}
                        title="Edit Vendor"
                        className="p-1.5 rounded-xl border border-gold/40 hover:bg-rose/30 text-charcoal text-xs cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setVendorToDelete(vendor)}
                        title="Delete Vendor"
                        className="p-1.5 rounded-xl border border-burgundy/30 text-burgundy hover:bg-burgundy/10 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setVendorToEdit(null);
        }}
        vendorToEdit={vendorToEdit}
      />

      {/* Record Vendor Payment Modal */}
      <RecordVendorPaymentModal
        isOpen={Boolean(vendorForPayment)}
        onClose={() => setVendorForPayment(null)}
        vendor={vendorForPayment}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(vendorToDelete)}
        onClose={() => setVendorToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title={language === 'hi' ? 'विक्रेता रिकॉर्ड हटाएं' : 'Delete Vendor Record'}
        description={language === 'hi' ? 'क्या आप निश्चित रूप से इस विक्रेता को हटाना चाहते हैं?' : 'Are you sure you want to delete this vendor record? This will also remove associated payment records.'}
        itemName={vendorToDelete?.name}
      />
    </div>
  );
};
