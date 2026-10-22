import fs from 'fs';
import path from 'path';
import os from 'os';
import { put, list, del } from '@vercel/blob';

export interface LicenseRecord {
  id: string;
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
  status: 'VALID' | 'EXPIRED' | 'SUSPENDED';
  photo_url?: string;
  fingerprint_url?: string;
  signature_url?: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

// Permanent Vercel Blob store token — dedicated storage token that never expires
const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  'vercel_blob_rw_u4EEIpk3bBWCrT6G_hY2iGJpd3LV6GApZMlPCzlbQFAu9XW';

// Optional Edge Config fallback
const EDGE_CONFIG_URL =
  process.env.VERCEL_EDGE_CONFIG_URL ||
  'https://api.vercel.com/v1/edge-config/ecfg_yuunkablqfiuplzgtmksbj5eeq1q';
const VERCEL_TOKEN =
  process.env.VERCEL_AUTH_TOKEN ||
  'vca_0uqHw60ysDGo3Tu25olTmbpOfCeiIu1vTIGZPSa3VNGeSDCFv71WaR4H';
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_oIEViqCHIUvB2XL7l6OHEpi5';

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? os.tmpdir() : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'licenses.json');
const BUNDLED_FILE = path.join(process.cwd(), 'data', 'licenses.json');

const INITIAL_SEED: LicenseRecord[] = [
  {
    id: 'lic_demo_00',
    license_number: '19-02-73870982',
    name: 'Waris MOHAMMAD SHAH',
    father: 'MOHAMMAD SHAH',
    address: 'KABUL',
    district: 'KABUL',
    cnic: '19-02-73870982',
    dob: '01/02/1993',
    blood_group: 'N/A',
    category: 'M.CYCLE+M.CAR ONLY',
    valid_for: 'M.CYCLE+M.CAR ONLY',
    allowed_vehicles: 'M.CYCLE+M.CAR ONLY',
    issue_date: '19-02-2019',
    validity: '22-03-2031',
    status: 'VALID',
    photo_url: '/images/sample_photo_clean.png',
    fingerprint_url: '/images/sample_fingerprint_transparent.png',
    signature_url: '/images/sample_authority_sig.png',
    created_at: '2026-09-29T18:22:49.276Z',
  },
  {
    id: 'lic_demo_01',
    license_number: '1985-0198-09221',
    name: 'ULFAT YOUSAFZAI',
    district: 'Ghazni',
    address: 'Ghazni',
    father: 'MOHAMMAD YOUSAF',
    cnic: '1985-0198-09221',
    dob: '03-01-1985',
    blood_group: 'B+ve',
    category: 'Motor Cycle/ M Car Jeep',
    valid_for: 'Motor Cycle/ M Car Jeep',
    allowed_vehicles: 'Motor Cycle/ M Car Jeep',
    issue_date: '06-11-2020',
    validity: '05-11-2030',
    status: 'VALID',
    photo_url: '/images/sample_photo_clean.png',
    fingerprint_url: '/images/sample_fingerprint_transparent.png',
    signature_url: '/images/sample_authority_sig.png',
    created_at: '2026-09-29T18:22:49.276Z',
  },
  {
    id: 'lic_demo_02',
    license_number: 'AFG-2024-88392',
    name: 'AHMAD ZAHIR KHAN',
    district: 'Kabul',
    address: 'District 10, Kabul',
    father: 'MOHAMMAD IBRAHIM',
    cnic: 'AFG-2024-88392',
    dob: '15-04-1992',
    blood_group: 'O+ve',
    category: 'M Car Jeep',
    valid_for: 'M Car Jeep',
    allowed_vehicles: 'M Car Jeep',
    issue_date: '10-01-2021',
    validity: '09-01-2026',
    status: 'VALID',
    photo_url: '/images/sample_photo_clean.png',
    fingerprint_url: '/images/sample_fingerprint_transparent.png',
    signature_url: '/images/sample_authority_sig.png',
    created_at: '2026-09-29T18:22:49.276Z',
  },
];

let memoryLicenses: LicenseRecord[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 1000;

export function normalizeKey(s: string): string {
  if (!s) return '';
  return s
    .replace(/^(DL\s*NO\s*:?|DL\s*:?|LICENCE\s*(NO)?\s*:?|LICENSE\s*(NO)?\s*:?)/i, '')
    .replace(/[\s\-_/.]/g, '')
    .toUpperCase()
    .trim();
}

function getLocalDiskLicenses(): LicenseRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    if (fs.existsSync(BUNDLED_FILE)) {
      const bundledRaw = fs.readFileSync(BUNDLED_FILE, 'utf-8');
      const parsed = JSON.parse(bundledRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_SEED;
}

function saveLocalDiskLicenses(licenses: LicenseRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(licenses, null, 2), 'utf-8');
    if (!IS_VERCEL && fs.existsSync(path.join(process.cwd(), 'data'))) {
      fs.writeFileSync(BUNDLED_FILE, JSON.stringify(licenses, null, 2), 'utf-8');
    }
  } catch {}
}

async function fetchFromBlobStore(): Promise<LicenseRecord[] | null> {
  if (!BLOB_TOKEN) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await list({
      prefix: 'master_licenses',
      token: BLOB_TOKEN,
      abortSignal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.blobs && res.blobs.length > 0) {
      const sorted = res.blobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      const latestUrl = sorted[0].url;

      const fetchRes = await fetch(latestUrl, {
        cache: 'no-store',
      });
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('fetchFromBlobStore error:', err.message);
  }
  return null;
}

async function syncToBlobStore(licenses: LicenseRecord[]): Promise<boolean> {
  if (!BLOB_TOKEN) return false;
  try {
    const newBlob = await put('master_licenses.json', JSON.stringify(licenses, null, 2), {
      access: 'public',
      addRandomSuffix: true,
      token: BLOB_TOKEN,
    });

    if (!newBlob || !newBlob.url) {
      console.error('Blob put failed to return url');
      return false;
    }

    // Prune older versions in background (keep latest 3)
    (async () => {
      try {
        const res = await list({ prefix: 'master_licenses', token: BLOB_TOKEN });
        if (res.blobs.length > 3) {
          const sorted = res.blobs.sort(
            (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
          const oldUrls = sorted.slice(3).map((b) => b.url);
          if (oldUrls.length > 0) {
            await del(oldUrls, { token: BLOB_TOKEN });
          }
        }
      } catch {}
    })();

    return true;
  } catch (err: any) {
    console.error('syncToBlobStore error:', err.message);
    return false;
  }
}

async function mirrorToEdgeConfig(licenses: LicenseRecord[]): Promise<void> {
  if (!EDGE_CONFIG_URL || !VERCEL_TOKEN) return;
  try {
    await fetch(`${EDGE_CONFIG_URL}/items?teamId=${VERCEL_TEAM_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ operation: 'upsert', key: 'licenses', value: licenses }],
      }),
    });
  } catch {}
}

async function loadMasterState(): Promise<LicenseRecord[]> {
  const now = Date.now();

  if (memoryLicenses && now - lastFetchTime < CACHE_TTL_MS) {
    return memoryLicenses;
  }

  // 1. On self-hosted / Docker / persistent server, disk file is source of truth
  const diskData = getLocalDiskLicenses();
  if (diskData.length > 0) {
    memoryLicenses = diskData;
    lastFetchTime = now;
    return diskData;
  }

  // 2. Fallback to blob store if available
  if (IS_VERCEL) {
    const blobData = await fetchFromBlobStore();
    if (blobData !== null && blobData.length > 0) {
      memoryLicenses = blobData;
      lastFetchTime = now;
      saveLocalDiskLicenses(blobData);
      return blobData;
    }
  }

  memoryLicenses = INITIAL_SEED;
  return INITIAL_SEED;
}

export async function getAllLicenses(opts?: {
  search?: string;
  status?: string;
  limit?: number;
}): Promise<{ licenses: LicenseRecord[]; total: number }> {
  const master = await loadMasterState();
  let list = [...master];

  if (opts?.search) {
    const q = opts.search.toLowerCase().trim();
    list = list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.license_number.toLowerCase().includes(q) ||
        (l.district && l.district.toLowerCase().includes(q))
    );
  }
  if (opts?.status && opts.status !== 'ALL') {
    list = list.filter((l) => l.status === opts.status);
  }

  const total = list.length;
  if (opts?.limit) {
    list = list.slice(0, opts.limit);
  }

  return { licenses: list, total };
}

export async function getLicenseById(id: string): Promise<LicenseRecord | null> {
  const licenses = await loadMasterState();
  return licenses.find((l) => l.id === id) || null;
}

export async function saveLicense(
  record: Partial<LicenseRecord> & { license_number: string; name: string }
): Promise<LicenseRecord> {
  const disk = getLocalDiskLicenses();
  const fresh = disk.length > 0 ? disk : (IS_VERCEL ? (await fetchFromBlobStore()) ?? disk : disk);
  const licenses: LicenseRecord[] = [...fresh];

  const id = record.id || `lic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const normNo = normalizeKey(record.license_number);

  const existingIdx = licenses.findIndex(
    (l) => l.id === id || normalizeKey(l.license_number) === normNo
  );

  let savedRecord: LicenseRecord;

  if (existingIdx !== -1) {
    savedRecord = {
      ...licenses[existingIdx],
      ...record,
      id,
      updated_at: new Date().toISOString(),
    } as LicenseRecord;
    licenses[existingIdx] = savedRecord;
  } else {
    savedRecord = {
      id,
      license_number: record.license_number,
      name: record.name,
      district: record.district,
      address: record.address || record.district,
      father: record.father,
      cnic: record.cnic || record.license_number,
      dob: record.dob,
      blood_group: record.blood_group,
      category: record.category || record.valid_for || record.allowed_vehicles,
      valid_for: record.valid_for || record.allowed_vehicles || record.category,
      allowed_vehicles: record.allowed_vehicles || record.valid_for || record.category,
      issue_date: record.issue_date || new Date().toISOString().split('T')[0],
      validity: record.validity || '',
      status: record.status || 'VALID',
      photo_url: record.photo_url || '/images/sample_photo_clean.png',
      fingerprint_url: record.fingerprint_url || '/images/sample_fingerprint_transparent.png',
      signature_url: record.signature_url || '/images/sample_authority_sig.png',
      created_at: new Date().toISOString(),
    };
    licenses.unshift(savedRecord);
  }

  memoryLicenses = licenses;
  lastFetchTime = Date.now();
  saveLocalDiskLicenses(licenses);

  const ok = await syncToBlobStore(licenses);
  if (!ok) {
    console.warn('Blob sync returned false, saved to local cache');
  }

  mirrorToEdgeConfig(licenses).catch(() => {});

  return savedRecord;
}

export async function findLicenseForVerification(licenseNo: string): Promise<LicenseRecord | null> {
  if (!licenseNo || !licenseNo.trim()) return null;
  const raw = licenseNo.trim();
  const target = normalizeKey(raw);
  if (!target) return null;

  const licenses = await loadMasterState();

  const exact = licenses.find((l) => normalizeKey(l.license_number) === target);
  if (exact) return exact;

  const cnicMatch = licenses.find((l) => l.cnic && normalizeKey(l.cnic) === target);
  if (cnicMatch) return cnicMatch;

  const idMatch = licenses.find((l) => l.id && l.id.toLowerCase() === raw.toLowerCase());
  if (idMatch) return idMatch;

  if (target.length >= 4) {
    const partial = licenses.find((l) => {
      const cleanL = normalizeKey(l.license_number);
      return cleanL.includes(target) || target.includes(cleanL);
    });
    if (partial) return partial;
  }

  return null;
}

export async function deleteLicense(idOrNumber: string): Promise<boolean> {
  const fresh = (await fetchFromBlobStore()) ?? getLocalDiskLicenses();
  const licenses: LicenseRecord[] = [...fresh];

  const target = idOrNumber.trim();
  const targetNorm = normalizeKey(target);

  const filtered = licenses.filter(
    (l) =>
      l.id !== target &&
      l.license_number !== target &&
      normalizeKey(l.license_number) !== targetNorm
  );

  if (filtered.length === licenses.length) {
    return false;
  }

  memoryLicenses = filtered;
  lastFetchTime = Date.now();
  saveLocalDiskLicenses(filtered);

  await syncToBlobStore(filtered);
  mirrorToEdgeConfig(filtered).catch(() => {});

  return true;
}
