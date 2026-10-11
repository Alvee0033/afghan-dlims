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

async function saveStoredCredentials(creds: { username: string; password: string }): Promise<boolean> {
  if (!EDGE_CONFIG_URL || !VERCEL_TOKEN) return false;
  try {
    const res = await fetch(`${EDGE_CONFIG_URL}/items?teamId=${VERCEL_TEAM_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'upsert',
            key: 'admin_credentials',
            value: creds,
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get('admin_session')?.value;
  if (session !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { currentPassword, newUsername, newPassword } = body;

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const currentCreds = await getStoredCredentials();
    if (currentPassword !== currentCreds.password) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const updatedCreds = {
      username: (newUsername && newUsername.trim()) || currentCreds.username,
      password: newPassword,
    };

    const saved = await saveStoredCredentials(updatedCreds);
    if (!saved) {
      return NextResponse.json({ error: 'Failed to update credentials in storage' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
