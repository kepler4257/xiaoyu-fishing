# -*- coding: utf-8 -*-
"""大肥鱼图标：参考图严格像素化。
流程：边缘泛洪去白底（保护内部白色围裙/头饰）→ 包围盒裁剪 → 降采样 → 量化调色板
→ 字符串网格 + 调色板，替换 src/game/fish.ts 中 dafeiyu 条目 → 渲染预览。
用法: python tools/pixelate_dafeiyu.py [--write] [--n 28] [--colors 24]
"""
import os
import re
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'reference-dafeiyu.png')
PREVIEW = os.path.join(ROOT, 'fish-dafeiyu-preview.png')
FISH_TS = os.path.join(ROOT, 'src', 'game', 'fish.ts')

CHARS = list('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*')


def remove_background(img: Image.Image, thresh: int = 240) -> Image.Image:
    """从边缘 BFS 泛洪去除近白背景，内部白色保留。"""
    rgba = np.array(img.convert('RGBA'))
    h, w = rgba.shape[:2]
    near_white = (rgba[:, :, 0] > thresh) & (rgba[:, :, 1] > thresh) & (rgba[:, :, 2] > thresh)
    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    rgba[:, :, 3] = np.where(bg, 0, 255)
    return Image.fromarray(rgba, 'RGBA')


def crop_bbox(img: Image.Image, margin: int = 6) -> Image.Image:
    a = np.array(img)[:, :, 3]
    ys, xs = np.where(a > 0)
    y0, y1 = max(0, ys.min() - margin), min(img.height, ys.max() + 1 + margin)
    x0, x1 = max(0, xs.min() - margin), min(img.width, xs.max() + 1 + margin)
    return img.crop((x0, y0, x1, y1))


def pixelate(img: Image.Image, n: int, colors: int, two_step: bool) -> Image.Image:
    """缩到 n x ceil(n*h/w)，量化到 colors 色。"""
    ratio = img.height / img.width
    nh = round(n * ratio)
    if two_step:
        small = img.resize((n * 4, nh * 4), Image.LANCZOS).resize((n, nh), Image.NEAREST)
    else:
        small = img.resize((n, nh), Image.LANCZOS)
    # 透明阈值二值化（提高阈值去掉发梢半透明虚边）
    arr = np.array(small)
    arr[:, :, 3] = np.where(arr[:, :, 3] >= 170, 255, 0)
    small = Image.fromarray(arr, 'RGBA')
    # 清除孤立像素（3x3 邻域内少于 2 个不透明邻居则视为噪点，numpy 实现）
    alpha = (np.array(small)[:, :, 3] > 0).astype(np.uint8)
    padded = np.pad(alpha, 1)
    neighbors = np.zeros_like(alpha, dtype=np.int16)
    for dy in range(3):
        for dx in range(3):
            if dy == 1 and dx == 1:
                continue
            neighbors += padded[dy:dy + alpha.shape[0], dx:dx + alpha.shape[1]]
    cleaned = np.where((alpha == 1) & (neighbors < 2), 0, alpha).astype(np.uint8)
    arr = np.array(small)
    arr[:, :, 3] = cleaned * 255
    small = Image.fromarray(arr, 'RGBA')
    # 量化（FASTOCTREE 支持 RGBA）
    q = small.quantize(colors=colors, method=Image.FASTOCTREE)
    return q.convert('RGBA')


def to_grid(img: Image.Image):
    """RGBA → (grid, palette)，按出现频率降序分配字符。"""
    arr = np.array(img)
    h, w = arr.shape[:2]
    freq = {}
    for y in range(h):
        for x in range(w):
            if arr[y, x, 3] >= 128:
                key = (int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2]))
                freq[key] = freq.get(key, 0) + 1
    ordered = sorted(freq.items(), key=lambda kv: -kv[1])
    assert len(ordered) <= len(CHARS), f'颜色过多: {len(ordered)}'
    char_of = {rgb: CHARS[i] for i, (rgb, _) in enumerate(ordered)}
    palette = {CHARS[i]: '#%02x%02x%02x' % rgb for i, (rgb, _) in enumerate(ordered)}
    grid = []
    for y in range(h):
        row = []
        for x in range(w):
            if arr[y, x, 3] < 128:
                row.append('.')
            else:
                row.append(char_of[(int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2]))])
        grid.append(''.join(row))
    return grid, palette


def write_fish_ts(grid, palette):
    """替换 fish.ts 中 dafeiyu 条目的 grid/palette。"""
    src = open(FISH_TS, encoding='utf-8').read()
    grid_lines = '\n'.join(f"      '{r}'," for r in grid)
    pal_lines = '\n'.join(f"      {ch}: '{color}'," for ch, color in palette.items())
    new_block = f"grid: [\n{grid_lines}\n    ],\n    palette: {{\n{pal_lines}\n    }},"
    pattern = re.compile(r"grid: \[.*?\],\n    palette: \{.*?\},", re.S)
    new_src, cnt = pattern.subn(new_block, src, count=1)
    assert cnt == 1, '未找到 grid/palette 块'
    open(FISH_TS, 'w', encoding='utf-8').write(new_src)
    print('TS ->', FISH_TS, f'({len(grid[0])}x{len(grid)}, {len(palette)} 色)')


def render_grid(grid, palette, scale):
    h, w = len(grid), len(grid[0])
    img = Image.new('RGBA', (w * scale, h * scale), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            color = palette[ch]
            rgb = tuple(int(color[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
            for dy in range(scale):
                for dx in range(scale):
                    px[x * scale + dx, y * scale + dy] = rgb
    return img


def load_font(size):
    for p in [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def checker(size):
    img = Image.new('RGBA', size, (32, 32, 48, 255))
    d = ImageDraw.Draw(img)
    for yy in range(0, size[1], 16):
        for xx in range(0, size[0], 16):
            if (xx // 16 + yy // 16) % 2 == 0:
                d.rectangle([xx, yy, xx + 15, yy + 15], fill=(40, 40, 58, 255))
    return img


def main():
    n = 28
    colors = 24
    write = '--write' in sys.argv
    for i, a in enumerate(sys.argv):
        if a == '--n':
            n = int(sys.argv[i + 1])
        if a == '--colors':
            colors = int(sys.argv[i + 1])

    img = Image.open(SRC)
    nobg = remove_background(img)
    crop = crop_bbox(nobg)
    print('裁剪:', crop.size)
    pix = pixelate(crop, n, colors, two_step=False)
    grid, palette = to_grid(pix)
    gw, gh = len(grid[0]), len(grid)
    print(f'网格 {gw}x{gh}, {len(palette)} 色')

    if write:
        write_fish_ts(grid, palette)

    # ---- 预览 ----
    ref_show = crop.resize((int(crop.width * 380 / crop.height), 380), Image.LANCZOS)
    big = render_grid(grid, palette, 10)
    sheet = Image.new('RGBA', (1250, 700), (26, 26, 38, 255))
    draw = ImageDraw.Draw(sheet)
    f_title = load_font(24)
    f_label = load_font(15)
    draw.text((14, 8), f'大肥鱼 严格像素化预览（{gw}x{gh}, {len(palette)}色）', font=f_title, fill=(255, 210, 74))

    draw.text((20, 48), '参考图(去底)', font=f_label, fill=(170, 170, 200))
    sheet.paste(checker(ref_show.size), (20, 72))
    sheet.paste(ref_show, (20, 72), ref_show)

    draw.text((420, 48), f'10x ({big.width}x{big.height})', font=f_label, fill=(255, 255, 255))
    sheet.paste(checker(big.size), (420, 72))
    sheet.paste(big, (420, 72), big)

    # 实机尺寸（letterbox 到实际画布比例后的显示效果）
    src1 = render_grid(grid, palette, 1)
    for i, (label, dw, dh, zoom) in enumerate([
        ('图鉴 56px', 56, 56, 3),
        ('弹窗 96px', 96, 96, 2),
        ('角色页 40px', 40, 40, 4),
    ]):
        small = src1.resize((gw * dw // gw if False else dw, dh), Image.NEAREST)
        show = small.resize((dw * zoom, dh * zoom), Image.NEAREST)
        x = 780
        y = 72 + i * 210
        draw.text((x, y - 24), label, font=f_label, fill=(140, 200, 255))
        sheet.paste(checker(show.size), (x, y))
        sheet.paste(show, (x, y), show)

    sheet.convert('RGB').save(PREVIEW)
    print('PNG ->', PREVIEW)


if __name__ == '__main__':
    main()
