// ==============================================================================
// src/server/actions/audit.actions.ts
// Administrative Audit Trail Logging System — Database + Resilient Fallback
// ==============================================================================

'use server';

import fs from 'fs';
import path from 'path';
import { createAdminSupabase, getAuthenticatedUser } from '@/lib/supabase/server';

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

const LOCAL_AUDIT_LOG_FILE = path.resolve(process.cwd(), 'audit_logs.jsonl');

/**
 * Records an immutable administrative audit log entry
 */
export async function logAdminAction(entry: {
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  const timestamp = new Date().toISOString();
  let adminId = 'system';
  let adminEmail = 'platform-admin';

  try {
    const user = await getAuthenticatedUser();
    if (user) {
      adminId = user.id;
      adminEmail = user.email || user.id;
    }
  } catch {}

  const logPayload = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    admin_id: adminId !== 'system' ? adminId : null,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
    metadata: {
      ...entry.metadata,
      admin_email: adminEmail,
    },
    ip_address: entry.ipAddress || 'internal',
    created_at: timestamp,
  };

  // 1. Try inserting directly into Supabase audit_logs table
  try {
    const adminDb = createAdminSupabase();
    const { error } = await adminDb.from('audit_logs').insert([logPayload]);
    if (!error) return;
  } catch {}

  // 2. Resilient Fallback: Append-only persistent local JSONL ledger
  try {
    const line = JSON.stringify({
      id: logPayload.id,
      adminId,
      adminEmail,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      metadata: entry.metadata,
      ipAddress: entry.ipAddress || 'internal',
      createdAt: timestamp,
    }) + '\n';
    fs.appendFileSync(LOCAL_AUDIT_LOG_FILE, line, 'utf-8');
  } catch (err) {
    console.error('Failed to append to local audit log:', err);
  }
}

/**
 * Retrieves audit logs with pagination and search
 */
export async function getAuditLogsAction(options: {
  limit?: number;
  offset?: number;
  search?: string;
  targetType?: string;
} = {}): Promise<{ success: boolean; logs: AuditLogEntry[]; total: number; error?: string }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  try {
    const { verifyAdminCaller } = await import('./admin.actions');
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return {
        success: false,
        logs: [],
        total: 0,
        error: auth.error || 'Unauthorized: admin privilege required',
      };
    }

    // 1. Try fetching from Supabase table
    const adminDb = createAdminSupabase();
    let query = adminDb
      .from('audit_logs')
      .select('id, admin_id, action, target_type, target_id, old_value, new_value, metadata, ip_address, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options.targetType && options.targetType !== 'all') {
      query = query.eq('target_type', options.targetType);
    }
    if (options.search) {
      query = query.or(`action.ilike.%${options.search}%,target_id.ilike.%${options.search}%`);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (!error && data) {
      const logs: AuditLogEntry[] = data.map((r: any) => ({
        id: r.id,
        adminId: r.admin_id || 'system',
        adminEmail: r.metadata?.admin_email,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id,
        oldValue: r.old_value,
        newValue: r.new_value,
        metadata: r.metadata,
        ipAddress: r.ip_address,
        createdAt: r.created_at,
      }));

      return { success: true, logs, total: count || logs.length };
    }
  } catch {}

  // 2. Read from local persistent ledger if DB table pending migration
  try {
    if (fs.existsSync(LOCAL_AUDIT_LOG_FILE)) {
      const raw = fs.readFileSync(LOCAL_AUDIT_LOG_FILE, 'utf-8');
      const lines = raw.trim().split('\n').filter(Boolean);
      let parsed: AuditLogEntry[] = lines.map((l) => JSON.parse(l)).reverse();

      if (options.targetType && options.targetType !== 'all') {
        parsed = parsed.filter((p) => p.targetType === options.targetType);
      }
      if (options.search) {
        const q = options.search.toLowerCase();
        parsed = parsed.filter(
          (p) =>
            p.action.toLowerCase().includes(q) ||
            p.targetId.toLowerCase().includes(q) ||
            (p.adminEmail && p.adminEmail.toLowerCase().includes(q))
        );
      }

      const total = parsed.length;
      const paginated = parsed.slice(offset, offset + limit);
      return { success: true, logs: paginated, total };
    }
  } catch (err: any) {
    return { success: false, logs: [], total: 0, error: err.message };
  }

  return { success: true, logs: [], total: 0 };
}
