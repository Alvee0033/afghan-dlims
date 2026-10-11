import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EDGE_CONFIG_URL =
  process.env.VERCEL_EDGE_CONFIG_URL ||
  'https://api.vercel.com/v1/edge-config/ecfg_yuunkablqfiuplzgtmksbj5eeq1q';
const VERCEL_TOKEN =
  process.env.VERCEL_AUTH_TOKEN ||
  'vca_8Xyd6UMlD315gRdiJGw1t9mGHzG3uFCmMvpt2phF1lpH5o60jB3NeQb6';
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_oIEViqCHIUvB2XL7l6OHEpi5';

async function getStoredCredentials(): Promise<{ username: string; password: string }> {
  const defaultUser = process.env.ADMIN_USERNAME || 'admin';
  const defaultPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (!EDGE_CONFIG_URL || !VERCEL_TOKEN) {
    return { username: defaultUser, password: defaultPass };
  }

  try {
    const res = await fetch(`${EDGE_CONFIG_URL}/item/admin_credentials?teamId=${VERCEL_TEAM_ID}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.value && data.value.username && data.value.password) {
        return data.value;
      }
    }
  } catch {}

  return { username: defaultUser, password: defaultPass };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const validCreds = await getStoredCredentials();

    if (username.trim() === validCreds.username && password === validCreds.password) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('admin_session', 'authenticated', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
