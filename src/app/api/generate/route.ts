import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const resolveAsset = (val: string | undefined, prefix: string, tmpDir: string, uid: string, projectRoot: string): string => {
  if (!val) return '';
  if (val.startsWith('data:image/')) {
    const matches = val.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (matches) {
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const b64Data = matches[2];
      const tmpAsset = path.join(tmpDir, `${uid}_${prefix}.${ext}`);
      fs.writeFileSync(tmpAsset, Buffer.from(b64Data, 'base64'));
      return tmpAsset;
    }
  }
  if (val.startsWith('/')) {
    const localPath = path.join(projectRoot, 'public', val);
    if (fs.existsSync(localPath)) return localPath;
  }
  if (fs.existsSync(val)) return val;
  return '';
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, photo_url, fingerprint_url, signature_url, format = 'base64' } = body;

    if (!data) {
      return NextResponse.json({ error: 'Missing data payload' }, { status: 400 });
    }

    const tmpDir = os.tmpdir();
    const uid = `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const jsonPath = path.join(tmpDir, `${uid}.json`);
    const outPath = path.join(tmpDir, `${uid}.png`);

    fs.writeFileSync(jsonPath, JSON.stringify(data), 'utf-8');

    const projectRoot = process.cwd();
    const pyScript = path.join(projectRoot, 'templet 1', 'generate_card.py');

    const resolvedPhoto = resolveAsset(photo_url, 'photo', tmpDir, uid, projectRoot);
    const resolvedFp = resolveAsset(fingerprint_url, 'fp', tmpDir, uid, projectRoot);
    const resolvedSig = resolveAsset(signature_url, 'sig', tmpDir, uid, projectRoot);

    const photoArg = resolvedPhoto ? `--photo "${resolvedPhoto}"` : '';
    const fpArg = resolvedFp ? `--fingerprint "${resolvedFp}"` : '';
    const sigArg = resolvedSig ? `--signature "${resolvedSig}"` : '';

    const cmd = `python3 "${pyScript}" --json "${jsonPath}" --output "${outPath}" ${photoArg} ${fpArg} ${sigArg}`;

    await execAsync(cmd, { timeout: 60000 });

    if (!fs.existsSync(outPath)) {
      return NextResponse.json({ error: 'Card generation failed' }, { status: 500 });
    }

    const imgBuffer = fs.readFileSync(outPath);
    try { fs.unlinkSync(jsonPath); } catch {}
    try { fs.unlinkSync(outPath); } catch {}
    if (resolvedPhoto && resolvedPhoto.startsWith(tmpDir)) try { fs.unlinkSync(resolvedPhoto); } catch {}
    if (resolvedFp && resolvedFp.startsWith(tmpDir)) try { fs.unlinkSync(resolvedFp); } catch {}
    if (resolvedSig && resolvedSig.startsWith(tmpDir)) try { fs.unlinkSync(resolvedSig); } catch {}

    if (format === 'png') {
      return new NextResponse(imgBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${data.license_number || 'license'}_card.png"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const base64 = imgBuffer.toString('base64');
    return NextResponse.json({ success: true, image: `data:image/png;base64,${base64}` });
  } catch (err: any) {
    console.error('Generate route error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
