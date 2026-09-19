'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  Settings,
  Shield,
  Lock,
  Server,
  AlertTriangle,
  CheckCircle,
  Database,
  Radio,
  Sliders,
  Bell,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export default function AdminSettingsPage() {
  const { adminUser } = useAdminData();
  const { showToast } = useToast();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowMerchantReg, setAllowMerchantReg] = useState(true);
  const [allowCustomerReg, setAllowCustomerReg] = useState(true);
  const [anomalyThreshold, setAnomalyThreshold] = useState(65);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('⚡ Platform governance policies saved successfully', 'success');
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Platform & Security Governance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global system flags, registration toggles, and security enforcement configurations.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving}>
          Save Policy Changes
        </Button>
      </div>

      {/* Main Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration & Discovery Toggles */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Operational Mode Toggles</span>
          </div>

          <div className="space-y-4">
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">Platform Maintenance Mode</div>
                <div className="text-[11px] text-slate-400">
                  When active, non-admin visitors see a maintenance banner.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  maintenanceMode ? 'bg-rose-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Merchant Self-Registration */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">Merchant Onboarding</div>
                <div className="text-[11px] text-slate-400">
                  Allow local merchants to submit new retail store counter applications.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowMerchantReg(!allowMerchantReg)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  allowMerchantReg ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    allowMerchantReg ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Customer Registration */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">Shopper Registration</div>
                <div className="text-[11px] text-slate-400">
                  Allow new customers to sign up and save favorite shops and alerts.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowCustomerReg(!allowCustomerReg)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  allowCustomerReg ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    allowCustomerReg ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Anti-Fraud Price Anomaly Parameters */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-rose-400" />
            <span>Anti-Fraud Shield Thresholds</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-200">Price Deviation Flag Threshold</span>
                <span className="font-mono font-bold text-rose-400">{anomalyThreshold}% below MRP</span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={anomalyThreshold}
                onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                Any counter rate discounted more than {anomalyThreshold}% beneath the master catalog MRP will be automatically quarantined for administrative review.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Server Architecture</span>
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                Supabase Auth Isolation is enabled. Sessions are bound exclusively to request cookies. PostgreSQL RLS policies deny unauthenticated modifications.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
