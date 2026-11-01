import crypto from 'node:crypto';
import type { AppDatabase } from '../db/database.ts';

export interface GiftRow {
  id: string;
  family_id: string;
  giver_name: string;
  relation: string;
  gift_type: 'cash' | 'shagun' | 'physical_gift' | 'jewellery' | 'other';
  amount_paise: number;
  description: string | null;
  date_received: string;
  recipient: string;
  side: 'bride' | 'groom' | 'mutual';
  notes: string | null;
  recorded_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface GiftOutput {
  id: string;
  familyId: string;
  giverName: string;
  donorName: string; // legacy alias for compatibility
  relation: string;
  giftType: 'cash' | 'shagun' | 'physical_gift' | 'jewellery' | 'other';
  amount?: number;
  amountPaise: number;
  cashAmount?: number; // legacy alias for compatibility
  description?: string;
  itemDescription?: string; // legacy alias
  dateReceived: string;
  recipient: string;
  side: 'bride' | 'groom' | 'mutual';
  notes?: string;
  recordedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GiftsSummaryOutput {
  totalCashShagun: number;
  totalCashShagunPaise: number;
  cashEnvelopesCount: number;
  physicalGiftsCount: number;
  jewelleryGiftsCount: number;
  totalGiftsCount: number;
}

export class GiftService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  private mapRowToOutput(row: GiftRow): GiftOutput {
    const amt = row.amount_paise > 0 ? row.amount_paise / 100 : undefined;
    return {
      id: row.id,
      familyId: row.family_id,
      giverName: row.giver_name,
      donorName: row.giver_name,
      relation: row.relation || '',
      giftType: row.gift_type,
      amount: amt,
      amountPaise: row.amount_paise,
      cashAmount: amt,
      description: row.description || undefined,
      itemDescription: row.description || undefined,
      dateReceived: row.date_received,
      recipient: row.recipient,
      side: row.side,
      notes: row.notes || undefined,
      recordedByUserId: row.recorded_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  createGift(
    familyId: string,
    userId: string,
    data: {
      giverName?: string;
      donorName?: string;
      relation?: string;
      giftType: 'cash' | 'shagun' | 'physical_gift' | 'jewellery' | 'other';
      amount?: number;
      cashAmount?: number;
      description?: string;
      itemDescription?: string;
      dateReceived?: string;
      recipient?: string;
      side?: 'bride' | 'groom' | 'mutual';
      notes?: string;
    }
  ): GiftOutput {
    const giver = (data.giverName || data.donorName || '').trim();
    if (!giver) {
      throw new Error('GIVER_NAME_REQUIRED');
    }

    const rawAmount = data.amount ?? data.cashAmount ?? 0;
    if (typeof rawAmount !== 'number' || isNaN(rawAmount) || rawAmount < 0) {
      throw new Error('INVALID_GIFT_AMOUNT');
    }

    const amountPaise = Math.round(rawAmount * 100);
    const dateReceived = data.dateReceived || new Date().toISOString().split('T')[0];
    const desc = (data.description || data.itemDescription || '').trim();
    const side = data.side || 'mutual';
    const recipient = data.recipient || 'couple';

    const giftId = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.appDb.db.prepare(`
      INSERT INTO gifts_shagun (
        id, family_id, giver_name, relation, gift_type,
        amount_paise, description, date_received, recipient,
        side, notes, recorded_by_user_id, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      giftId,
      familyId,
      giver,
      data.relation?.trim() || '',
      data.giftType,
      amountPaise,
      desc || null,
      dateReceived,
      recipient,
      side,
      data.notes?.trim() || null,
      userId,
      now,
      now
    );

    return this.getGiftById(giftId, familyId)!;
  }

  getGiftById(giftId: string, familyId: string): GiftOutput | null {
    const stmt = this.appDb.db.prepare('SELECT * FROM gifts_shagun WHERE id = ? AND family_id = ?');
    const row = stmt.get(giftId, familyId) as unknown as GiftRow | undefined;
    return row ? this.mapRowToOutput(row) : null;
  }

  updateGift(
    giftId: string,
    familyId: string,
    _userId: string,
    data: {
      giverName?: string;
      donorName?: string;
      relation?: string;
      giftType?: 'cash' | 'shagun' | 'physical_gift' | 'jewellery' | 'other';
      amount?: number;
      cashAmount?: number;
      description?: string;
      itemDescription?: string;
      dateReceived?: string;
      recipient?: string;
      side?: 'bride' | 'groom' | 'mutual';
      notes?: string;
    }
  ): GiftOutput {
    const existing = this.getGiftById(giftId, familyId);
    if (!existing) {
      throw new Error('GIFT_NOT_FOUND');
    }

    const updates: string[] = [];
    const params: any[] = [];

    const giver = data.giverName ?? data.donorName;
    if (giver !== undefined) {
      if (!giver.trim()) throw new Error('GIVER_NAME_REQUIRED');
      updates.push('giver_name = ?');
      params.push(giver.trim());
    }
    if (data.relation !== undefined) {
      updates.push('relation = ?');
      params.push(data.relation.trim());
    }
    if (data.giftType !== undefined) {
      updates.push('gift_type = ?');
      params.push(data.giftType);
    }

    const rawAmount = data.amount ?? data.cashAmount;
    if (rawAmount !== undefined) {
      if (typeof rawAmount !== 'number' || isNaN(rawAmount) || rawAmount < 0) {
        throw new Error('INVALID_GIFT_AMOUNT');
      }
      updates.push('amount_paise = ?');
      params.push(Math.round(rawAmount * 100));
    }

    const desc = data.description ?? data.itemDescription;
    if (desc !== undefined) {
      updates.push('description = ?');
      params.push(desc.trim() || null);
    }
    if (data.dateReceived !== undefined) {
      updates.push('date_received = ?');
      params.push(data.dateReceived);
    }
    if (data.recipient !== undefined) {
      updates.push('recipient = ?');
      params.push(data.recipient);
    }
    if (data.side !== undefined) {
      updates.push('side = ?');
      params.push(data.side);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes.trim() || null);
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    params.push(now);

    params.push(giftId, familyId);

    const stmt = this.appDb.db.prepare(`
      UPDATE gifts_shagun
      SET ${updates.join(', ')}
      WHERE id = ? AND family_id = ?
    `);
    stmt.run(...params);

    return this.getGiftById(giftId, familyId)!;
  }

  deleteGift(giftId: string, familyId: string): void {
    const existing = this.getGiftById(giftId, familyId);
    if (!existing) {
      throw new Error('GIFT_NOT_FOUND');
    }
    this.appDb.db.prepare('DELETE FROM gifts_shagun WHERE id = ? AND family_id = ?').run(giftId, familyId);
  }

  listGifts(
    familyId: string,
    filters?: {
      search?: string;
      side?: string;
      giftType?: string;
    }
  ): GiftOutput[] {
    const whereClauses: string[] = ['family_id = ?'];
    const params: any[] = [familyId];

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      whereClauses.push('(giver_name LIKE ? OR relation LIKE ? OR description LIKE ?)');
      params.push(q, q, q);
    }
    if (filters?.side && filters.side !== 'all') {
      whereClauses.push('side = ?');
      params.push(filters.side);
    }
    if (filters?.giftType && filters.giftType !== 'all') {
      whereClauses.push('gift_type = ?');
      params.push(filters.giftType);
    }

    const stmt = this.appDb.db.prepare(`
      SELECT * FROM gifts_shagun
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY date_received DESC, created_at DESC
    `);

    const rows = (stmt.all(...params) as unknown) as GiftRow[];
    return rows.map((r) => this.mapRowToOutput(r));
  }

  getGiftsSummary(familyId: string): GiftsSummaryOutput {
    const stmt = this.appDb.db.prepare(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(amount_paise), 0) as total_cash_paise,
        COALESCE(SUM(CASE WHEN gift_type IN ('cash', 'shagun') THEN 1 ELSE 0 END), 0) as cash_envelopes_count,
        COALESCE(SUM(CASE WHEN gift_type = 'physical_gift' THEN 1 ELSE 0 END), 0) as physical_gifts_count,
        COALESCE(SUM(CASE WHEN gift_type = 'jewellery' THEN 1 ELSE 0 END), 0) as jewellery_count
      FROM gifts_shagun
      WHERE family_id = ?
    `);

    const result = stmt.get(familyId) as any;
    const totalCashPaise = Number(result?.total_cash_paise || 0);

    return {
      totalCashShagun: totalCashPaise / 100,
      totalCashShagunPaise: totalCashPaise,
      cashEnvelopesCount: Number(result?.cash_envelopes_count || 0),
      physicalGiftsCount: Number(result?.physical_gifts_count || 0),
      jewelleryGiftsCount: Number(result?.jewellery_count || 0),
      totalGiftsCount: Number(result?.total_count || 0),
    };
  }
}
