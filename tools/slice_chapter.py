#!/usr/bin/env python3
"""Crop named regions out of a textbook chapter PDF into PNGs, plus pull the
embedded text under each region (for hidden AI-tutor context, never shown in
the UI). Regions are given in PDF points (top-left origin), not pixels --
find them by rendering pages to PNG (render_pages) and reading text block
y-coordinates (dump_text_blocks), not by guessing from a screenshot.

Usage as a library: import and call slice_pdf(pdf_path, regions, out_dir).
"""
import sys
import json
import fitz

ZOOM = 3  # output render zoom (~216 DPI), independent of inspection zoom


def render_pages(pdf_path, out_dir, zoom=2):
    """Render every page to PNG at the given zoom, for visual inspection."""
    doc = fitz.open(pdf_path)
    paths = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        path = f"{out_dir}/page{i}.png"
        pix.save(path)
        paths.append(path)
    return paths


def dump_text_blocks(pdf_path):
    """Print y0/y1 + text for every block on every page, to find crop anchors."""
    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        print(f"--- page {i} ---")
        for b in page.get_text("blocks"):
            x0, y0, x1, y1, text = b[0], b[1], b[2], b[3], b[4]
            t = text.strip().replace("\n", " | ")[:70]
            if t:
                print(f"  y0={y0:6.1f} y1={y1:6.1f}  {t}")


def slice_pdf(pdf_path, regions, out_dir):
    """regions: list of {"name", "page" (0-indexed), "rect": [x0,y0,x1,y1] in pt}.
    Writes <out_dir>/<name>.png for each region and returns a dict of
    name -> {"image": "<name>.png", "text": "<extracted text>"}.
    """
    doc = fitz.open(pdf_path)
    result = {}
    for r in regions:
        page = doc[r["page"]]
        rect = fitz.Rect(*r["rect"])
        pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=rect)
        img_path = f"{out_dir}/{r['name']}.png"
        pix.save(img_path)
        text = page.get_text("text", clip=rect).strip()
        result[r["name"]] = {"image": f"{r['name']}.png", "text": text, "width": pix.width, "height": pix.height}
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: slice_chapter.py render <pdf> <out_dir> | blocks <pdf> | slice <pdf> <regions.json> <out_dir>")
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "render":
        render_pages(sys.argv[2], sys.argv[3])
    elif cmd == "blocks":
        dump_text_blocks(sys.argv[2])
    elif cmd == "slice":
        regions = json.load(open(sys.argv[3]))
        out = slice_pdf(sys.argv[2], regions, sys.argv[4])
        print(json.dumps(out, indent=2))
