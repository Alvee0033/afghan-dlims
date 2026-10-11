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
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const tmpDir = os.tmpdir();
    const uid = `decode_${Date.now()}`;
    const imgPath = path.join(tmpDir, `${uid}.png`);
    const arrayBuf = await file.arrayBuffer();
    fs.writeFileSync(imgPath, Buffer.from(arrayBuf));

    const results: { type: string; data: string }[] = [];

    try {
      const { stdout } = await execAsync(`zbarimg --quiet --raw "${imgPath}"`, { timeout: 15000 });
      if (stdout.trim()) {
        stdout.trim().split('\n').filter(Boolean).forEach(line => {
          results.push({ type: 'auto', data: line.trim() });
        });
      }
    } catch {}

    if (results.length === 0) {
      const pyCode = `import json,sys\nfrom PIL import Image\nfrom pyzbar.pyzbar import decode\nimg=Image.open(sys.argv[1])\nout=[{"type":d.type,"data":d.data.decode("utf-8","replace")} for d in decode(img)]\nprint(json.dumps(out))`;
      const pyPath = path.join(tmpDir, `${uid}_d.py`);
      fs.writeFileSync(pyPath, pyCode);
      try {
        const { stdout } = await execAsync(`python3 "${pyPath}" "${imgPath}"`, { timeout: 15000 });
        const parsed = JSON.parse(stdout.trim() || '[]');
        results.push(...parsed);
      } catch {}
      try { fs.unlinkSync(pyPath); } catch {}
    }

    try { fs.unlinkSync(imgPath); } catch {}

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
