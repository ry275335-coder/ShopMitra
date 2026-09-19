'use client';

import React from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  ShieldCheck,
  Lock,
  Key,
  Database,
  CheckCircle2,
  AlertTriangle,
  Server,
  FileText,
  Crown
} from 'lucide-react';

export default function AdminSecurityPage() {
  const { adminUser } = useAdminData();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800/80">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider mb-2">
          <Crown className="w-3 h-3" />
          <span>Super Admin Security Center</span>
        </div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Platform Security & RBAC Defense Matrix
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographic session verification, database RLS posture, and architectural defense-in-depth summary.
        </p>
      </div>

      {/* Security Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Session & Auth Isolation */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Session & Credential Isolation</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Passwordless OTP Only</div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  No password hashes exist in the database. All customer, merchant, and admin authentication is routed through Supabase Phone and Email OTP tokens.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Isolated admin_users Authorization</div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Admin authorization is stored in an independent database table. Customer and merchant profiles cannot alter administrative status, and one account can hold all three roles cleanly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Edge Middleware Interceptor</div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Next.js Edge Middleware validates JWTs and denies unauthenticated or non-admin requests before server components or data layers are touched.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 2: Database Protection & RLS */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Database Integrity & RLS</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Zero Service Key in Client Bundles</div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  <code className="text-rose-400 font-mono">SUPABASE_SERVICE_ROLE_KEY</code> is strictly quarantined to server actions, server components, and CLI scripts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Immutable Administrative Audit Trail</div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  PostgreSQL RLS denies <code className="text-slate-300">UPDATE</code> and <code className="text-slate-300">DELETE</code> operations on <code className="text-slate-300">audit_logs</code>. Prior and new states are captured on every mutation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Anti-Privilege Escalation Triggers</div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Database trigger <code className="text-slate-300">trg_prevent_profile_role_tampering</code> rejects any unauthorized direct modification of roles or account statuses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
