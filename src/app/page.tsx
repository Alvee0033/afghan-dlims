'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface License {
  id?: string;
  license_number: string;
  name: string;
  father?: string;
  address?: string;
  district?: string;
  cnic?: string;
  dob?: string;
  blood_group?: string;
  category?: string;
  valid_for?: string;
  allowed_vehicles?: string;
  issue_date: string;
  validity: string;
  status: string;
  photo_url?: string;
}

export const dynamic = 'force-dynamic';

function DLMSHome() {
  const searchParams = useSearchParams();
  const urlLicenseNo =
    searchParams.get('license_no') ||
    searchParams.get('licence_no') ||
    searchParams.get('dl_no') ||
    searchParams.get('license') ||
    searchParams.get('q') ||
    '';

  const [query, setQuery] = useState(urlLicenseNo);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<License | null>(null);
  const [notFound, setNotFound] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check searchParams first, fallback to window.location.search
    let targetNo = urlLicenseNo;
    if (!targetNo && typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      targetNo =
        p.get('license_no') ||
        p.get('licence_no') ||
        p.get('dl_no') ||
        p.get('license') ||
        p.get('q') ||
        '';
    }
    if (targetNo) {
      setQuery(targetNo);
      fetchLicense(targetNo);
    }
  }, [urlLicenseNo]);

  useEffect(() => {
    if (result && resultRef.current) {
      const doScroll = () => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      doScroll();
      const t1 = setTimeout(doScroll, 200);
      const t2 = setTimeout(doScroll, 600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [result]);

  async function fetchLicense(licenseNo: string) {
    if (!licenseNo.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const res = await fetch(`/api/verify?license_no=${encodeURIComponent(licenseNo.trim())}`);
      const data = await res.json();
      if (data.found && data.license) {
        setResult(data.license);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    // Update URL query string
    const newUrl = `/?license_no=${encodeURIComponent(query.trim())}`;
    window.history.pushState({}, '', newUrl);
    fetchLicense(query.trim());
  }

  const rows = result
    ? [
        { label: 'License Number:', value: result.license_number },
        { label: 'Name:', value: result.name },
        { label: 'Father/Husband Name:', value: result.father || '—' },
        { label: 'Address:', value: result.address || result.district || '—' },
        { label: 'CNIC Number:', value: result.cnic || result.license_number },
        { label: 'Date of Birth:', value: result.dob || '—' },
        { label: 'Blood Group:', value: result.blood_group || 'N/A' },
        { label: 'Category:', value: result.category || result.valid_for || result.allowed_vehicles || '—' },
        { label: 'Issue Date:', value: result.issue_date },
        { label: 'Expiry Date:', value: result.validity },
      ]
    : [];

  return (
    <div ref={topRef}>
      {/* NAVBAR */}
      <div className="navbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Logo" src="/images/cropped-Afghanistan-LOGO-997x1024.webp" />
        <div className="menu-icon">
          <i className="fas fa-bars"></i>
        </div>
      </div>

      {/* TOP BANNER */}
      <div className="top-banner">
        <h2>د افغانستان اسلامي جمهوریت د ترانسپورت وزارت د چلولو جواز</h2>
        <div className="banner-flag">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Afghanistan Flag" src="/images/Animated-Flag-Afghanistan.gif" />
        </div>
        <h2>جمهوری اسلامی افغانستان، وزارت ترانسپورت، جواز رانندگی</h2>
      </div>

      {/* CONTAINER */}
      <div className="container">
        <h3 className="section-title">What we stand for</h3>
        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-globe"></i>
            </div>
            <span>Responsive</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-th"></i>
            </div>
            <span>Quality</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <span>Support</span>
          </div>
        </div>

        <div className="search-box-wrap">
          <form onSubmit={handleSubmit}>
            <label className="search-label">
              License Number <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              className="search-input"
              name="license_no"
              placeholder="Type License Number"
              required
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Submit'}
            </button>
          </form>

          {notFound && (
            <div className="error-msg">
              No record found for this License Number!
            </div>
          )}
        </div>

        {/* RESULT CARD - EXACT MATCH TO ORIGINAL */}
        {result && (
          <div className="result-card" ref={resultRef}>
            {/* Watermarks */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Watermark Emblem"
              className="watermark-emblem"
              src="/images/cropped-Afghanistan-LOGO-997x1024.webp"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Watermark Flag"
              className="watermark-flag"
              src="/images/Animated-Flag-Afghanistan.gif"
            />
            <div className="result-content">
              {rows.map((row, i) => (
                <div className="result-row" key={i}>
                  <div className="result-title">{row.label}</div>
                  <div className="result-dots"></div>
                  <div className="result-value">{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ABOUT SECTION */}
      <div className="about-section">
        <div className="about-text">
          <h3>About License</h3>
          <p>obtaining a license requires the applicant to pass both a written and practical exam.</p>
        </div>
        <div className="about-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Landscape Flag" src="/images/pexels-photo-1576938-1576938-2048x1365.jpg" />
        </div>
      </div>

      {/* FOOTER */}
      <div className="footer-bottom">
        Copyright © 2026 Afghan DLMS
        <a
          className="scroll-top"
          href="#"
          title="Go to top"
          onClick={(e) => {
            e.preventDefault();
            topRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <i className="fas fa-chevron-up"></i>
        </a>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
      <DLMSHome />
    </Suspense>
  );
}
