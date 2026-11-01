import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/useAuth';
import { Badge } from '../components/common/Badge';
import {
  Upload,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Trash2,
  Eye,
  Plus,
  AlertCircle,
  Camera,
} from 'lucide-react';

interface ExtractedRow {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  paidByName?: string;
  vendorName?: string;
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'pending';
  notes?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

interface ScanDocumentItem {
  id: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ocrEngine: 'local_tesseract' | 'gemini_flash' | 'manual';
  confidenceScore: number;
  importStatus: 'unreviewed' | 'partially_imported' | 'imported' | 'discarded';
  proposedCount: number;
  acceptedCount: number;
  extractedData?: any;
  createdAt: string;
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const SmartScanPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<ScanDocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ScanDocumentItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Engine selection & Gemini consent
  const [selectedEngine, setSelectedEngine] = useState<'local' | 'gemini'>('local');
  const [geminiConsent, setGeminiConsent] = useState(false);

  // Active extracted reviewable rows
  const [extractedRows, setExtractedRows] = useState<ExtractedRow[]>([]);
  const [detectedTotal, setDetectedTotal] = useState<number | null>(null);
  const [detectedVendor, setDetectedVendor] = useState<string>('');
  const [detectedDate, setDetectedDate] = useState<string>('');
  const [hasDiscrepancy, setHasDiscrepancy] = useState(false);
  const [discrepancyAmt, setDiscrepancyAmt] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err: any) {
      console.warn('Failed to load past scans:', err);
    }
  }, []);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      await fetchDocuments();
      setSelectedDoc(data.document);
      // Automatically trigger initial OCR extraction
      await runOcr(data.document.id, 'local');
    } catch (err: any) {
      setErrorMsg(err.message || 'Document upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const runOcr = async (docId: string, engine: 'local' | 'gemini') => {
    setIsProcessingOcr(true);
    setErrorMsg(null);

    try {
      let endpoint = `/api/documents/${docId}/ocr`;
      let body: any = { language: language === 'hi' ? 'hin+eng' : 'eng' };

      if (engine === 'gemini') {
        if (!geminiConsent) {
          throw new Error(t.smartscan.geminiConsentRequired);
        }
        endpoint = `/api/documents/${docId}/enhance`;
        body = { userConsent: true };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Extraction failed');
      }

      setSelectedDoc(data.document);
      await fetchDocuments();

      const result = data.result;
      setDetectedTotal(result.detectedGrandTotal);
      setDetectedVendor(result.detectedVendor || '');
      setDetectedDate(result.detectedDate || getTodayDateString());

      // Map line items to editable rows
      const rows: ExtractedRow[] = (result.lineItems || []).map((item: any, idx: number) => ({
        id: `row-${idx}-${Date.now()}`,
        title: item.description || `Item #${idx + 1}`,
        amount: item.amount || 0,
        category: item.category || 'other',
        date: item.date || result.detectedDate || getTodayDateString(),
        vendorName: result.detectedVendor || '',
        paidByName: user?.name || 'Family Member',
        paymentMethod: item.paymentMethod || 'upi',
        paymentStatus: 'paid',
        notes: `SmartScan from ${data.document.originalFilename}`,
      }));

      // Check duplicates against database expenses
      await checkDuplicates(docId, rows);

      // Evaluate discrepancy
      const sum = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      if (result.detectedGrandTotal && Math.abs(result.detectedGrandTotal - sum) > 0.5) {
        setHasDiscrepancy(true);
        setDiscrepancyAmt(Math.abs(result.detectedGrandTotal - sum));
      } else {
        setHasDiscrepancy(false);
        setDiscrepancyAmt(0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'OCR processing failed.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const checkDuplicates = async (docId: string, rows: ExtractedRow[]) => {
    try {
      const res = await fetch(`/api/documents/${docId}/check-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rows: rows.map((r) => ({ title: r.title, amount: r.amount, date: r.date })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        const updated = rows.map((r, i) => ({
          ...r,
          isDuplicate: Boolean(results[i]?.isDuplicate),
          duplicateReason: results[i]?.reason,
        }));
        setExtractedRows(updated);
      } else {
        setExtractedRows(rows);
      }
    } catch {
      setExtractedRows(rows);
    }
  };

  const handleRowChange = (id: string, field: keyof ExtractedRow, value: any) => {
    const updated = extractedRows.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    setExtractedRows(updated);

    // Recheck discrepancy
    const sum = updated.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    if (detectedTotal && Math.abs(detectedTotal - sum) > 0.5) {
      setHasDiscrepancy(true);
      setDiscrepancyAmt(Math.abs(detectedTotal - sum));
    } else {
      setHasDiscrepancy(false);
      setDiscrepancyAmt(0);
    }
  };

  const handleAddRow = () => {
    const newRow: ExtractedRow = {
      id: `row-custom-${Date.now()}`,
      title: 'Additional Item',
      amount: 0,
      category: 'other',
      date: detectedDate || new Date().toISOString().split('T')[0],
      paidByName: user?.name || 'Family Member',
      vendorName: detectedVendor || '',
      paymentMethod: 'upi',
      paymentStatus: 'paid',
      notes: selectedDoc ? `SmartScan from ${selectedDoc.originalFilename}` : '',
    };
    setExtractedRows([...extractedRows, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    const updated = extractedRows.filter((r) => r.id !== id);
    setExtractedRows(updated);
  };

  const handleConfirmImport = async () => {
    if (!selectedDoc) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const validRows = extractedRows.filter((r) => r.title.trim().length > 0 && Number(r.amount) > 0);
    if (validRows.length === 0) {
      setErrorMsg('Please specify at least one valid line item with title and amount greater than 0.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `import-${selectedDoc.id}-${Date.now()}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            title: r.title,
            amount: Number(r.amount),
            category: r.category,
            date: r.date,
            paidByName: r.paidByName,
            vendorName: r.vendorName,
            paymentMethod: r.paymentMethod,
            paymentStatus: r.paymentStatus,
            notes: r.notes,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Import failed');
      }

      setSuccessMsg(t.smartscan.importSuccessMsg);
      setSelectedDoc(data.document);
      await fetchDocuments();
      setExtractedRows([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import expenses.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this scanned document?')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
          setExtractedRows([]);
        }
        await fetchDocuments();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete document.');
    }
  };

  const categories = [
    { value: 'venue', label: t.categories.venue },
    { value: 'catering', label: t.categories.catering },
    { value: 'decoration', label: t.categories.decoration },
    { value: 'clothing', label: t.categories.clothing },
    { value: 'jewellery', label: t.categories.jewellery },
    { value: 'photography', label: t.categories.photography },
    { value: 'invitations', label: t.categories.invitations },
    { value: 'makeup', label: t.categories.makeup },
    { value: 'transport', label: t.categories.transport },
    { value: 'gifts', label: t.categories.gifts },
    { value: 'other', label: t.categories.other },
  ];

  const canEdit = !user || user.role === 'OWNER' || user.role === 'FAMILY_MEMBER';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
              {t.smartscan.title}
            </h1>
            <Badge variant="burgundy" size="sm">
              Phase 6 Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.smartscan.subtitle}
          </p>
        </div>
      </div>

      {/* Honest Privacy & Zero Phantom Entries Banner */}
      <div className="p-4 rounded-2xl bg-ivory-light border border-gold/40 text-xs text-charcoal flex items-start gap-3 card-shadow">
        <ShieldCheck className="w-5 h-5 text-burgundy flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold text-burgundy block mb-0.5">
            {language === 'hi' ? 'ईमानदार वास्तुकला नियम: कोई फर्जी AI दावा नहीं' : 'Engineering Principle: Zero Fake AI Claims'}
          </strong>
          <span>{t.smartscan.honestNotice}</span>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-sage/20 border border-sage/40 text-sage-dark text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-sage" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Upload Zone & Capture Section */}
      {canEdit && (
        <div className="bg-ivory-light rounded-2xl border-2 border-dashed border-gold/50 p-6 sm:p-8 text-center flex flex-col items-center justify-center card-shadow hover:border-gold transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-rose/60 border border-gold/30 flex items-center justify-center text-burgundy mb-3 shadow-xs">
            <Upload className="w-7 h-7 text-burgundy" />
          </div>

          <h3 className="text-base font-bold text-burgundy mb-1">
            {t.smartscan.uploadZoneTitle}
          </h3>

          <p className="text-xs text-charcoal-muted max-w-md mb-4 leading-relaxed">
            {t.smartscan.uploadZoneDesc}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* File Browse Button */}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold transition-all shadow-xs">
              <FileText className="w-4 h-4 text-gold-light" />
              <span>{isUploading ? 'Uploading...' : t.smartscan.browseFiles}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
            </label>

            {/* Camera Capture Button */}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gold/50 bg-ivory hover:bg-rose/40 text-burgundy text-xs font-semibold transition-all shadow-2xs">
              <Camera className="w-4 h-4 text-gold-dark" />
              <span>{language === 'hi' ? 'कैमरा से फोटो लें' : 'Take Photo'}</span>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
            </label>
          </div>

          <span className="text-[11px] text-charcoal-muted mt-3">
            {t.smartscan.supportedFormats}
          </span>
        </div>
      )}

      {/* Active Document Verification Interface */}
      {selectedDoc && (
        <div className="bg-ivory-light rounded-2xl p-5 sm:p-6 border border-gold/40 card-shadow space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gold/25">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-royal text-burgundy">
                  {t.smartscan.samplePreviewTitle}
                </h2>
                <Badge variant={selectedDoc.ocrStatus === 'completed' ? 'gold' : 'rose'} size="sm">
                  {selectedDoc.ocrStatus}
                </Badge>
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                {selectedDoc.originalFilename} ({(selectedDoc.fileSize / 1024).toFixed(1)} KB)
              </p>
            </div>

            {/* Engine Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-gold/40 bg-ivory text-xs font-medium text-charcoal"
              >
                <option value="local">Local OCR (Tesseract / 100% Free)</option>
                <option value="gemini">Google Gemini 2.5 Flash</option>
              </select>

              <button
                type="button"
                onClick={() => runOcr(selectedDoc.id, selectedEngine)}
                disabled={isProcessingOcr}
                className="px-3.5 py-1.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gold-light ${isProcessingOcr ? 'animate-spin' : ''}`} />
                <span>{isProcessingOcr ? 'Extracting...' : 'Re-Extract'}</span>
              </button>
            </div>
          </div>

          {/* Gemini Cloud AI Consent Checkbox (if Gemini selected) */}
          {selectedEngine === 'gemini' && (
            <div className="p-3.5 rounded-xl bg-gold/15 border border-gold/30 text-xs text-charcoal space-y-2">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-gold-dark flex-shrink-0 mt-0.5" />
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={geminiConsent}
                    onChange={(e) => setGeminiConsent(e.target.checked)}
                    className="rounded border-gold/50 text-burgundy focus:ring-burgundy"
                  />
                  <span>{t.smartscan.geminiConsent}</span>
                </label>
              </div>
            </div>
          )}

          {/* Discrepancy Alert */}
          {hasDiscrepancy && (
            <div className="p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">{t.smartscan.discrepancyAlert}</strong>
                <span>
                  Bill Total is ₹{detectedTotal?.toLocaleString('en-IN')}, but sum of itemized rows is ₹
                  {extractedRows.reduce((a, b) => a + Number(b.amount || 0), 0).toLocaleString('en-IN')}.
                  Discrepancy: ₹{discrepancyAmt.toLocaleString('en-IN')} (possible tax, tip, or subtotal mismatch).
                </span>
              </div>
            </div>
          )}

          {/* Side-by-Side Review Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Document File Stream / Preview (5 cols) */}
            <div className="lg:col-span-5 bg-ivory p-4 rounded-xl border border-gold/30 space-y-3">
              <div className="flex items-center justify-between border-b border-gold/20 pb-2">
                <span className="font-bold text-xs text-charcoal uppercase">[Original Document Stream]</span>
                <a
                  href={`/api/documents/${selectedDoc.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-burgundy hover:underline flex items-center gap-1 font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Full File</span>
                </a>
              </div>

              {selectedDoc.mimeType.startsWith('image/') ? (
                <div className="rounded-lg overflow-hidden border border-gold/20 max-h-[350px] flex items-center justify-center bg-ivory-light">
                  <img
                    src={`/api/documents/${selectedDoc.id}/file`}
                    alt={selectedDoc.originalFilename}
                    className="max-h-[350px] w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-charcoal-muted bg-ivory-light rounded-lg border border-gold/20">
                  <FileText className="w-8 h-8 text-burgundy mx-auto mb-2 opacity-60" />
                  <span>PDF Document Preview available via "Open Full File" link.</span>
                </div>
              )}

              {detectedVendor && (
                <div className="text-xs text-charcoal-muted pt-1">
                  <strong>Detected Vendor:</strong> {detectedVendor}
                </div>
              )}
            </div>

            {/* Right Column: Editable Human Audit Table (7 cols) */}
            <div className="lg:col-span-7 bg-ivory p-4 rounded-xl border border-gold/30 space-y-4">
              <div className="flex items-center justify-between border-b border-gold/20 pb-2">
                <span className="font-bold text-xs text-burgundy uppercase">
                  Review & Confirm Extracted Items
                </span>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1 text-xs text-burgundy font-semibold hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.smartscan.addRow}</span>
                </button>
              </div>

              {extractedRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-charcoal-muted">
                  No line items extracted. Click "Re-Extract" or "+ Add Item Row".
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {extractedRows.map((row) => (
                    <div
                      key={row.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        row.isDuplicate
                          ? 'bg-rose-light/40 border-burgundy/30'
                          : 'bg-ivory-light border-gold/25'
                      } space-y-2 text-xs`}
                    >
                      {row.isDuplicate && (
                        <div className="flex items-center gap-1.5 text-burgundy font-semibold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{t.smartscan.duplicateAlert}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Title */}
                        <div className="sm:col-span-6">
                          <label className="text-[10px] text-charcoal-muted block font-medium">
                            {t.smartscan.lineItemTitle}
                          </label>
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => handleRowChange(row.id, 'title', e.target.value)}
                            className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-gold/30 bg-ivory text-charcoal text-xs"
                          />
                        </div>

                        {/* Amount */}
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-charcoal-muted block font-medium">
                            {t.smartscan.lineItemAmount}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={row.amount}
                            onChange={(e) => handleRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-gold/30 bg-ivory text-burgundy font-bold text-xs"
                          />
                        </div>

                        {/* Category */}
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-charcoal-muted block font-medium">
                            {t.smartscan.lineItemCategory}
                          </label>
                          <select
                            value={row.category}
                            onChange={(e) => handleRowChange(row.id, 'category', e.target.value)}
                            className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-gold/30 bg-ivory text-charcoal text-xs"
                          >
                            {categories.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                            className="px-2 py-1 rounded border border-gold/25 bg-ivory text-[11px] text-charcoal"
                          />
                          <input
                            type="text"
                            placeholder="Vendor Name"
                            value={row.vendorName || ''}
                            onChange={(e) => handleRowChange(row.id, 'vendorName', e.target.value)}
                            className="px-2 py-1 rounded border border-gold/25 bg-ivory text-[11px] text-charcoal w-28 sm:w-36"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-burgundy hover:text-burgundy-dark p-1 rounded hover:bg-rose/40 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirm Import Action Button */}
              {canEdit && extractedRows.length > 0 && (
                <div className="pt-3 border-t border-gold/20 flex justify-end">
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-gold-light" />
                    <span>
                      {isImporting
                        ? t.smartscan.importingBtn
                        : `${t.smartscan.confirmImportBtn} (${extractedRows.length})`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Past Scanned Documents History Table */}
      <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
        <h2 className="text-sm font-bold font-royal text-burgundy">
          {t.smartscan.pastScansTitle}
        </h2>

        {documents.length === 0 ? (
          <p className="text-xs text-charcoal-muted py-4 text-center">
            {t.smartscan.noPastScans}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gold/20 text-[11px] text-charcoal-muted font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3">Engine</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-ivory/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-charcoal">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(doc);
                          runOcr(doc.id, 'local');
                        }}
                        className="text-burgundy font-semibold hover:underline text-left cursor-pointer"
                      >
                        {doc.originalFilename}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-charcoal-muted">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-charcoal-muted capitalize">
                      {doc.ocrEngine.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          doc.importStatus === 'imported'
                            ? 'sage'
                            : doc.ocrStatus === 'completed'
                            ? 'gold'
                            : 'outline'
                        }
                        size="sm"
                      >
                        {doc.importStatus === 'imported' ? 'Imported' : doc.ocrStatus}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(doc);
                          runOcr(doc.id, 'local');
                        }}
                        className="text-xs text-burgundy font-medium hover:underline cursor-pointer"
                      >
                        Inspect
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-xs text-charcoal-muted hover:text-burgundy cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
