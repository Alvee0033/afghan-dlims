'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, Globe, RefreshCw, Eye } from 'lucide-react';

interface StatsData {
  total: number;
  valid: number;
  expired: number;
  suspended: number;
  recent: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData>({ total: 0, valid: 0, expired: 0, suspended: 0, recent: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [allRes, validRes, expRes, susRes] = await Promise.all([
        fetch('/api/admin').then(r => r.json()),
        fetch('/api/admin?status=VALID').then(r => r.json()),
        fetch('/api/admin?status=EXPIRED').then(r => r.json()),
        fetch('/api/admin?status=SUSPENDED').then(r => r.json()),
      ]);

      setStats({
        total: allRes.total || 0,
        valid: validRes.total || 0,
        expired: expRes.total || 0,
        suspended: susRes.total || 0,
        recent: (allRes.licenses || []).slice(0, 6),
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {}
    if (isInitial) setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Auto-refresh interval (every 4 seconds for live data sync)
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [loadData]);

  return (
    <div>
      {/* Live sync status banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--admin-text-main)' }}>
          Overview
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          <span>Synced: <strong>{lastUpdated || 'just now'}</strong></span>
          <button
            onClick={() => loadData(false)}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.2rem 0.5rem',
              cursor: 'pointer',
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards (2-col mobile, 4-col desktop) */}
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-card-label">Total Licenses</div>
          <div className="stat-card-value">{loading ? '—' : stats.total}</div>
          <div className="stat-card-sub">All database records</div>
        </div>

        <div className="stat-card green">
          <div className="stat-card-label">Active / Valid</div>
          <div className="stat-card-value">{loading ? '—' : stats.valid}</div>
          <div className="stat-card-sub">Verified active</div>
        </div>

        <div className="stat-card red">
          <div className="stat-card-label">Expired</div>
          <div className="stat-card-value">{loading ? '—' : stats.expired}</div>
          <div className="stat-card-sub">Needs renewal</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-label">Suspended</div>
          <div className="stat-card-value">{loading ? '—' : stats.suspended}</div>
          <div className="stat-card-sub">Under review</div>
        </div>
      </div>

      {/* Quick Action Buttons (Touch Friendly) */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Link href="/admin/licenses/new" className="btn btn-primary-admin" style={{ flex: '1 1 auto', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <PlusCircle size={16} /> New License
        </Link>
        <Link href="/admin/licenses" className="btn btn-outline-admin" style={{ flex: '1 1 auto', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={16} /> All Licenses ({stats.total})
        </Link>
        <Link href="/" target="_blank" className="btn btn-outline-admin" style={{ flex: '1 1 auto', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Globe size={16} /> Portal
        </Link>
      </div>

      {/* Recent Licenses Table / Cards */}
      <div className="table-card">
        <div className="table-toolbar">
          <span className="table-toolbar-title">Recent Activity</span>
          <Link
            href="/admin/licenses"
            className="btn btn-outline-admin"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
          >
            View All
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License No.</th>
                <th>District</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    Loading data...
                  </td>
                </tr>
              ) : stats.recent.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    No licenses yet.{' '}
                    <Link href="/admin/licenses/new" style={{ color: 'var(--admin-primary)', fontWeight: 600 }}>
                      Create first license
                    </Link>
                  </td>
                </tr>
              ) : (
                stats.recent.map((lic: any) => (
                  <tr key={lic.id}>
                    <td className="td-name" data-label="Driver">{lic.name}</td>
                    <td className="td-mono" data-label="License No.">{lic.license_number}</td>
                    <td data-label="District">{lic.district || '—'}</td>
                    <td data-label="Status">
                      <span className={`status-badge ${lic.status?.toLowerCase()}`}>
                        {lic.status}
                      </span>
                    </td>
                    <td data-label="Valid Until">{lic.validity || '—'}</td>
                    <td data-label="Action">
                      <Link
                        href={`/admin/licenses?id=${lic.id}`}
                        className="btn btn-outline-admin"
                        style={{ fontSize: '0.75rem', padding: '0.28rem 0.65rem' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
