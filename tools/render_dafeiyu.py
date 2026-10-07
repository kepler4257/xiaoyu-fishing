# -*- coding: utf-8 -*-
"""大肥鱼（鲸女仆）24x16 像素图标生成 + 预览。
输出 fish-dafeiyu-preview.png（参考图对照 + 10x 大图 + 实机尺寸 56x37 / 96x64）。
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GW, GH = 24, 16  # 与 FishIcon 画布一致

PAL = {
    'A': '#4e6db4',  # 鲸身蓝（发色）
    'a': '#3a548f',  # 深蓝阴影
    'L': '#8fb4e8',  # 浅蓝高光
    'F': '#3d5a9e',  # 鲸鳍/尾
    'W': '#ffffff',  # 女仆头饰/围裙
    'w': '#dfe4f0',  # 头饰阴影
    'E': '#3a6fd8',  # 大眼蓝
    'e': '#7db8ff',  # 眼睛高光
    'B': '#1c1c26',  # 黑线
    'P': '#f5a0b8',  # 腮红
    'M': '#c95a5a',  # 嘴
    'N': '#2b3a66',  # 围裙鲸鱼刺绣
    'C': '#6aa8e8',  # 侧蝴蝶结
}


class Canvas:
    def __init__(self):
        self.g = [['.'] * GW for _ in range(GH)]

    def set(self, x, y, ch):
        if 0 <= x < GW and 0 <= y < GH:
            self.g[y][x] = ch

    def get(self, x, y):
        if 0 <= x < GW and 0 <= y < GH:
            return self.g[y][x]
        return '.'

    def ellipse(self, cx, cy, rx, ry, ch):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if ((x - cx) / max(rx, 0.1)) ** 2 + ((y - cy) / max(ry, 0.1)) ** 2 <= 1.0:
                    self.set(x, y, ch)

    def rows(self):
        return [''.join(r) for r in self.g]


def compose():
    c = Canvas()

    # ---- 鲸鱼尾鳍（右侧，上下两叶） ----
    for x in range(19, 23):
        c.set(x, 4, 'F')
    for x in range(18, 24):
        c.set(x, 5, 'F')
    c.set(18, 6, 'F'); c.set(19, 6, 'F')
    c.set(18, 7, 'F')
    c.set(18, 9, 'F')
    c.set(18, 10, 'F'); c.set(19, 10, 'F')
    for x in range(18, 24):
        c.set(x, 11, 'F')
    for x in range(19, 23):
        c.set(x, 12, 'F')

    # ---- 圆胖鲸身 ----
    c.ellipse(10, 9, 8, 6, 'A')
    # 底部阴影
    c.ellipse(10, 11, 7, 4, 'a')
    c.ellipse(10, 10, 7, 4, 'A')  # 仅保留下缘一线阴影
    # 顶部浅蓝高光
    for x in range(6, 13):
        if c.get(x, 4) == 'A':
            c.set(x, 4, 'L')
    c.set(7, 5, 'L'); c.set(8, 5, 'L')

    # ---- 侧鳍（鲸鳍耳位置，左侧伸出） ----
    c.set(2, 7, 'F'); c.set(3, 7, 'F')
    c.set(1, 8, 'F'); c.set(2, 8, 'F'); c.set(3, 8, 'F')
    c.set(2, 9, 'F')

    # ---- 女仆头饰（顶部白色荷叶边） ----
    for x in range(5, 15):
        c.set(x, 2, 'w')
    for x in range(4, 16):
        c.set(x, 3, 'W')
    # 荷叶边波浪
    for x in (4, 6, 8, 10, 12, 14):
        c.set(x, 2, 'W')
        c.set(x + 1, 2, 'w') if c.get(x + 1, 2) != '.' else None
    for x in (5, 7, 9, 11, 13):
        c.set(x, 1, 'W')
    # 侧边蓝色蝴蝶结
    c.set(15, 2, 'C'); c.set(16, 3, 'C'); c.set(15, 3, 'C')

    # ---- 围裙（腹部白块 + 荷叶边 + 鲸鱼刺绣） ----
    c.ellipse(9, 13, 5, 2.5, 'W')
    c.ellipse(9, 12, 4, 2, 'W')
    for x in range(4, 15, 2):
        c.set(x, 14, 'w')  # 围裙下摆荷叶边
    # 鲸鱼刺绣（围裙中央偏下）
    c.set(8, 12, 'N'); c.set(9, 12, 'N')
    c.set(7, 13, 'N'); c.set(8, 13, 'N'); c.set(9, 13, 'N'); c.set(10, 13, 'N')

    # ---- 大眼睛（闪亮蓝） ----
    for ex in (5, 11):
        c.set(ex, 6, 'B'); c.set(ex + 1, 6, 'B'); c.set(ex + 2, 6, 'B')
        c.set(ex, 7, 'B'); c.set(ex + 1, 7, 'E'); c.set(ex + 2, 7, 'B')
        c.set(ex, 8, 'B'); c.set(ex + 1, 8, 'E'); c.set(ex + 2, 8, 'B')
        c.set(ex, 9, 'B'); c.set(ex + 1, 9, 'B')
        c.set(ex + 1, 6, 'e')  # 顶部高光
    # ---- 开口笑（两眼之间下方、围裙上方） ----
    c.set(8, 10, 'B'); c.set(9, 10, 'M')
    # 腮红
    c.set(4, 9, 'P'); c.set(14, 9, 'P')

    return c.rows()


def load_font(size):
    from PIL import ImageFont
    for p in [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def render_grid(grid, palette, scale):
    from PIL import Image
    img = Image.new('RGBA', (GW * scale, GH * scale), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            color = palette.get(ch)
            if not color:
                continue
            rgb = tuple(int(color[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
            for dy in range(scale):
                for dx in range(scale):
                    px[x * scale + dx, y * scale + dy] = rgb
    return img


def main():
    from PIL import Image, ImageDraw

    grid = compose()
    for r in grid:
        print(r)

    BG = (26, 26, 38, 255)
    ref = Image.open(r'C:\Users\56366\AppData\Local\Temp\e70f3f06-01f4-4e30-87e0-724976a9eec5.png').convert('RGBA')
    ref = ref.resize((int(ref.width * 320 / ref.height), 320), Image.LANCZOS)

    big = render_grid(grid, PAL, 10)          # 240x160
    # 实机尺寸：图鉴 56x37 / 弹窗 96x64（nearest 从 24x16 放大）
    src = render_grid(grid, PAL, 1)
    codex = src.resize((56, 37), Image.NEAREST)
    popup = src.resize((96, 64), Image.NEAREST)
    codex4 = codex.resize((56 * 3, 37 * 3), Image.NEAREST)
    popup3 = popup.resize((96 * 2, 64 * 2), Image.NEAREST)

    sheet = Image.new('RGBA', (1100, 560), BG)
    draw = ImageDraw.Draw(sheet)
    f_title = load_font(24)
    f_label = load_font(16)
    draw.text((14, 8), '大肥鱼（鲸女仆）图标预览', font=f_title, fill=(255, 210, 74))

    draw.text((20, 50), '参考图', font=f_label, fill=(170, 170, 200))
    sheet.paste(ref, (20, 76), ref)

    draw.text((320, 50), '10x (240x160)', font=f_label, fill=(255, 255, 255))
    checker = Image.new('RGBA', big.size, (32, 32, 48, 255))
    cd = ImageDraw.Draw(checker)
    for yy in range(0, big.height, 16):
        for xx in range(0, big.width, 16):
            if (xx // 16 + yy // 16) % 2 == 0:
                cd.rectangle([xx, yy, xx + 15, yy + 15], fill=(40, 40, 58, 255))
    checker.paste(big, (0, 0), big)
    sheet.paste(checker, (320, 76))
    draw.rectangle([320, 76, 320 + big.width - 1, 76 + big.height - 1], outline=(74, 74, 106))

    draw.text((620, 50), '图鉴实机 56x37 (3x 显示)', font=f_label, fill=(140, 200, 255))
    sheet.paste(codex4, (620, 76), codex4)
    draw.text((620, 210), '弹窗实机 96x64 (2x 显示)', font=f_label, fill=(140, 200, 255))
    sheet.paste(popup3, (620, 236), popup3)

    out = os.path.join(ROOT, 'fish-dafeiyu-preview.png')
    sheet.convert('RGB').save(out)
    print('PNG ->', out, sheet.size)

    used = {ch for row in grid for ch in row if ch != '.'}
    assert not (used - set(PAL)), used - set(PAL)
    assert all(len(r) == GW for r in grid)


if __name__ == '__main__':
    main()
