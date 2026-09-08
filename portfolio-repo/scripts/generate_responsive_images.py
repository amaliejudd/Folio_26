#!/usr/bin/env python3
"""
Generate responsive width-variants for one or more images in assets/, and
print ready-to-paste <img> markup using them.

Usage:
    python3 scripts/generate_responsive_images.py assets/some-photo.jpg
    python3 scripts/generate_responsive_images.py assets/*.jpg

For each image, writes <name>-640.jpg, <name>-1024.jpg, <name>-1600.jpg
next to the original (skipping any width larger than the source image),
all at quality 82. Leaves the original file untouched — it's still what
srcset falls back to on browsers that don't support it.

Requires Pillow: pip install --break-system-packages pillow
"""
import sys
import os
from PIL import Image

WIDTHS = [640, 1024, 1600]


def process(path):
    base, ext = os.path.splitext(path)
    with Image.open(path) as img:
        img = img.convert("RGB") if img.mode in ("RGBA", "P") else img
        src_w, src_h = img.size
        made = []
        for w in WIDTHS:
            if w >= src_w:
                continue
            h = round(src_h * (w / src_w))
            resized = img.resize((w, h), Image.LANCZOS)
            out_path = f"{base}-{w}{ext}"
            resized.save(out_path, quality=82, optimize=True)
            made.append((w, out_path))

    name = os.path.basename(path)
    srcset_parts = ", ".join(f"{os.path.basename(p)} {w}w" for w, p in made) or "(source already small — no variants generated)"
    if made:
        srcset_parts += f", {name} {src_w}w"

    print(f"\n{path}  ({src_w}x{src_h})")
    for w, p in made:
        print(f"  wrote {p}")
    print("  paste:")
    print(f'  <img src="{name}" srcset="{srcset_parts}" sizes="(max-width: 720px) 100vw, 800px" alt="…" loading="lazy" decoding="async">')


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for p in sys.argv[1:]:
        process(p)
