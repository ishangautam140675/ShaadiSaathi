import crypto from 'node:crypto';
import type { AppDatabase } from '../db/database.ts';

export interface ChecklistTaskRow {
  id: string;
  family_id: string;
  title: string;
  category: string;
  phase: '6_months' | '3_months' | '1_month' | 'wedding_week' | 'day_of' | 'post_wedding';
  status: 'pending' | 'completed';
  assigned_to: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  notes: string | null;
  completed_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTaskOutput {
  id: string;
  familyId: string;
  title: string;
  category: string;
  phase: '6_months' | '3_months' | '1_month' | 'wedding_week' | 'day_of' | 'post_wedding';
  status: 'pending' | 'completed';
  isCompleted: boolean; // legacy alias
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  notes?: string;
  completedAt?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistSummaryOutput {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
}

export class ChecklistService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  private mapRowToOutput(row: ChecklistTaskRow): ChecklistTaskOutput {
    return {
      id: row.id,
      familyId: row.family_id,
      title: row.title,
      category: row.category,
      phase: row.phase,
      status: row.status,
      isCompleted: row.status === 'completed',
      assignedTo: row.assigned_to,
      priority: row.priority,
      dueDate: row.due_date || undefined,
      notes: row.notes || undefined,
      completedAt: row.completed_at || undefined,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  createTask(
    familyId: string,
    userId: string,
    data: {
      title: string;
      category?: string;
      phase?: '6_months' | '3_months' | '1_month' | 'wedding_week' | 'day_of' | 'post_wedding';
      assignedTo?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
      notes?: string;
    }
  ): ChecklistTaskOutput {
    if (!data.title || !data.title.trim()) {
      throw new Error('TASK_TITLE_REQUIRED');
    }

    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();
    const phase = data.phase || '1_month';
    const priority = data.priority || 'medium';

    const stmt = this.appDb.db.prepare(`
      INSERT INTO checklist_tasks (
        id, family_id, title, category, phase, status,
        assigned_to, priority, due_date, notes, completed_at,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, 'pending',
        ?, ?, ?, ?, null,
        ?, ?, ?
      )
    `);

    stmt.run(
      taskId,
      familyId,
      data.title.trim(),
      data.category?.trim() || 'Preparations',
      phase,
      data.assignedTo?.trim() || 'Family Member',
      priority,
      data.dueDate || null,
      data.notes?.trim() || null,
      userId,
      now,
      now
    );

    return this.getTaskById(taskId, familyId)!;
  }

  getTaskById(taskId: string, familyId: string): ChecklistTaskOutput | null {
    const stmt = this.appDb.db.prepare('SELECT * FROM checklist_tasks WHERE id = ? AND family_id = ?');
    const row = stmt.get(taskId, familyId) as unknown as ChecklistTaskRow | undefined;
    return row ? this.mapRowToOutput(row) : null;
  }

  updateTask(
    taskId: string,
    familyId: string,
    _userId: string,
    data: {
      title?: string;
      category?: string;
      phase?: '6_months' | '3_months' | '1_month' | 'wedding_week' | 'day_of' | 'post_wedding';
      status?: 'pending' | 'completed';
      assignedTo?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
      notes?: string;
    }
  ): ChecklistTaskOutput {
    const existing = this.getTaskById(taskId, familyId);
    if (!existing) {
      throw new Error('TASK_NOT_FOUND');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      if (!data.title.trim()) throw new Error('TASK_TITLE_REQUIRED');
      updates.push('title = ?');
      params.push(data.title.trim());
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category.trim());
    }
    if (data.phase !== undefined) {
      updates.push('phase = ?');
      params.push(data.phase);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
      if (data.status === 'completed') {
        updates.push('completed_at = ?');
        params.push(new Date().toISOString());
      } else {
        updates.push('completed_at = null');
      }
    }
    if (data.assignedTo !== undefined) {
      updates.push('assigned_to = ?');
      params.push(data.assignedTo.trim());
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      params.push(data.priority);
    }
    if (data.dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(data.dueDate || null);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes.trim() || null);
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    params.push(now);

    params.push(taskId, familyId);

    const stmt = this.appDb.db.prepare(`
      UPDATE checklist_tasks
      SET ${updates.join(', ')}
      WHERE id = ? AND family_id = ?
    `);
    stmt.run(...params);

    return this.getTaskById(taskId, familyId)!;
  }

  toggleTaskCompletion(taskId: string, familyId: string): ChecklistTaskOutput {
    const task = this.getTaskById(taskId, familyId);
    if (!task) {
      throw new Error('TASK_NOT_FOUND');
    }

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const now = new Date().toISOString();
    const completedAt = newStatus === 'completed' ? now : null;

    const stmt = this.appDb.db.prepare(`
      UPDATE checklist_tasks
      SET status = ?, completed_at = ?, updated_at = ?
      WHERE id = ? AND family_id = ?
    `);
    stmt.run(newStatus, completedAt, now, taskId, familyId);

    return this.getTaskById(taskId, familyId)!;
  }

  deleteTask(taskId: string, familyId: string): void {
    const existing = this.getTaskById(taskId, familyId);
    if (!existing) {
      throw new Error('TASK_NOT_FOUND');
    }
    this.appDb.db.prepare('DELETE FROM checklist_tasks WHERE id = ? AND family_id = ?').run(taskId, familyId);
  }

  listTasks(
    familyId: string,
    filters?: {
      phase?: string;
      status?: string;
      priority?: string;
    }
  ): ChecklistTaskOutput[] {
    const whereClauses: string[] = ['family_id = ?'];
    const params: any[] = [familyId];

    if (filters?.phase && filters.phase !== 'all') {
      whereClauses.push('phase = ?');
      params.push(filters.phase);
    }
    if (filters?.status && filters.status !== 'all') {
      whereClauses.push('status = ?');
      params.push(filters.status);
    }
    if (filters?.priority && filters.priority !== 'all') {
      whereClauses.push('priority = ?');
      params.push(filters.priority);
    }

    const stmt = this.appDb.db.prepare(`
      SELECT * FROM checklist_tasks
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY
        CASE phase
          WHEN '6_months' THEN 1
          WHEN '3_months' THEN 2
          WHEN '1_month' THEN 3
          WHEN 'wedding_week' THEN 4
          WHEN 'day_of' THEN 5
          WHEN 'post_wedding' THEN 6
          ELSE 7
        END,
        status ASC,
        due_date ASC,
        created_at ASC
    `);

    const rows = (stmt.all(...params) as unknown) as ChecklistTaskRow[];
    return rows.map((r) => this.mapRowToOutput(r));
  }

  getChecklistSummary(familyId: string): ChecklistSummaryOutput {
    const stmt = this.appDb.db.prepare(`
      SELECT
        COUNT(*) as total_tasks,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_tasks,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_tasks
      FROM checklist_tasks
      WHERE family_id = ?
    `);

    const result = stmt.get(familyId) as any;
    const total = Number(result?.total_tasks || 0);
    const completed = Number(result?.completed_tasks || 0);
    const pending = Number(result?.pending_tasks || 0);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: pending,
      completionPercentage: pct,
    };
  }
}
