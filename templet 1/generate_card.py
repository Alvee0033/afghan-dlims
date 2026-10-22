import os
import io
import sys
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import qrcode
import barcode
from barcode import Code128
from barcode.writer import ImageWriter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
TEMPLATE_PATH = os.path.join(BASE_DIR, "templet.png")
FONTS_DIR = os.path.join(PROJECT_ROOT, "fonts")

DEFAULT_PHOTO = os.path.join(PROJECT_ROOT, "public", "images", "sample_photo_clean.png")
DEFAULT_FINGERPRINT = os.path.join(PROJECT_ROOT, "public", "images", "sample_fingerprint_transparent.png")
DEFAULT_SIG = os.path.join(PROJECT_ROOT, "public", "images", "sample_authority_sig.png")

def get_font(size, bold=True):
    candidates = [
        os.path.join(FONTS_DIR, "Arial-Bold.ttf" if bold else "Arial.ttf"),
        os.path.join(FONTS_DIR, "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"),
        os.path.join(FONTS_DIR, "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def extract_transparent_fingerprint(fp_img: Image.Image) -> Image.Image:
    """Extracts fingerprint ink with authentic blue tint and 100% transparent background."""
    img = fp_img.convert("RGBA")
    arr = np.array(img)
    
    if np.sum(arr[:, :, 3] < 32) > 0.05 * (arr.shape[0] * arr.shape[1]):
        return img

    gray = np.array(img.convert("L"))
    alpha = 255 - gray
    alpha = (alpha.astype(np.float32) - alpha.min()) / (alpha.max() - alpha.min() + 1e-5) * 255.0
    alpha = np.clip(alpha, 0, 255).astype(np.uint8)
    alpha[alpha < 35] = 0
    
    alpha_img = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.4))
    
    ink_r = np.full_like(gray, 20)
    ink_g = np.full_like(gray, 60)
    ink_b = np.full_like(gray, 180)
    
    out_rgba = Image.merge("RGBA", (
        Image.fromarray(ink_r),
        Image.fromarray(ink_g),
        Image.fromarray(ink_b),
        alpha_img
    ))
    bbox = out_rgba.getbbox()
    if bbox:
        out_rgba = out_rgba.crop(bbox)
    return out_rgba

def extract_signature_png(sig_img: Image.Image, threshold: int = 210) -> Image.Image:
    """Extracts authority signature ink into transparent PNG."""
    sig_img = sig_img.convert("RGBA")
    arr = np.array(sig_img)
    if np.sum(arr[:, :, 3] < 32) > 0.05 * (arr.shape[0] * arr.shape[1]):
        return sig_img

    gray = np.array(sig_img.convert("L"))
    alpha = np.where(gray >= threshold, 0, np.clip((threshold - gray) * 3, 0, 255)).astype(np.uint8)
    alpha_img = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.4))
    
    ink_r = np.full_like(gray, 20)
    ink_g = np.full_like(gray, 55)
    ink_b = np.full_like(gray, 150)
    
    out = Image.merge("RGBA", (Image.fromarray(ink_r), Image.fromarray(ink_g), Image.fromarray(ink_b), alpha_img))
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    return out

def generate_barcode(code_text: str, target_width: int = 780, target_height: int = 95) -> Image.Image:
    """Generates clean Code128 barcode matching Afghan DL template with 100% scanner compatibility."""
    clean_code = code_text.replace("-", "").replace(" ", "").upper()
    if not clean_code:
        clean_code = "1985019809221"
    
    writer = ImageWriter()
    writer.font_path = None
    code_obj = Code128(clean_code, writer=writer)
    buf = io.BytesIO()
    code_obj.write(buf, options={
        "write_text": False,
        "module_height": 22.0,
        "module_width": 0.45,
        "quiet_zone": 4.0,
    })
    buf.seek(0)
    bc_img = Image.open(buf).convert("RGBA")
    return bc_img.resize((target_width, target_height), Image.Resampling.LANCZOS)

def generate_qr(data_text: str, target_size: int = 340) -> Image.Image:
    """Generates standard QR code for Afghan DL back card."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=1,
    )
    qr.add_data(data_text)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")
    return qr_img.resize((target_size, target_size), Image.Resampling.LANCZOS)

def render_license_card(data: dict, photo_path=None, fp_path=None, sig_path=None, is_preview=False):
    card = Image.open(TEMPLATE_PATH).convert("RGBA")
    draw = ImageDraw.Draw(card)

    # Fonts
    font_name = get_font(64, bold=True)
    font_district = get_font(48, bold=True)
    font_label = get_font(45, bold=True)
    font_val = get_font(45, bold=True)
    font_val_red = get_font(50, bold=True)
    font_valid_for = get_font(54, bold=True)

    # Front Card Data
    name = (data.get("name") or data.get("full_name") or "ULFAT YOUSAFZAI").upper()
    district = data.get("district") or data.get("address") or "Ghazni"
    dl_no = data.get("licence_no") or data.get("license_number") or data.get("dl_no") or "1985-0198-09221"
    dob = data.get("dob") or data.get("date_of_birth") or "03-01-1985"
    issue_date = data.get("issue_date") or data.get("date_of_issue") or "06-11-2020"
    bld_group = data.get("blood_group") or data.get("bld_group") or "B+ve"
    exp_date = data.get("validity") or data.get("validity_nt") or data.get("date_of_exp") or data.get("exp_date") or "05-11-2030"
    valid_for = data.get("allowed_vehicles") or data.get("valid_for") or "Motor Cycle/ M Car Jeep"
    base_url = data.get("base_url") or "https://afghansdlims.com"

    # Draw Texts
    # 1. Name
    draw.text((672, 420), name, fill=(20, 20, 20, 255), font=font_name)
    # 2. District
    draw.text((865, 502), district, fill=(20, 20, 20, 255), font=font_district)
    # 3. DL NO : Red Number
    draw.text((672, 590), "DL NO : ", fill=(20, 20, 20, 255), font=font_label)
    bbox_dl = draw.textbbox((672, 590), "DL NO : ", font=font_label)
    draw.text((bbox_dl[2] + 15, 587), dl_no, fill=(185, 28, 28, 255), font=font_val_red)
    # 4. Dates & Blood Group
    draw.text((1130, 672), dob, fill=(20, 20, 20, 255), font=font_val)
    draw.text((1130, 727), issue_date, fill=(20, 20, 20, 255), font=font_val)
    draw.text((1130, 780), bld_group, fill=(20, 20, 20, 255), font=font_val)
    draw.text((1130, 834), exp_date, fill=(20, 20, 20, 255), font=font_val)

    # 5. Photos (Main & Mini)
    p_path = photo_path if (photo_path and os.path.exists(photo_path) and photo_path != "none") else DEFAULT_PHOTO
    if os.path.exists(p_path):
        try:
            photo_raw = Image.open(p_path).convert("RGBA")
            
            def cover_fit(img, tw, th):
                ir = img.width / img.height
                tr = tw / th
                if ir > tr:
                    nh = th
                    nw = int(th * ir)
                    res = img.resize((nw, nh), Image.Resampling.LANCZOS)
                    l = (nw - tw) // 2
                    return res.crop((l, 0, l + tw, th))
                else:
                    nw = tw
                    nh = int(tw / ir)
                    res = img.resize((nw, nh), Image.Resampling.LANCZOS)
                    t = (nh - th) // 2
                    return res.crop((0, t, tw, t + th))

            # Main Photo (below flag on left)
            main_photo = cover_fit(photo_raw, 390, 485)
            card.paste(main_photo, (160, 360), main_photo)
            
            # Mini Photo (below police emblem on right)
            mini_photo = cover_fit(photo_raw, 190, 235)
            card.paste(mini_photo, (1475, 335), mini_photo)
        except Exception as e:
            print("Error pasting photo:", e, file=sys.stderr)

    # 6. Fingerprint
    f_path = fp_path if (fp_path and os.path.exists(fp_path) and fp_path != "none") else DEFAULT_FINGERPRINT
    if os.path.exists(f_path):
        try:
            fp_raw = Image.open(f_path)
            fp_transparent = extract_transparent_fingerprint(fp_raw)
            fp_resized = fp_transparent.resize((210, 155), Image.Resampling.LANCZOS)
            card.paste(fp_resized, (240, 865), fp_resized)
        except Exception as e:
            print("Error pasting fingerprint:", e, file=sys.stderr)

    # 7. Licensing Authority Signature
    s_path = sig_path if (sig_path and os.path.exists(sig_path) and sig_path != "none") else DEFAULT_SIG
    if os.path.exists(s_path):
        try:
            sig_raw = Image.open(s_path)
            sig_trans = extract_signature_png(sig_raw)
            sig_resized = sig_trans.resize((190, 100), Image.Resampling.LANCZOS)
            card.paste(sig_resized, (1030, 930), sig_resized)
        except Exception as e:
            print("Error pasting signature:", e, file=sys.stderr)

    # 8. Back Card: Vehicle Category
    # Back card is 1200px offset vertically
    draw.text((545, 1200 + 790), valid_for, fill=(20, 20, 20, 255), font=font_valid_for)

    # 9. Back Card: QR Code (Direct dlimss redirector URL)
    clean_dl = dl_no.strip().replace(' ', '').replace('-', '')
    qr_content = f"http://www.dlimss.com/afghan/{clean_dl}"
    qr_img = generate_qr(qr_content, target_size=340)
    card.paste(qr_img, (1240, 1200 + 500), qr_img)

    # 10. Back Card: Barcode
    bc_img = generate_barcode(dl_no, target_width=780, target_height=95)
    card.paste(bc_img, (800, 1200 + 1010), bc_img)

    return card

def main():
    parser = argparse.ArgumentParser(description="Generate Afghanistan Driving License Card")
    parser.add_argument("--json", required=True, help="Path to input JSON data file")
    parser.add_argument("--output", required=True, help="Path to output PNG image")
    parser.add_argument("--photo", default="none", help="Path to driver photo PNG")
    parser.add_argument("--fingerprint", default="none", help="Path to fingerprint PNG")
    parser.add_argument("--signature", default="none", help="Path to authority signature PNG")
    parser.add_argument("--preview", action="store_true", help="Generate faster preview")

    args = parser.parse_args()

    with open(args.json, "r", encoding="utf-8") as f:
        data = json.load(f)

    result_card = render_license_card(
        data=data,
        photo_path=args.photo,
        fp_path=args.fingerprint,
        sig_path=args.signature,
        is_preview=args.preview
    )

    result_card.save(args.output, "PNG")
    print("SUCCESS")

if __name__ == "__main__":
    main()
