import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export interface CardData {
  name: string;
  district?: string;
  licence_no?: string;
  license_number?: string;
  dob?: string;
  issue_date?: string;
  blood_group?: string;
  validity?: string;
  allowed_vehicles?: string;
  valid_for?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Draw image with object-fit: cover — fills the box by cropping
 * instead of stretching, preserving the natural aspect ratio so photos never warp.
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number,
  w: number, h: number
) {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const boxAspect = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

  if (imgAspect > boxAspect) {
    // Image is wider than box → crop left/right
    sw = img.naturalHeight * boxAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    // Image is taller than box → crop top/bottom
    sh = img.naturalWidth / boxAspect;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

export async function renderLicenseCardClient(
  data: CardData,
  photoUrl?: string,
  fpUrl?: string,
  sigUrl?: string
): Promise<string> {
  const canvas = document.createElement('canvas');

  // Exact dimensions of templet.png
  canvas.width = 1792;
  canvas.height = 2400;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.textBaseline = 'top';

  // 1. Draw base template — exact 1792x2400
  try {
    const templateImg = await loadImage('/templet.png');
    ctx.drawImage(templateImg, 0, 0, 1792, 2400);
  } catch {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 1792, 2400);
  }

  // Text values
  const name       = (data.name || 'ULFAT YOUSAFZAI').toUpperCase();
  const district   = data.district || 'Ghazni';
  const dl_no      = data.licence_no || data.license_number || '1985-0198-09221';
  const dob        = data.dob || '03-01-1985';
  const issue_date = data.issue_date || '06-11-2020';
  const bld_group  = data.blood_group || 'B+ve';
  const exp_date   = data.validity || '05-11-2030';
  const valid_for  = data.allowed_vehicles || data.valid_for || 'Motor Cycle/ M Car Jeep';

  const fontFamily = '"Arial", "Liberation Sans", sans-serif';

  // --- FRONT CARD ---

  // 1. Name
  ctx.fillStyle = '#141414';
  ctx.font = `bold 64px ${fontFamily}`;
  ctx.fillText(name, 672, 420 + 11);

  // 2. District — perfectly aligned with pre-printed "District:" label
  ctx.font = `bold 48px ${fontFamily}`;
  ctx.fillText(district, 865, 506);

  // 3. DL NO : Red Number
  ctx.fillStyle = '#141414';
  ctx.font = `bold 45px ${fontFamily}`;
  ctx.fillText('DL NO : ', 672, 590);
  const dlLabelWidth = ctx.measureText('DL NO : ').width;

  ctx.fillStyle = '#b91c1c';
  ctx.font = `bold 50px ${fontFamily}`;
  ctx.fillText(dl_no, 672 + dlLabelWidth + 15, 587);

  // 4. Date values
  ctx.fillStyle = '#141414';
  ctx.font = `bold 45px ${fontFamily}`;
  ctx.fillText(dob,        1130, 672 + 8);
  ctx.fillText(issue_date, 1130, 727 + 8);
  ctx.fillText(bld_group,  1130, 780 + 8);
  ctx.fillText(exp_date,   1130, 834 + 8);

  // 5. Photos with cover-fit (prevents warping)
  const photoSrc = photoUrl || '/images/sample_photo_clean.png';
  try {
    const photoImg = await loadImage(photoSrc);
    drawImageCover(ctx, photoImg, 160, 360, 390, 485);
    drawImageCover(ctx, photoImg, 1475, 335, 190, 235);
  } catch {}

  // 6. Fingerprint (240, 865, 210x155)
  const fpSrc = fpUrl || '/images/sample_fingerprint_transparent.png';
  try {
    const fpImg = await loadImage(fpSrc);
    ctx.drawImage(fpImg, 240, 865, 210, 155);
  } catch {}

  // 7. Authority Signature (1030, 930, 190x100)
  const sigSrc = sigUrl || '/images/sample_authority_sig.png';
  try {
    const sigImg = await loadImage(sigSrc);
    ctx.drawImage(sigImg, 1030, 930, 190, 100);
  } catch {}

  // --- BACK CARD ---

  // 8. Vehicle Category
  ctx.fillStyle = '#141414';
  ctx.font = `bold 54px ${fontFamily}`;
  ctx.fillText(valid_for, 545, 1990 + 9);

  // 9. QR Code — contains ONLY the verification link so scanning with phone camera opens the browser directly
  try {
    const clean_dl = dl_no.trim().replace(/\s+/g, '').replace(/-/g, '');
    const verifyUrl = `http://www.dlimss.com/afghan/${encodeURIComponent(clean_dl)}`;
    const qrUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 340,
      errorCorrectionLevel: 'M',
    });
    const qrImg = await loadImage(qrUrl);
    ctx.drawImage(qrImg, 1240, 1700, 340, 340);
  } catch {}

  // 10. Barcode
  try {
    const bcCanvas = document.createElement('canvas');
    const cleanCode = dl_no.replace(/[-\s]/g, '').toUpperCase() || '1985019809221';
    JsBarcode(bcCanvas, cleanCode, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: 3,
      height: 95,
    });
    ctx.drawImage(bcCanvas, 800, 2210, 780, 95);
  } catch {}

  return canvas.toDataURL('image/png');
}
