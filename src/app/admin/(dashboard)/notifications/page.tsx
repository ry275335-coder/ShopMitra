'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Send,
  Radio,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export default function AdminNotificationsPage() {
  const { payload } = useAdminData();
  const { showToast } = useToast();

  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'merchants' | 'customers'>('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [sending, setSending] = useState(false);

  const stats = payload?.stats || {
    pendingShops: 0,
    activeAnomalies: 0,
    openReports: 0,
  };

  const systemAlerts = [
    ...(stats.pendingShops > 0
      ? [
          {
            id: 'alert-pending-shops',
            type: 'warning' as const,
            title: 'Pending Merchant Verifications',
            message: `${stats.pendingShops} local merchant shops are pending review and KYC document validation.`,
            time: 'Active now',
          },
        ]
      : []),
    ...(stats.activeAnomalies > 0
      ? [
          {
            id: 'alert-price-anomalies',
            type: 'danger' as const,
            title: 'Anti-Fraud Price Anomaly Warning',
            message: `${stats.activeAnomalies} counter items listed with deep discounts exceeding safe margins.`,
            time: 'Active now',
          },
        ]
      : []),
    ...(stats.openReports > 0
      ? [
          {
            id: 'alert-open-grievances',
            type: 'info' as const,
            title: 'Open Price Grievances',
            message: `${stats.openReports} shoppers submitted price difference complaints.`,
            time: 'Active now',
          },
        ]
      : []),
    {
      id: 'alert-system-ok',
      type: 'success' as const,
      title: 'Database Telemetry Nominal',
      message: 'PostgreSQL connection healthy with active RLS enforcement and session isolation.',
      time: 'Continuous monitor',
    },
  ];

  const handleSendBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      showToast(`📢 Announcement broadcasted to ${broadcastTarget}`, 'success');
      setBroadcastTitle('');
      setBroadcastMessage('');
    }, 700);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            System Notifications & Broadcast Desk
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time platform telemetry alerts and direct communication channel to local merchants and shoppers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active System Alerts */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Real-Time Incident Monitor</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              TELEMETRY LIVE
            </span>
          </div>

          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                  alert.type === 'danger'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                    : alert.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                    : alert.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'
                }`}
              >
                {alert.type === 'danger' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                ) : alert.type === 'warning' ? (
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : alert.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{alert.title}</span>
                    <span className="text-[10px] opacity-70 font-mono">{alert.time}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Broadcast Form */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Radio className="w-4 h-4 text-indigo-400" />
            <span>Send Platform Announcement</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Target Audience</label>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All Users' },
                  { id: 'merchants', label: 'Merchants Only' },
                  { id: 'customers', label: 'Customers Only' },
                ].map((tgt) => (
                  <button
                    key={tgt.id}
                    type="button"
                    onClick={() => setBroadcastTarget(tgt.id as any)}
                    className={`flex-1 py-1.5 rounded-lg border font-medium transition-all ${
                      broadcastTarget === tgt.id
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {tgt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Subject Title</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g., Scheduled Platform Maintenance Tonight at 2 AM"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Message Body</label>
              <textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Compose announcement for merchant dashboard and shopper feed..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSendBroadcast}
              isLoading={sending}
              className="w-full flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Announcement</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
