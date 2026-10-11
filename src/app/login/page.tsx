'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin';

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push(redirectPath);
      } else {
        setError(data.error || 'Invalid username or password.');
        setLoading(false);
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '390px',
        boxShadow: '0 25px 70px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Image
          src="/images/cropped-Afghanistan-LOGO-997x1024.webp"
          alt="Logo"
          width={68}
          height={68}
          style={{ margin: '0 auto 0.75rem auto', objectFit: 'contain' }}
        />
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#1a3a6b',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Afghan DLIMS
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
          Official Management Portal
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label
            className="form-label"
            style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}
          >
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-control"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="Enter username"
              required
              autoComplete="username"
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
            <User
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label
            className="form-label"
            style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-control"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Enter password"
              required
              autoComplete="current-password"
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
            <Lock
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              fontSize: '0.78rem',
              color: '#dc2626',
              background: '#fee2e2',
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 500,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary-admin"
          disabled={loading}
          style={{
            marginTop: '0.5rem',
            justifyContent: 'center',
            padding: '0.75rem',
            width: '100%',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b192c 0%, #1a3a6b 100%)',
        padding: '1rem',
      }}
    >
      <Suspense fallback={<div style={{ color: '#fff' }}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
