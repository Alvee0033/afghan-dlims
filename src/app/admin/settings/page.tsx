'use client';
import { useState } from 'react';
import { Settings, ShieldCheck, Key, User, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setSavingPass(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim() || undefined,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPassMsg({ type: 'success', text: 'Admin credentials updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMsg({ type: 'error', text: data.error || 'Failed to update credentials' });
      }
    } catch {
      setPassMsg({ type: 'error', text: 'Network error updating credentials' });
    }
    setSavingPass(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px' }}>
      {/* Security & Credentials Card */}
      <div className="table-card" style={{ padding: '1.5rem' }}>
        <h3
          style={{
            fontWeight: 700,
            fontSize: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: 'var(--admin-text-main)',
          }}
        >
          <ShieldCheck size={18} style={{ color: 'var(--admin-primary)' }} />
          Admin Security & Password
        </h3>

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                style={{ paddingLeft: '2.4rem' }}
              />
              <Key size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Admin Username (Optional, leave blank to keep unchanged)</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="New username (optional)"
                style={{ paddingLeft: '2.4rem' }}
              />
              <User size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-control"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                className="form-control"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
          </div>

          {passMsg && (
            <div
              style={{
                fontSize: '0.82rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 600,
                background: passMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: passMsg.type === 'success' ? '#166534' : '#dc2626',
              }}
            >
              {passMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{passMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary-admin"
            disabled={savingPass}
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <Save size={15} />
            <span>{savingPass ? 'Updating...' : 'Update Password'}</span>
          </button>
        </form>
      </div>

      {/* General Settings Card */}
      <div className="table-card" style={{ padding: '1.5rem' }}>
        <h3
          style={{
            fontWeight: 700,
            fontSize: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: 'var(--admin-text-main)',
          }}
        >
          <Settings size={18} style={{ color: 'var(--admin-primary)' }} />
          System Settings
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Portal Name', value: 'Afghanistan DLIMS' },
            { label: 'Ministry', value: 'Ministry of Interior Affairs' },
            { label: 'Portal URL', value: 'https://afghansdlims.com' },
            { label: 'Admin Email', value: 'admin@afghansdlims.com' },
          ].map((item) => (
            <div key={item.label} className="form-group">
              <label className="form-label">{item.label}</label>
              <input className="form-control" defaultValue={item.value} />
            </div>
          ))}

          <button
            type="button"
            className="btn btn-outline-admin"
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            onClick={() => alert('General settings saved')}
          >
            <Save size={15} />
            <span>Save System Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
