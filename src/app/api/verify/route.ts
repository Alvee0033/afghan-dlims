import { NextRequest, NextResponse } from 'next/server';
import { findLicenseForVerification } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q =
    searchParams.get('license_no') ||
    searchParams.get('licence_no') ||
    searchParams.get('dl_no') ||
    searchParams.get('license') ||
    searchParams.get('q') ||
    '';

  if (!q.trim()) {
    return NextResponse.json({ error: 'license_no is required' }, { status: 400 });
  }

  const record = await findLicenseForVerification(q.trim());

  if (!record) {
    return NextResponse.json({ found: false, message: 'License not found' }, { status: 404 });
  }

  return NextResponse.json({ found: true, license: record });
}
