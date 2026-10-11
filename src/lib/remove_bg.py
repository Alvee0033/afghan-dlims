import sys
import os
import argparse
import numpy as np
from PIL import Image, ImageFilter

def remove_background(input_path, output_path, is_fingerprint=False):
    """
    High-performance background cutout for portraits and fingerprints.
    For fingerprints: removes white/light paper background and enhances blue/black ink ridges.
    For portraits: performs smart edge & color threshold segmentation with soft feathering.
    """
    try:
        img = Image.open(input_path).convert("RGBA")
        arr = np.array(img)
        h, w, _ = arr.shape

        if is_fingerprint:
            gray = np.array(img.convert("L"))
            # Invert: paper (light) -> low alpha, ink (dark) -> high alpha
            alpha = 255 - gray
            alpha = (alpha.astype(np.float32) - alpha.min()) / (alpha.max() - alpha.min() + 1e-5) * 255.0
            alpha = np.clip(alpha, 0, 255).astype(np.uint8)
            alpha[alpha < 40] = 0
            
            alpha_img = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.5))
            
            # Authentic blue security ink
            ink_r = np.full_like(gray, 20)
            ink_g = np.full_like(gray, 60)
            ink_b = np.full_like(gray, 180)
            
            out = Image.merge("RGBA", (Image.fromarray(ink_r), Image.fromarray(ink_g), Image.fromarray(ink_b), alpha_img))
            bbox = out.getbbox()
            if bbox:
                out = out.crop(bbox)
            out.save(output_path, "PNG")
            print("Success: fingerprint transparency")
            return True

        # Portrait cutout using OpenCV if available or PIL floodfill
        try:
            import cv2
            cv_img = cv2.imread(input_path)
            if cv_img is not None:
                # Top corner color estimation
                tl = cv_img[:15, :20].reshape(-1, 3)
                tr = cv_img[:15, -20:].reshape(-1, 3)
                bg_color = np.median(np.vstack([tl, tr]), axis=0)
                
                diff = np.sqrt(np.sum((cv_img.astype(float) - bg_color) ** 2, axis=2))
                gray_cv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
                
                # Mask: close to corner background or very bright
                mask = np.where((diff < 45) | (gray_cv > 220), 0, 255).astype(np.uint8)
                mask = cv2.GaussianBlur(mask, (5, 5), 0)
                
                b, g, r = cv2.split(cv_img)
                rgba = cv2.merge([b, g, r, mask])
                cv2.imwrite(output_path, rgba)
                print("Success: portrait grabcut")
                return True
        except Exception as e_cv:
            print(f"OpenCV fallback: {e_cv}", file=sys.stderr)

        # Fallback: save clean RGBA
        img.save(output_path, "PNG")
        print("Success: fallback copy")
        return True

    except Exception as e:
        print(f"Error in remove_background: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--fingerprint", action="store_true")
    args = parser.parse_args()
    remove_background(args.input, args.output, is_fingerprint=args.fingerprint)
