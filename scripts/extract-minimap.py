#!/usr/bin/env python3
"""
Extract Rockstar GTA V minimap satellite textures into one stitched JPG.

Input:  docs/map-original/minimap_{row}_{col}.ytd  (6 tiles, 3×2 grid)
        — extracted from a K-SatelliteMap-style mod's scaleform_generic.rpf via OpenIV.
Output: docs/clean-map.jpg  (8192 × 12288 stitched satellite, RGB JPEG q=90)

Pipeline:
    .ytd file
      → strip 16-byte RSC7 header, raw-deflate-decompress the rest (zlib wbits=-15)
      → take last 16,777,216 bytes (the gfx memory section; first 8 KB is metadata)
      → interpret as 4096×4096 BC3 (DXT5) compressed pixel data
      → decode BC3 → BGRA via texture2ddecoder
      → assemble into PIL Image
      → paste each tile into 8192×12288 canvas at (col*4096, row*4096)

GTA world ↔ image mapping (uniform linear, no calibration):
    norm_x = (gta_x + 4000) / 8000
    norm_y = (8000 - gta_y) / 12000
    image_px  = (gta_x + 4000) * 1.024
    image_py  = (8000 - gta_y) * 1.024

Requires:  pip install pillow texture2ddecoder
Run:       python3 scripts/extract-minimap.py
"""
import os
import sys
import zlib
from pathlib import Path

try:
    import texture2ddecoder as t2d  # type: ignore
    from PIL import Image
except ImportError:
    print("Missing deps. Run: pip install pillow texture2ddecoder", file=sys.stderr)
    sys.exit(1)

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "docs" / "map-original"
OUT_PATH = ROOT / "docs" / "clean-map.jpg"

TILE = 4096                      # texture size per tile
BC3_BYTES = TILE * TILE          # 16 MB (BC3 = 1 byte/pixel)
ROWS, COLS = 3, 2                # 3 rows north→south, 2 cols west→east


def extract_tile(ytd_path: Path) -> Image.Image:
    """Decompress an .ytd file and return its 4096×4096 BC3 texture as a PIL Image."""
    data = ytd_path.read_bytes()
    if data[:4] != b"RSC7":
        raise ValueError(f"{ytd_path.name}: missing RSC7 magic")
    payload = data[16:]
    decomp = zlib.decompress(payload, -15)  # raw deflate
    raw = decomp[-BC3_BYTES:]
    rgba = t2d.decode_bc3(raw, TILE, TILE)
    return Image.frombuffer("RGBA", (TILE, TILE), rgba, "raw", "BGRA", 0, 1)


def main() -> None:
    if not SRC_DIR.is_dir():
        print(f"Missing input directory: {SRC_DIR}", file=sys.stderr)
        sys.exit(1)

    canvas = Image.new("RGB", (COLS * TILE, ROWS * TILE), (10, 60, 100))
    for row in range(ROWS):
        for col in range(COLS):
            tile_path = SRC_DIR / f"minimap_{row}_{col}.ytd"
            if not tile_path.exists():
                print(f"  MISSING {tile_path.name}", file=sys.stderr)
                continue
            tile = extract_tile(tile_path)
            canvas.paste(tile, (col * TILE, row * TILE), tile)
            print(f"  OK      {tile_path.name}")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT_PATH, "JPEG", quality=90, optimize=True)
    size_mb = OUT_PATH.stat().st_size / 1e6
    print(f"\nWrote {OUT_PATH} ({canvas.size[0]}×{canvas.size[1]}, {size_mb:.1f} MB)")
    print("Next: node scripts/generate-tiles.mjs")


if __name__ == "__main__":
    main()
