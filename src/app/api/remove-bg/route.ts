import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const mode = (formData.get('mode') as string) || 'fingerprint';
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const tmpDir = os.tmpdir();
    const uid = `rmbg_${Date.now()}`;
    const inPath = path.join(tmpDir, `${uid}_in.png`);
    const outPath = path.join(tmpDir, `${uid}_out.png`);
    const arrayBuf = await file.arrayBuffer();
    fs.writeFileSync(inPath, Buffer.from(arrayBuf));

    const pyScript = path.join(process.cwd(), 'src', 'lib', 'remove_bg.py');
    await execAsync(`python3 "${pyScript}" --input "${inPath}" --output "${outPath}" --mode "${mode}"`, { timeout: 30000 });

    if (!fs.existsSync(outPath)) {
      return NextResponse.json({ error: 'Background removal failed' }, { status: 500 });
    }

    const imgBuffer = fs.readFileSync(outPath);
    const base64 = imgBuffer.toString('base64');
    try { fs.unlinkSync(inPath); } catch {}
    try { fs.unlinkSync(outPath); } catch {}

    return NextResponse.json({ success: true, image: `data:image/png;base64,${base64}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
