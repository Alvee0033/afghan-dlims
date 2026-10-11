'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  RefreshCw,
  Download,
  PlusCircle,
  Eye,
  Edit2,
  Trash2,
  QrCode,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { renderLicenseCardClient } from '@/lib/renderCardClient';

interface License {
  id: string;
  license_number: string;
  name: string;
  district?: string;
  father?: string;
  dob?: string;
  blood_group?: string;
  issue_date: string;
  validity: string;
  valid_for?: string;
  allowed_vehicles?: string;
  status: string;
  photo_url?: string;
  fingerprint_url?: string;
  signature_url?: string;
}

function LicensesPageInner() {
  const searchParams = useSearchParams();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState<License | null>(null);
  const [previewImg, setPreviewImg] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [decodeResults, setDecodeResults] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState('');

  const fetchLicenses = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/admin?${params}`, { cache: 'no-store' });
      const data = await res.json();
      const list: License[] = data.licenses || [];

      setLicenses(list);
      setTotal(data.total !== undefined ? data.total : list.length);
      setLastSync(new Date().toLocaleTimeString());
    } catch {}
    if (isInitial) setLoading(false);
  }, [search, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchLicenses(true);
  }, [fetchLicenses]);

  // Live Auto-Refresh every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLicenses(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchLicenses]);

  // Auto-open modal if ?id= in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      fetch(`/api/admin?id=${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.license) openDetails(d.license);
        });
    }
  }, [searchParams]);

  async function openDetails(lic: License) {
    setSelected(lic);
    setPreviewImg('');
    setDecodeResults([]);
    setPreviewLoading(true);

    const cardData = {
      name: lic.name,
      district: lic.district,
      licence_no: lic.license_number,
      dob: lic.dob,
      issue_date: lic.issue_date,
      blood_group: lic.blood_group,
      validity: lic.validity,
      allowed_vehicles: lic.valid_for || lic.allowed_vehicles,
    };

    try {
      const clientImg = await renderLicenseCardClient(
        cardData,
        lic.photo_url,
        lic.fingerprint_url,
        lic.signature_url
      );
      if (clientImg) {
        setPreviewImg(clientImg);
        setPreviewLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Client canvas render fallback to API:', e);
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: cardData,
          photo_url: lic.photo_url,
          fingerprint_url: lic.fingerprint_url,
          signature_url: lic.signature_url,
          format: 'base64',
        }),
      });
      const data = await res.json();
      if (data.image) setPreviewImg(data.image);
    } catch {}
    setPreviewLoading(false);
  }

  async function downloadCard(format: 'png') {
    if (!selected) return;
    setDownloading(true);

    if (previewImg && previewImg.startsWith('data:image/')) {
      const a = document.createElement('a');
      a.href = previewImg;
      a.download = `${selected.license_number}_card.png`;
      a.click();
      setDownloading(false);
      return;
    }

    try {
      const cardData = {
        name: selected.name,
        district: selected.district,
        licence_no: selected.license_number,
        dob: selected.dob,
        issue_date: selected.issue_date,
        blood_group: selected.blood_group,
        validity: selected.validity,
        allowed_vehicles: selected.valid_for,
      };

      const clientImg = await renderLicenseCardClient(
        cardData,
        selected.photo_url,
        selected.fingerprint_url,
        selected.signature_url
      );
      if (clientImg) {
        const a = document.createElement('a');
        a.href = clientImg;
        a.download = `${selected.license_number}_card.png`;
        a.click();
        setDownloading(false);
        return;
      }
    } catch {}

    setDownloading(false);
  }

  async function handleDelete(id: string) {
    const targetLic = licenses.find((l) => l.id === id);
    const targetLabel = targetLic ? `${targetLic.name} (${targetLic.license_number})` : id;
    if (!window.confirm(`Delete license for ${targetLabel} permanently?`)) return;

    setDeleting(true);
    try {
      // Optimistic removal from UI state
      setLicenses((prev) => prev.filter((l) => l.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (selected?.id === id) setSelected(null);

      // Call server DELETE
      await fetch(`/api/admin?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await fetchLicenses(false);
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setDeleting(false);
    }
  }

  async function decodeCard() {
    if (!previewImg) return;
    try {
      const base64Data = previewImg.replace(/^data:image\/\w+;base64,/, '');
      const blob = await fetch(`data:image/png;base64,${base64Data}`).then((r) => r.blob());
      const form = new FormData();
      form.append('image', blob, 'card.png');
      const res = await fetch('/api/decode', { method: 'POST', body: form });
      const data = await res.json();
      setDecodeResults(data.results || []);
    } catch {}
  }

  function exportCSV() {
    const headers = [
      'ID',
      'License No',
      'Name',
      'District',
      'Father',
      'DOB',
      'Blood Group',
      'Issue Date',
      'Valid Until',
      'Vehicle',
      'Status',
    ];
    const rows = licenses.map((l) => [
      l.id,
      l.license_number,
      l.name,
      l.district || '',
      l.father || '',
      l.dob || '',
      l.blood_group || '',
      l.issue_date,
      l.validity,
      l.valid_for || '',
      l.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'licenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="table-card">
        {/* Controls Toolbar */}
        <div className="table-toolbar">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              justifyContent: 'space-between',
            }}
          >
            <span className="table-toolbar-title">Licenses ({total})</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.72rem',
                color: '#64748b',
              }}
            >
              <span>Live: {lastSync || 'syncing...'}</span>
              <button
                onClick={() => fetchLicenses(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.2rem 0.45rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="Refresh table"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
            <input
              className="search-input-admin"
              placeholder="Search by name, license number, or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="VALID">Valid</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <button
              className="btn btn-outline-admin"
              onClick={exportCSV}
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <FileSpreadsheet size={15} /> CSV
            </button>
            <Link
              href="/admin/licenses/new"
              className="btn btn-primary-admin"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <PlusCircle size={15} /> Add
            </Link>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License No.</th>
                <th>District</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th>Vehicles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}
                  >
                    Loading licenses...
                  </td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}
                  >
                    No licenses match your filter.{' '}
                    <Link
                      href="/admin/licenses/new"
                      style={{ color: 'var(--admin-primary)', fontWeight: 600 }}
                    >
                      Create one
                    </Link>
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => (
                  <tr key={lic.id}>
                    <td className="td-name" data-label="Driver">
                      <div style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>
                        {lic.name}
                      </div>
                      {lic.father && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          s/o {lic.father}
                        </div>
                      )}
                    </td>
                    <td className="td-mono" data-label="License No.">
                      {lic.license_number}
                    </td>
                    <td data-label="District">{lic.district || '—'}</td>
                    <td data-label="Status">
                      <span className={`status-badge ${lic.status?.toLowerCase()}`}>
                        {lic.status}
                      </span>
                    </td>
                    <td data-label="Valid Until">{lic.validity || '—'}</td>
                    <td
                      data-label="Vehicles"
                      style={{
                        fontSize: '0.78rem',
                        maxWidth: '140px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {lic.valid_for || '—'}
                    </td>
                    <td data-label="Actions">
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-outline-admin"
                          style={{ fontSize: '0.72rem', padding: '0.35rem 0.55rem' }}
                          onClick={() => openDetails(lic)}
                          title="View Card"
                        >
                          <Eye size={14} />
                        </button>
                        <Link
                          href={`/admin/licenses/new?edit=${lic.id}`}
                          className="btn btn-outline-admin"
                          style={{ fontSize: '0.72rem', padding: '0.35rem 0.55rem' }}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </Link>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: '0.72rem', padding: '0.35rem 0.55rem' }}
                          onClick={() => handleDelete(lic.id)}
                          disabled={deleting}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details & Live Preview Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selected.name}</h3>
              <span className={`status-badge ${selected.status?.toLowerCase()}`}>
                {selected.status}
              </span>
              <button className="modal-close" onClick={() => setSelected(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Card Preview Area */}
              <div className="preview-panel" style={{ marginBottom: '1rem', minHeight: '180px' }}>
                {previewLoading ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
                    <div
                      style={{
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <RefreshCw size={24} className="spin-icon" />
                    </div>
                    <p style={{ fontSize: '0.82rem', margin: 0 }}>
                      Rendering high-resolution card...
                    </p>
                  </div>
                ) : previewImg ? (
                  <img src={previewImg} alt="License Card" className="preview-img" />
                ) : (
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No preview available</p>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem',
                }}
              >
                <button
                  className="btn btn-primary-admin"
                  onClick={() => downloadCard('png')}
                  disabled={downloading || previewLoading}
                  style={{
                    flex: '1 1 auto',
                    justifyContent: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Download size={15} /> Download Card
                </button>
                <button
                  className="btn btn-outline-admin"
                  onClick={decodeCard}
                  disabled={!previewImg}
                  style={{
                    flex: '1 1 auto',
                    justifyContent: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <QrCode size={15} /> Decode QR & Barcode
                </button>
                <Link
                  href={`/admin/licenses/new?edit=${selected.id}`}
                  className="btn btn-accent"
                  style={{
                    flex: '1 1 auto',
                    justifyContent: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Edit2 size={15} /> Edit
                </Link>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(selected.id)}
                  disabled={deleting}
                  style={{
                    flex: '1 1 auto',
                    justifyContent: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>

              {/* Decode Results */}
              {decodeResults.length > 0 && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      margin: '0 0 0.4rem 0',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <QrCode size={14} /> Scanner Decode Results:
                  </p>
                  {decodeResults.map((r, i) => (
                    <pre
                      key={i}
                      style={{
                        fontSize: '0.78rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        background: '#fff',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #d1fae5',
                        margin: '0.3rem 0',
                      }}
                    >
                      [{r.type}] {r.data}
                    </pre>
                  ))}
                </div>
              )}

              {/* Data Fields */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {[
                  ['License Number', selected.license_number],
                  ['Full Name', selected.name],
                  ['District', selected.district],
                  ["Father's Name", selected.father],
                  ['Date of Birth', selected.dob],
                  ['Blood Group', selected.blood_group],
                  ['Issue Date', selected.issue_date],
                  ['Valid Until', selected.validity],
                  ['Permitted Vehicles', selected.valid_for],
                  ['Status', selected.status],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: label === 'License Number' ? '#b01c40' : '#1e293b',
                      }}
                    >
                      {val || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LicensesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>Loading...</div>
      }
    >
      <LicensesPageInner />
    </Suspense>
  );
}
