#!/usr/bin/env python3
"""
Regenerates every brand image from the source artwork in src/assets/logo.png
(full-color logo on a white background). Run after changing that file:

    python3 scripts/brand-assets.py          (needs Pillow: pip install pillow)

Writes:
  public/brand/logo.png        logo for light surfaces (transparent background)
  public/brand/logo-dark.png   logo for dark surfaces: navy and the superscript in white,
                               the blue calendar accents kept
  public/brand/icon-*.png      app icons (16, 32, 48, 180, 192, 512, maskable 512) from the
                               mark (the symbol left of the wordmark) on a navy tile
  src/app/favicon.ico          16/32/48 favicon
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'src/assets/logo.png'
BRAND = ROOT / 'public/brand'
WHITE = (246, 247, 251)

FLOOR = 0.07  # background noise below this opacity is dropped


def smooth(t: float) -> float:
    return 0.0 if t <= 0 else 1.0 if t >= 1 else t * t * (3 - 2 * t)


def separate(image: Image.Image):
    """
    Color-to-alpha against white: each pixel keeps its color but loses the white it was
    mixed with, so anti-aliased edges work on any background. Returns (light, dark) RGBA
    images: dark has navy turned white (smoothly, no speckles) and pale tints made more
    opaque so the light-blue calendar squares still read on dark backgrounds.
    """
    rgb = image.convert('RGB')
    w, h = rgb.size
    src = rgb.load()
    light, dark = Image.new('RGBA', (w, h)), Image.new('RGBA', (w, h))
    lp, dp = light.load(), dark.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            raw = max(255 - r, 255 - g, 255 - b) / 255
            if raw <= FLOOR:
                lp[x, y] = dp[x, y] = (0, 0, 0, 0)
                continue
            unmix = [max(0, min(255, round((c - (1 - raw) * 255) / raw))) for c in (r, g, b)]
            alpha = min(1.0, (raw - FLOOR) / (1 - FLOOR))
            lp[x, y] = (*unmix, round(alpha * 255))
            # Navy (luminance ~30) -> white, blended between 40 and 70; blue (~90) stays.
            lum = 0.2126 * unmix[0] + 0.7152 * unmix[1] + 0.0722 * unmix[2]
            t = smooth((70 - lum) / 30)
            color = [round(c + (wc - c) * t) for c, wc in zip(unmix, WHITE)]
            dark_alpha = alpha
            if t < 0.5 and raw < 0.4:  # pale tints: more opaque, a bit lighter
                dark_alpha = min(1.0, alpha * 3)
                color = [round(c + (wc - c) * 0.35) for c, wc in zip(color, WHITE)]
            dp[x, y] = (*color, round(dark_alpha * 255))
    return light, dark


def column_runs(image: Image.Image, top: int, bottom: int, min_gap: int):
    """Horizontal extents of the shapes in rows [top, bottom), split by empty columns."""
    alpha = image.getchannel('A').load()
    w = image.size[0]
    filled = [any(alpha[x, y] > 40 for y in range(top, bottom)) for x in range(w)]
    runs, start, gap = [], None, 0
    for x, on in enumerate(filled):
        if on:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                runs.append((start, x - gap + 1))
                start, gap = None, 0
    if start is not None:
        runs.append((start, w))
    return runs


def whiten_superscript(dark: Image.Image):
    """The superscript (the shape right of the closing bracket, in the top half) -> white."""
    w, h = dark.size
    top_half = column_runs(dark, 0, h // 2, min_gap=4)
    x0, x1 = top_half[-1]
    pixels = dark.load()
    for y in range(h):
        for x in range(x0, x1):
            r, g, b, a = pixels[x, y]
            if a:
                pixels[x, y] = (*WHITE, a)


def navy_of(light: Image.Image):
    """The logo's navy: the most common clearly-dark opaque color."""
    counts = {}
    for r, g, b, a in light.getdata():
        if a > 240 and 0.2126 * r + 0.7152 * g + 0.0722 * b < 60:
            key = (r // 4 * 4, g // 4 * 4, b // 4 * 4)
            counts[key] = counts.get(key, 0) + 1
    return max(counts, key=counts.get) if counts else (12, 30, 78)


def tile(mark: Image.Image, size: int, navy, padding: float, rounded: bool):
    """The mark centered on a navy square (rounded for browser tabs, full-bleed otherwise)."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    background = Image.new('RGBA', (size, size), (*navy, 255))
    shape = Image.new('L', (size, size), 0)
    radius = round(size * 0.22) if rounded else 0
    ImageDraw.Draw(shape).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    canvas.paste(background, (0, 0), shape)
    room = round(size * (1 - 2 * padding))
    scale = min(room / mark.size[0], room / mark.size[1])
    scaled = mark.resize((max(1, round(mark.size[0] * scale)), max(1, round(mark.size[1] * scale))), Image.LANCZOS)
    canvas.alpha_composite(scaled, ((size - scaled.size[0]) // 2, (size - scaled.size[1]) // 2))
    return canvas


def main():
    light, dark = separate(Image.open(SOURCE))
    left, top, right, bottom = light.getbbox()
    pad = 6
    box = (max(0, left - pad), max(0, top - pad), min(light.size[0], right + pad), min(light.size[1], bottom + pad))
    light, dark = light.crop(box), dark.crop(box)
    whiten_superscript(dark)
    light.save(BRAND / 'logo.png', optimize=True)
    dark.save(BRAND / 'logo-dark.png', optimize=True)

    # The mark: the first shape group from the left (the symbol before the wordmark).
    w, h = dark.size
    x0, x1 = column_runs(dark, 0, h, min_gap=12)[0]
    mark = dark.crop((x0, 0, x1, h))
    mark = mark.crop(mark.getbbox())
    navy = navy_of(light)

    for size in (16, 32, 48, 192, 512):
        tile(mark, size, navy, padding=0.12 if size >= 48 else 0.08, rounded=True).save(
            BRAND / f'icon-{size}.png', optimize=True
        )
    # iOS rounds the corners itself and wants an opaque square.
    tile(mark, 180, navy, padding=0.14, rounded=False).save(BRAND / 'icon-180.png', optimize=True)
    # Android adaptive icons crop to a circle: keep the mark inside the 80% safe zone.
    tile(mark, 512, navy, padding=0.22, rounded=False).convert('RGB').save(
        BRAND / 'icon-maskable-512.png', optimize=True
    )
    tile(mark, 256, navy, padding=0.08, rounded=True).save(
        ROOT / 'src/app/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print(f'logo {light.size}, mark {mark.size}, navy {navy}')


if __name__ == '__main__':
    main()
