// ==============================================================================
// src/components/common/SupabaseConnectModal.tsx
// Supabase Live Cloud Database Connection & SQL Migration Assistant (Option 4)
// ==============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Zap, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw,
  Server,
  Layers
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { testSupabaseConnectionAction, saveSupabaseCredentialsAction } from '@/server/actions/supabase.actions';
import { useToast } from '@/components/ui/Toast';

export function SupabaseConnectModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; schemaReady?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConfigured(isSupabaseConfigured());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnectionAction(supabaseUrl, anonKey);
      setTestResult(res);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message || 'Connection test failed', 'error');
      }
    } catch {
      setTestResult({ success: false, message: 'Could not connect to Supabase.' });
      showToast('Connection failed', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!supabaseUrl || !anonKey) {
      showToast('Please enter both Supabase URL and Anon Key', 'warning');
      return;
    }

    try {
      const res = await saveSupabaseCredentialsAction(supabaseUrl, anonKey);
      if (res.success) {
        showToast('✅ Saved to .env.local! Supabase Cloud connected.', 'success');
        setIsConfigured(true);
        setTimeout(() => onClose(), 1500);
      } else {
        showToast(res.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Error saving credentials', 'error');
    }
  };

  const handleCopySqlGuide = () => {
    const guideText = `-- ShopMitra Production Schema Migrations\n-- Run this in your Supabase Project SQL Editor:\n-- 1. Enable PostGIS Extension:\nCREATE EXTENSION IF NOT EXISTS postgis;\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n-- Migrations are located in:\n-- d:/ShopMitra/supabase/migrations/001_initial_schema.sql\n-- d:/ShopMitra/supabase/migrations/002_postgis_and_indexes.sql\n-- d:/ShopMitra/supabase/migrations/003_rls_policies.sql`;
    navigator.clipboard.writeText(guideText);
    setCopiedSql(true);
    showToast('📋 SQL migration guide copied to clipboard!', 'info');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Supabase Cloud Sync</span>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isConfigured
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                  }`}
                >
                  {isConfigured ? '🟢 Live Connected' : '🟡 Local Mode'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                PostgreSQL • PostGIS Spatial • Real-Time WebSockets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Status Alert Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
              isConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <span className="font-extrabold block">
                {isConfigured ? 'Supabase Cloud Database is Active' : 'Running in Offline-First Local Mode'}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                {isConfigured
                  ? 'All counter rates, shops, and reservations are syncing directly with your Supabase PostgreSQL cluster with real-time websocket broadcasting.'
                  : 'ShopMitra is currently running with high-speed local seed data and in-memory cache. You can connect your free Supabase cloud database below anytime.'}
              </p>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              Connect Live Project (3 Steps)
            </span>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <span>1. Free Cloud Project:</span>
                </span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 font-extrabold flex items-center gap-1 text-[11px]"
                >
                  <span>Open Supabase Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-500">Create a new free project and get your Project URL & anon API key.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-bold">2. Run SQL Migrations:</span>
                <button
                  onClick={handleCopySqlGuide}
                  className="text-emerald-600 hover:text-emerald-700 font-extrabold flex items-center gap-1 text-[11px]"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'Copied Guide!' : 'Copy SQL Instructions'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Execute the 3 SQL files in your Supabase SQL Editor:
                <code className="block mt-1 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  supabase/migrations/001_initial_schema.sql
                </code>
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzprojectid.supabase.co"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Supabase Anon Key (Public API Key)
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Connection Test Status Output */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-bold">{testResult.message}</span>
              </div>
            )}

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !supabaseUrl || !anonKey}
            className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Test Connection</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!supabaseUrl || !anonKey}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>Save & Connect Cloud</span>
          </button>
        </div>

      </div>
    </div>
  );
}
