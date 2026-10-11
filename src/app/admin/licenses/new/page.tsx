'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { renderLicenseCardClient } from '@/lib/renderCardClient';

const VEHICLE_OPTIONS = [
  '1. Motor Cycle',
  '2. M Car Jeep',
  '3. Motor Cycle/ M Car Jeep',
  'Custom...',
];

// Exact authentic defaults extracted from demo.png
const DEMO_DEFAULTS = {
  license_number: '1985-0198-09221',
  name: 'ULFAT YOUSAFZAI',
  district: 'Ghazni',
  father: 'MOHAMMAD YOUSAF',
  dob: '03-01-1985',
  blood_group: 'B+ve',
  issue_date: '06-11-2020',
  validity: '05-11-2030',
  valid_for: '3. Motor Cycle/ M Car Jeep',
  custom_vehicle: '',
  status: 'VALID',
  photo_url: '/images/sample_photo_clean.png',
  fingerprint_url: '/images/sample_fingerprint_transparent.png',
  signature_url: '/images/sample_authority_sig.png',
};

function generateLicenseNo() {
  const yr = new Date().getFullYear();
  const rand = () => Math.floor(Math.random() * 9000 + 1000);
  return `${yr}-${rand()}-${rand()}`;
}

function NewLicensePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('edit');

  // Start with empty fields so user can type freely without prefilled values
  const [form, setForm] = useState({
    id: '',
    license_number: '',
    name: '',
    district: '',
    father: '',
    dob: '',
    blood_group: 'B+ve',
    issue_date: '',
    validity: '',
    valid_for: '3. Motor Cycle/ M Car Jeep',
    custom_vehicle: '',
    status: 'VALID',
  });

  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [fpPreview, setFpPreview] = useState<string>('');
  const [sigPreview, setSigPreview] = useState<string>('');

  const [cardPreview, setCardPreview] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const fpInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Load existing record for edit
  useEffect(() => {
    if (editId) {
      fetch(`/api/admin?id=${editId}`)
        .then(r => r.json())
        .then(d => {
          if (d.license) {
            const l = d.license;
            const isCustom = !VEHICLE_OPTIONS.slice(0, -1).some(v => v === l.valid_for);
            setForm({
              id: l.id,
              license_number: l.license_number,
              name: l.name,
              district: l.district || '',
              father: l.father || '',
              dob: l.dob || '',
              blood_group: l.blood_group || 'B+ve',
              issue_date: l.issue_date,
              validity: l.validity,
              valid_for: isCustom ? 'Custom...' : (l.valid_for || ''),
              custom_vehicle: isCustom ? (l.valid_for || '') : '',
              status: l.status || 'VALID',
            });
            if (l.photo_url) setPhotoPreview(l.photo_url);
            if (l.fingerprint_url) setFpPreview(l.fingerprint_url);
            if (l.signature_url) setSigPreview(l.signature_url);
          }
        });
    }
  }, [editId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function resizeAndCompress(
    file: File,
    maxWidth: number,
    maxHeight: number,
    type: 'photo' | 'fp' | 'sig',
    callback: (dataUri: string) => void
  ) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          callback(e.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        if (type === 'photo') {
          // Driver photo: crisp, compact JPEG (10-18 KB max)
          callback(canvas.toDataURL('image/jpeg', 0.78));
        } else {
          // Transparent PNG for fingerprints & signatures
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          if (type === 'fp') {
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const brightness = (r + g + b) / 3;
              if (brightness > 190) {
                data[i + 3] = 0; // transparent background
              } else {
                const alpha = Math.min(255, (255 - brightness) * 1.6);
                data[i] = 20;
                data[i + 1] = 60;
                data[i + 2] = 180;
                data[i + 3] = alpha;
              }
            }
          } else {
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const brightness = (r + g + b) / 3;
              if (brightness > 195) {
                data[i + 3] = 0; // transparent background
              } else {
                const alpha = Math.min(255, (255 - brightness) * 2.2);
                data[i] = 15;
                data[i + 1] = 45;
                data[i + 2] = 140;
                data[i + 3] = alpha;
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
          callback(canvas.toDataURL('image/png'));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'fp' | 'sig') {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'photo') {
      resizeAndCompress(file, 240, 300, 'photo', (compressedUri) => {
        setPhotoPreview(compressedUri);
      });
    } else if (type === 'fp') {
      resizeAndCompress(file, 200, 200, 'fp', (compressedUri) => {
        setFpPreview(compressedUri);
      });
    } else if (type === 'sig') {
      resizeAndCompress(file, 250, 110, 'sig', (compressedUri) => {
        setSigPreview(compressedUri);
      });
    }
  }

  // AUTO-REFRESH PREVIEW on ANY change to form, photo, fingerprint, or signature
  // IF LEFT EMPTY: automatically fallback to demo.png values for rendering
  const generatePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const vehicleValue = form.valid_for === 'Custom...'
        ? (form.custom_vehicle || DEMO_DEFAULTS.valid_for)
        : (form.valid_for ? form.valid_for.replace(/^\d+\. /, '') : DEMO_DEFAULTS.valid_for);

      const cardData = {
        name: form.name.trim() || DEMO_DEFAULTS.name,
        district: form.district.trim() || DEMO_DEFAULTS.district,
        licence_no: form.license_number.trim() || DEMO_DEFAULTS.license_number,
        dob: form.dob.trim() || DEMO_DEFAULTS.dob,
        issue_date: form.issue_date.trim() || DEMO_DEFAULTS.issue_date,
        blood_group: form.blood_group || DEMO_DEFAULTS.blood_group,
        validity: form.validity.trim() || DEMO_DEFAULTS.validity,
        allowed_vehicles: vehicleValue,
      };

      const photo = photoPreview || DEMO_DEFAULTS.photo_url;
      const fp = fpPreview || DEMO_DEFAULTS.fingerprint_url;
      const sig = sigPreview || DEMO_DEFAULTS.signature_url;

      // 1. Instant client-side high-resolution canvas render (works on Vercel and local)
      try {
        const clientCardDataUrl = await renderLicenseCardClient(cardData, photo, fp, sig);
        if (clientCardDataUrl) {
          setCardPreview(clientCardDataUrl);
          setPreviewLoading(false);
          return;
        }
      } catch (clientErr) {
        console.warn('Client canvas render fallback to API:', clientErr);
      }

      // 2. Server API fallback if client canvas fails
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: cardData,
          photo_url: photo,
          fingerprint_url: fp,
          signature_url: sig,
          format: 'base64',
        }),
      });
      const data = await res.json();
      if (data.image) setCardPreview(data.image);
    } catch (e) {
      console.error('Preview error:', e);
    }
    setPreviewLoading(false);
  }, [form, photoPreview, fpPreview, sigPreview]);

  // Debounced live preview auto-update whenever form or uploads change
  useEffect(() => {
    const timer = setTimeout(() => {
      generatePreview();
    }, 400);
    return () => clearTimeout(timer);
  }, [generatePreview]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      const vehicleValue = form.valid_for === 'Custom...'
        ? (form.custom_vehicle || 'Motor Cycle')
        : (form.valid_for ? form.valid_for.replace(/^\d+\. /, '') : 'Motor Cycle');

      // Require name
      if (!form.name.trim()) {
        setSaveMsg('Error: Full Name is required');
        setSaving(false);
        return;
      }

      // Auto-generate license number if blank
      const finalLicenseNo = form.license_number.trim() || generateLicenseNo();
      const finalName = form.name.trim().toUpperCase();
      const finalDistrict = form.district.trim() || '';
      const finalFather = form.father.trim() || '';
      const finalDob = form.dob.trim() || '';
      const finalBlood = form.blood_group || 'B+ve';
      const finalIssue = form.issue_date.trim() || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      const finalValidity = form.validity.trim() || '';
      const finalPhoto = photoPreview || '/images/sample_photo_clean.png';
      const finalFp = fpPreview || '/images/sample_fingerprint_transparent.png';
      const finalSig = sigPreview || '/images/sample_authority_sig.png';

      const payload: any = {
        ...(form.id ? { id: form.id } : {}),
        license_number: finalLicenseNo,
        name: finalName,
        district: finalDistrict,
        father: finalFather,
        dob: finalDob,
        blood_group: finalBlood,
        issue_date: finalIssue,
        validity: finalValidity,
        valid_for: vehicleValue,
        allowed_vehicles: vehicleValue,
        status: form.status || 'VALID',
        photo_url: finalPhoto,
        fingerprint_url: finalFp,
        signature_url: finalSig,
      };

      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg(`Saved! License No: ${data.license?.license_number}`);
        setTimeout(() => router.push('/admin/licenses'), 1200);
      } else {
        setSaveMsg(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
    }
    setSaving(false);
  }

  function handleAutoFillDemo() {
    setForm({
      id: '',
      license_number: DEMO_DEFAULTS.license_number,
      name: DEMO_DEFAULTS.name,
      district: DEMO_DEFAULTS.district,
      father: DEMO_DEFAULTS.father,
      dob: DEMO_DEFAULTS.dob,
      blood_group: DEMO_DEFAULTS.blood_group,
      issue_date: DEMO_DEFAULTS.issue_date,
      validity: DEMO_DEFAULTS.validity,
      valid_for: DEMO_DEFAULTS.valid_for,
      custom_vehicle: '',
      status: 'VALID',
    });
    setPhotoPreview(DEMO_DEFAULTS.photo_url);
    setFpPreview(DEMO_DEFAULTS.fingerprint_url);
    setSigPreview(DEMO_DEFAULTS.signature_url);
  }

  const UploadBox = ({ label, preview, inputRef, onChange, hint }: any) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="upload-area" onClick={() => inputRef.current?.click()} style={{ minHeight: '130px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <input ref={inputRef} type="file" accept="image/*" onChange={onChange} />
        {preview ? (
          <img src={preview} alt="" className="upload-preview" style={{ maxHeight: '90px', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#64748b' }}>
            <Upload size={24} style={{ margin: '0 auto 0.35rem auto' }} />
            <p style={{ margin: 0, fontSize: '0.75rem' }}>Click to upload</p>
          </div>
        )}
      </div>
      {hint && (
        <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', textAlign: 'center', display: 'block' }}>
          {hint}
        </span>
      )}
    </div>
  );

  return (
    <div className="editor-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '1.25rem', alignItems: 'start' }}>
      {/* Input Form Column */}
      <div>
        <form onSubmit={handleSave}>
          <div className="table-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0, color: 'var(--admin-text-main)' }}>
                {editId ? 'Edit Driving License' : 'Create License'}
              </h3>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-outline-admin"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={handleAutoFillDemo}
                  title="Autofill from demo.png"
                >
                  <Sparkles size={14} /> Auto-fill Demo
                </button>
                <button
                  type="button"
                  className="btn btn-outline-admin"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => router.push('/admin/licenses')}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-section-title">Identity & License</div>

              <div className="form-group">
                <label className="form-label">License Number (blank = demo)</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    className="form-control"
                    name="license_number"
                    value={form.license_number}
                    onChange={handleChange}
                    placeholder="1985-0198-09221"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-admin"
                    style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.65rem' }}
                    onClick={() => setForm(f => ({ ...f, license_number: generateLicenseNo() }))}
                    title="Generate new ID"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="form-group full">
                <label className="form-label">Full Name (blank = demo)</label>
                <input
                  className="form-control"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="ULFAT YOUSAFZAI"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">District / Province</label>
                <input
                  className="form-control"
                  name="district"
                  value={form.district}
                  onChange={handleChange}
                  placeholder="e.g. Ghazni"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Father&apos;s Name</label>
                <input
                  className="form-control"
                  name="father"
                  value={form.father}
                  onChange={handleChange}
                  placeholder="e.g. MOHAMMAD YOUSAF"
                />
              </div>

              <div className="form-section-title">Dates & Blood Group</div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  className="form-control"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  placeholder="DD-MM-YYYY"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select
                  className="form-control"
                  name="blood_group"
                  value={form.blood_group}
                  onChange={handleChange}
                >
                  {['A+ve', 'A-ve', 'B+ve', 'B-ve', 'O+ve', 'O-ve', 'AB+ve', 'AB-ve', 'N/A'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input
                  className="form-control"
                  name="issue_date"
                  value={form.issue_date}
                  onChange={handleChange}
                  placeholder="DD-MM-YYYY"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Valid Until (Expiry)</label>
                <input
                  className="form-control"
                  name="validity"
                  value={form.validity}
                  onChange={handleChange}
                  placeholder="DD-MM-YYYY"
                />
              </div>

              <div className="form-section-title">Vehicle Category & Status</div>

              <div className="form-group">
                <label className="form-label">Allowed Vehicle Types</label>
                <select
                  className="form-control"
                  name="valid_for"
                  value={form.valid_for}
                  onChange={handleChange}
                >
                  {VEHICLE_OPTIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {form.valid_for === 'Custom...' && (
                <div className="form-group">
                  <label className="form-label">Custom Category Text</label>
                  <input
                    className="form-control"
                    name="custom_vehicle"
                    value={form.custom_vehicle}
                    onChange={handleChange}
                    placeholder="e.g. M.CYCLE+M.CAR ONLY"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="VALID">VALID</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className="form-section-title">Photos & Biometrics (Live Updating)</div>
            </div>

            {/* Photo, Fingerprint, Signature Uploads */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
              <UploadBox
                label="Driver Photo"
                preview={photoPreview}
                inputRef={photoInputRef}
                onChange={(e: any) => handleFile(e, 'photo')}
              />
              <UploadBox
                label="Signature/Fingerprint"
                preview={fpPreview}
                inputRef={fpInputRef}
                onChange={(e: any) => handleFile(e, 'fp')}
                hint="Auto-transparent ink"
              />
              <UploadBox
                label="Authority Signature"
                preview={sigPreview}
                inputRef={sigInputRef}
                onChange={(e: any) => handleFile(e, 'sig')}
                hint="Auto-transparent ink"
              />
            </div>

            {saveMsg && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: saveMsg.includes('Error') ? '#fee2e2' : '#dcfce7',
                  color: saveMsg.includes('Error') ? '#dc2626' : '#15803d',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {saveMsg.includes('Error') ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{saveMsg}</span>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary-admin"
                disabled={saving}
                style={{ flex: '1 1 auto', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Live Card Preview Column */}
      <div style={{ position: 'sticky', top: '75px' }}>
        <div className="table-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '0.88rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FileText size={16} /> Live Card Preview
            </h4>
            {previewLoading && (
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <RefreshCw size={12} className="spin-icon" /> Updating...
              </span>
            )}
          </div>

          <div className="preview-panel" style={{ minHeight: '260px' }}>
            {cardPreview ? (
              <img src={cardPreview} alt="Card Preview" className="preview-img" />
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>
                Loading card...
              </p>
            )}
          </div>

          {cardPreview && (
            <div style={{ marginTop: '0.75rem' }}>
              <a
                href={cardPreview}
                download={`${form.license_number || 'license'}_card.png`}
                className="btn btn-primary-admin"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Download size={15} /> Download Full Card
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewLicensePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>Loading editor...</div>}>
      <NewLicensePageInner />
    </Suspense>
  );
}
