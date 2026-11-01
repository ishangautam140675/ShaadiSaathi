import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { type AppDatabase, getDatabase } from '../db/database.ts';

export interface ScanDocumentRecord {
  id: string;
  familyId: string;
  uploadedByUserId: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ocrEngine: 'local_tesseract' | 'gemini_flash' | 'manual';
  extractedText: string | null;
  confidenceScore: number;
  extractedData: any | null;
  importStatus: 'unreviewed' | 'partially_imported' | 'imported' | 'discarded';
  proposedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  errorSummary: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export class DocumentService {
  private uploadsDir: string;
  private appDb: AppDatabase;

  constructor(appDb?: AppDatabase) {
    this.appDb = appDb || getDatabase();
    this.uploadsDir = path.resolve(process.cwd(), 'data', 'uploads', 'documents');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private getDb() {
    return this.appDb.getDb();
  }

  public getUploadsDir(): string {
    return this.uploadsDir;
  }

  /**
   * Save uploaded document metadata and persist to private storage
   */
  public createDocument(params: {
    familyId: string;
    userId: string;
    originalFilename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  }): ScanDocumentRecord {
    const db = this.getDb();
    const docId = `doc-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO scan_documents (
        id, family_id, uploaded_by_user_id, original_filename,
        file_path, file_size, mime_type, ocr_status, ocr_engine,
        import_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'local_tesseract', 'unreviewed', ?, ?)
    `);

    stmt.run(
      docId,
      params.familyId,
      params.userId,
      params.originalFilename,
      params.filePath,
      params.fileSize,
      params.mimeType,
      now,
      now
    );

    return this.getDocumentById(params.familyId, docId)!;
  }

  /**
   * Fetch all documents for a family
   */
  public getDocumentsByFamily(familyId: string): ScanDocumentRecord[] {
    const db = this.getDb();
    const rows = db.prepare(`
      SELECT * FROM scan_documents
      WHERE family_id = ?
      ORDER BY created_at DESC
    `).all(familyId) as any[];

    return rows.map(this.mapRowToRecord);
  }

  /**
   * Fetch a single document by ID with family tenant isolation
   */
  public getDocumentById(familyId: string, documentId: string): ScanDocumentRecord | null {
    const db = this.getDb();
    const row = db.prepare(`
      SELECT * FROM scan_documents
      WHERE id = ? AND family_id = ?
    `).get(documentId, familyId) as any;

    if (!row) return null;
    return this.mapRowToRecord(row);
  }

  /**
   * Update OCR result
   */
  public updateDocumentOcr(
    documentId: string,
    params: {
      ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
      ocrEngine?: 'local_tesseract' | 'gemini_flash' | 'manual';
      extractedText?: string;
      confidenceScore?: number;
      extractedData?: any;
      errorSummary?: string;
      proposedCount?: number;
    }
  ): void {
    const db = this.getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE scan_documents
      SET
        ocr_status = ?,
        ocr_engine = COALESCE(?, ocr_engine),
        extracted_text = COALESCE(?, extracted_text),
        confidence_score = COALESCE(?, confidence_score),
        extracted_data = COALESCE(?, extracted_data),
        error_summary = ?,
        proposed_count = COALESCE(?, proposed_count),
        updated_at = ?
      WHERE id = ?
    `).run(
      params.ocrStatus,
      params.ocrEngine || null,
      params.extractedText || null,
      params.confidenceScore !== undefined ? params.confidenceScore : null,
      params.extractedData ? JSON.stringify(params.extractedData) : null,
      params.errorSummary || null,
      params.proposedCount !== undefined ? params.proposedCount : null,
      now,
      documentId
    );
  }

  /**
   * Update import counts and status
   */
  public updateDocumentImportStatus(
    documentId: string,
    params: {
      importStatus: 'unreviewed' | 'partially_imported' | 'imported' | 'discarded';
      acceptedCount: number;
      rejectedCount: number;
    }
  ): void {
    const db = this.getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE scan_documents
      SET
        import_status = ?,
        accepted_count = ?,
        rejected_count = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      params.importStatus,
      params.acceptedCount,
      params.rejectedCount,
      now,
      documentId
    );
  }

  /**
   * Delete document and physical file safely
   */
  public deleteDocument(familyId: string, documentId: string): boolean {
    const doc = this.getDocumentById(familyId, documentId);
    if (!doc) return false;

    // Delete physical file if exists
    try {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (err) {
      console.warn('[DocumentService] Failed to unlink physical file:', err);
    }

    const db = this.getDb();
    const res = db.prepare('DELETE FROM scan_documents WHERE id = ? AND family_id = ?').run(documentId, familyId);
    return res.changes > 0;
  }

  private mapRowToRecord(row: any): ScanDocumentRecord {
    let extractedData = null;
    if (row.extracted_data) {
      try {
        extractedData = JSON.parse(row.extracted_data);
      } catch {
        extractedData = null;
      }
    }

    return {
      id: row.id,
      familyId: row.family_id,
      uploadedByUserId: row.uploaded_by_user_id,
      originalFilename: row.original_filename,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      ocrStatus: row.ocr_status,
      ocrEngine: row.ocr_engine,
      extractedText: row.extracted_text,
      confidenceScore: row.confidence_score,
      extractedData,
      importStatus: row.import_status,
      proposedCount: row.proposed_count,
      acceptedCount: row.accepted_count,
      rejectedCount: row.rejected_count,
      errorSummary: row.error_summary,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const documentService = new DocumentService();
