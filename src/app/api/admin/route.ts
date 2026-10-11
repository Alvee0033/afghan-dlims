import { NextRequest, NextResponse } from 'next/server';
import { getAllLicenses, saveLicense, deleteLicense, getLicenseById } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
  const id = searchParams.get('id');

  if (id) {
    const record = await getLicenseById(id);
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ license: record });
  }

  const result = await getAllLicenses({ search, status, limit });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.license_number || !body.name) {
      return NextResponse.json({ error: 'license_number and name are required' }, { status: 400 });
    }
    const saved = await saveLicense(body);
    return NextResponse.json({ success: true, license: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id && !body.license_number) {
      return NextResponse.json({ error: 'id or license_number required' }, { status: 400 });
    }
    const saved = await saveLicense(body);
    return NextResponse.json({ success: true, license: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let id = searchParams.get('id') || searchParams.get('license_no');

  if (!id) {
    try {
      const body = await req.json();
      id = body.id || body.license_number;
    } catch {}
  }

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const ok = await deleteLicense(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, id });
}
