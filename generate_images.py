#!/usr/bin/env python3
"""
Placeholder image generator for the 3D photo wall.

Generates a set of colourful, distinct placeholder "photos" so the Three.js
photo wall has something to display before real images are dropped in.

Usage:
    py generate_images.py            # generate the default 30 images
    py generate_images.py --count 40 --size 600 800

Requires: Pillow  ->  py -m pip install pillow
"""

import argparse
import colorsys
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")

# Golden-ratio conjugate: stepping the hue by this gives pleasantly spread,
# never-repeating colours across the whole set.
GOLDEN_RATIO_CONJUGATE = 0.61803398875


def hsv_to_rgb(h, s, v):
    r, g, b = colorsys.hsv_to_rgb(h % 1.0, s, v)
    return (int(r * 255), int(g * 255), int(b * 255))


def load_font(size):
    """Try a few common fonts, fall back to Pillow's default bitmap font."""
    candidates = [
        "arialbd.ttf", "Arial_Bold.ttf", "arial.ttf",
        "DejaVuSans-Bold.ttf", "DejaVuSans.ttf",
        "seguisb.ttf", "segoeui.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def diagonal_gradient(size, color_a, color_b):
    """A smooth corner-to-corner (diagonal) gradient image."""
    w, h = size
    base = Image.new("RGB", size, color_a)
    top = Image.new("RGB", size, color_b)
    mask = Image.new("L", size)
    mask_px = mask.load()
    max_d = (w - 1) + (h - 1)
    for y in range(h):
        for x in range(w):
            mask_px[x, y] = int(255 * (x + y) / max_d)
    base.paste(top, (0, 0), mask)
    return base


def add_decoration(draw, size, accent, seed):
    """Draw a few translucent geometric shapes so each image feels unique."""
    w, h = size
    overlay_rng = [(seed * 9301 + 49297) % 233280 / 233280.0]

    def rnd():
        overlay_rng[0] = (overlay_rng[0] * 9301 + 0.49297) % 1.0
        return overlay_rng[0]

    for _ in range(3):
        r = int(min(w, h) * (0.18 + 0.22 * rnd()))
        cx = int(rnd() * w)
        cy = int(rnd() * h)
        alpha = int(28 + 34 * rnd())
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            outline=accent + (alpha + 40,),
            width=max(2, r // 22),
        )


def vignette(img, strength=0.55):
    """Darken the corners for a photographic feel."""
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([-w * 0.2, -h * 0.2, w * 1.2, h * 1.2], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=min(w, h) * 0.12))
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    return Image.composite(img, dark, mask.point(lambda p: int(p * (1 - (1 - strength)) + 255 * (1 - strength))))


def make_image(index, count, size):
    w, h = size
    hue = (0.08 + index * GOLDEN_RATIO_CONJUGATE) % 1.0
    color_a = hsv_to_rgb(hue, 0.62, 0.95)
    color_b = hsv_to_rgb((hue + 0.10) % 1.0, 0.80, 0.55)
    accent = hsv_to_rgb((hue + 0.5) % 1.0, 0.35, 1.0)

    img = diagonal_gradient(size, color_a, color_b)

    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    add_decoration(od, size, accent, index + 1)
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    img = vignette(img, strength=0.62)

    draw = ImageDraw.Draw(img)

    # Big index number, centred.
    num = f"{index + 1:02d}"
    num_font = load_font(int(h * 0.34))
    nb = draw.textbbox((0, 0), num, font=num_font)
    nx = (w - (nb[2] - nb[0])) / 2 - nb[0]
    ny = (h - (nb[3] - nb[1])) / 2 - nb[1] - h * 0.03
    # soft shadow
    draw.text((nx + 4, ny + 5), num, font=num_font, fill=(0, 0, 0))
    draw.text((nx, ny), num, font=num_font, fill=(255, 255, 255))

    # Caption under the number.
    label = "PHOTO"
    lbl_font = load_font(int(h * 0.065))
    lb = draw.textbbox((0, 0), label, font=lbl_font)
    lx = (w - (lb[2] - lb[0])) / 2 - lb[0]
    ly = ny + (nb[3] - nb[1]) + h * 0.04
    draw.text((lx, ly), label, font=lbl_font, fill=(255, 255, 255))

    # Thin inner border frame.
    m = int(min(w, h) * 0.045)
    draw.rectangle([m, m, w - m, h - m], outline=(255, 255, 255), width=max(2, int(min(w, h) * 0.008)))

    return img


def main():
    ap = argparse.ArgumentParser(description="Generate placeholder photos for the 3D wall.")
    ap.add_argument("--count", type=int, default=30, help="number of images to generate")
    ap.add_argument("--size", type=int, nargs=2, default=[600, 750],
                    metavar=("W", "H"), help="image size in pixels")
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    size = (args.size[0], args.size[1])

    for i in range(args.count):
        img = make_image(i, args.count, size)
        path = os.path.join(OUT_DIR, f"photo_{i + 1:02d}.png")
        img.save(path, "PNG")
        print(f"  wrote {os.path.relpath(path, os.path.dirname(OUT_DIR))}")

    print(f"\nDone. Generated {args.count} images ({size[0]}x{size[1]}) in {OUT_DIR}")


if __name__ == "__main__":
    main()
