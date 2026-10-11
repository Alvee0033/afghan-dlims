'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Settings,
  Globe,
  Search,
  LogOut,
  Menu
} from 'lucide-react';
import '../admin.css';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/licenses', icon: FileText, label: 'Licenses' },
  { href: '/admin/licenses/new', icon: PlusCircle, label: 'New License' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageTitle = navItems.find(n => pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href)))?.label || 'Admin';

  return (
    <div className="admin-shell">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 490,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-logo">
          <Image
            src="/images/cropped-Afghanistan-LOGO-997x1024.webp"
            alt="Logo"
            width={38}
            height={38}
            style={{ objectFit: 'contain' }}
          />
          <span>Afghan DLMS<br /><small style={{ opacity: 0.7, fontWeight: 400 }}>Admin Portal</small></span>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section">Management</div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon"><Icon size={18} /></span>
                {item.label}
              </Link>
            );
          })}

          <div className="admin-nav-section" style={{ marginTop: '1rem' }}>Shortcuts</div>
          <Link href="/" className="admin-nav-item" target="_blank">
            <span className="nav-icon"><Globe size={18} /></span> Public Portal
          </Link>
          <Link href="/?license_no=19-02-73870982" className="admin-nav-item" target="_blank">
            <span className="nav-icon"><Search size={18} /></span> Demo Verification
          </Link>
        </nav>

        <div className="admin-sidebar-footer">
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
              } catch {}
              document.cookie = 'admin_session=; path=/; max-age=0';
              window.location.href = '/login';
            }}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%', padding: 0 }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* iOS Frosted Topbar */}
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-topbar-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <h2>{pageTitle}</h2>
          </div>

          <div className="admin-topbar-actions">
            <div className="refresh-badge" title="Auto-refreshing every 5 seconds">
              <span className="refresh-dot"></span>
              <span>LIVE</span>
            </div>

            <Link
              href="/admin/licenses/new"
              className="btn btn-primary-admin"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <PlusCircle size={15} />
              <span>New</span>
            </Link>

            <div className="admin-avatar" title="Administrator">A</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="admin-content">
          {children}
        </div>

        {/* iOS Native Style Bottom Navigation Tab Bar for Mobile */}
        <nav className="mobile-tab-bar" aria-label="Mobile Navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-tab-item ${isActive ? 'active' : ''}`}
              >
                <span className="tab-icon"><Icon size={20} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link href="/" className="mobile-tab-item" target="_blank">
            <span className="tab-icon"><Globe size={20} /></span>
            <span>Portal</span>
          </Link>
        </nav>
      </main>
    </div>
  );
}
