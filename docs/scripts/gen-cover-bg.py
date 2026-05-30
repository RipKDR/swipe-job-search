#!/usr/bin/env python3
"""
Generate cover backgrounds for the Swipe Job Search Prompt Collection.
Uses Playwright + SVG technique: HTML/SVG rendered as PNG at 2x.

Run: python3 docs/scripts/gen-cover-bg.py

Output: docs/scripts/output/<name>.png

Covers are A4-sized (794×1123 px) suitable for DOCX cover pages.
"""

import subprocess
import os

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

# ── Document 1: Product Strategy & Market Differentiation ──
BG1_HTML = """
<!DOCTYPE html>
<html><head><style>body{margin:0;padding:0;width:794px;height:1123px;overflow:hidden;}</style></head>
<body>
<svg width="794" height="1123" viewBox="0 0 794 1123" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1B2A4A"/>
      <stop offset="50%" stop-color="#243B5D"/>
      <stop offset="100%" stop-color="#2D4A6F"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#D4A843" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="80"/></filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="40"/></filter>
  </defs>
  <rect width="794" height="1123" fill="url(#g1)"/>
  <circle cx="600" cy="200" r="300" fill="#D4A843" opacity="0.08" filter="url(#blur)"/>
  <circle cx="100" cy="900" r="250" fill="#4A90A4" opacity="0.10" filter="url(#blur)"/>
  <ellipse cx="700" cy="950" rx="200" ry="150" fill="#D4A843" opacity="0.06" filter="url(#blur2)"/>
  <path d="M0 800 Q 200 700, 400 850 T 794 750" fill="none" stroke="#D4A843" stroke-width="1" opacity="0.12"/>
  <path d="M0 880 Q 250 780, 500 920 T 794 820" fill="none" stroke="#D4A843" stroke-width="1" opacity="0.08"/>
  <rect width="794" height="1123" fill="url(#g2)"/>
  <rect x="60" y="60" width="674" height="1003" fill="none" stroke="#D4A843" stroke-width="1" opacity="0.18" rx="4"/>
</svg>
</body></html>
"""

# ── Document 2: Technical Architecture & Implementation ──
BG2_HTML = """
<!DOCTYPE html>
<html><head><style>body{margin:0;padding:0;width:794px;height:1123px;overflow:hidden;}</style></head>
<body>
<svg width="794" height="1123" viewBox="0 0 794 1123" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A1F2E"/>
      <stop offset="50%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#273449"/>
    </linearGradient>
    <linearGradient id="g2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2DD4BF" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#2DD4BF" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="70"/></filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="35"/></filter>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2DD4BF" stroke-width="0.3" opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="794" height="1123" fill="url(#g1)"/>
  <rect width="794" height="1123" fill="url(#grid)"/>
  <circle cx="200" cy="300" r="280" fill="#2DD4BF" opacity="0.07" filter="url(#blur)"/>
  <circle cx="650" cy="750" r="320" fill="#0E7490" opacity="0.08" filter="url(#blur)"/>
  <ellipse cx="400" cy="1100" rx="300" ry="180" fill="#2DD4BF" opacity="0.05" filter="url(#blur2)"/>
  <rect x="80" y="80" width="634" height="963" fill="none" stroke="#2DD4BF" stroke-width="0.8" opacity="0.14" rx="2"/>
  <rect x="95" y="95" width="604" height="933" fill="none" stroke="#2DD4BF" stroke-width="0.4" opacity="0.08" rx="1"/>
</svg>
</body></html>
"""

# ── Document 3: AI Model System Prompts & Development Workflows ──
BG3_HTML = """
<!DOCTYPE html>
<html><head><style>body{margin:0;padding:0;width:794px;height:1123px;overflow:hidden;}</style></head>
<body>
<svg width="794" height="1123" viewBox="0 0 794 1123" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1B2E"/>
      <stop offset="50%" stop-color="#2D2654"/>
      <stop offset="100%" stop-color="#3D3470"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#B8954F" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="90"/></filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="45"/></filter>
  </defs>
  <rect width="794" height="1123" fill="url(#g1)"/>
  <circle cx="500" cy="150" r="350" fill="#7C6FBA" opacity="0.08" filter="url(#blur)"/>
  <circle cx="100" cy="850" r="280" fill="#D4A843" opacity="0.06" filter="url(#blur)"/>
  <circle cx="700" cy="600" r="200" fill="#9F8FE0" opacity="0.07" filter="url(#blur2)"/>
  <polygon points="60,60 734,60 734,1063 60,1063" fill="none" stroke="#D4A843" stroke-width="1" opacity="0.14"/>
  <polygon points="75,75 719,75 719,1048 75,1048" fill="none" stroke="#7C6FBA" stroke-width="0.5" opacity="0.10"/>
  <rect width="794" height="1123" fill="url(#g2)"/>
</svg>
</body></html>
"""

# ── Shared body background (subtle, clean) ──
BODY_HTML = """
<!DOCTYPE html>
<html><head><style>body{margin:0;padding:0;width:794px;height:1123px;overflow:hidden;}</style></head>
<body>
<svg width="794" height="1123" viewBox="0 0 794 1123" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FAFBFC"/>
      <stop offset="100%" stop-color="#F5F7F9"/>
    </linearGradient>
  </defs>
  <rect width="794" height="1123" fill="url(#bg)"/>
  <rect x="0" y="0" width="4" height="1123" fill="#D4A843" opacity="0.25"/>
</svg>
</body></html>
"""


def render_svg_to_png(name: str, html: str, output_dir: str):
    """Write SVG HTML to file and render it to PNG via Playwright."""
    os.makedirs(output_dir, exist_ok=True)
    html_path = os.path.join(output_dir, f"{name}.html")
    png_path = os.path.join(output_dir, f"{name}.png")

    with open(html_path, "w") as f:
        f.write(html.strip())

    print(f"Rendering {name}...")
    subprocess.run(
        [
            "python3",
            "-c",
            f'''
import subprocess, sys
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={{"width": 794, "height": 1123}})
    page.goto("file://{html_path}")
    page.screenshot(path="{png_path}", clip={{"x": 0, "y": 0, "width": 794, "height": 1123}}, scale="css")
    browser.close()
print("Done: {png_path}")
''',
        ],
        check=True,
    )
    return png_path


def main():
    docs = [
        ("doc1_cover_bg", BG1_HTML, "Product Strategy"),
        ("doc2_cover_bg", BG2_HTML, "Technical Architecture"),
        ("doc3_cover_bg", BG3_HTML, "AI Prompts"),
        ("body_bg", BODY_HTML, "Body pages"),
    ]

    print(f"Output directory: {OUTPUT_DIR}")
    for name, html, label in docs:
        png_path = render_svg_to_png(name, html, OUTPUT_DIR)
        print(f"  ✓ {label} → {png_path}")

    print(f"\nAll backgrounds generated in {OUTPUT_DIR}/")
    print("To use in DOCX: Insert → Picture → Select PNG")
    print("  - doc1_cover_bg.png → Document 1 cover")
    print("  - doc2_cover_bg.png → Document 2 cover")
    print("  - doc3_cover_bg.png → Document 3 cover")
    print("  - body_bg.png       → Body page background")


if __name__ == "__main__":
    main()
