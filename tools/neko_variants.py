# 精细版小玉 4 款变体生成：A=现版(EPX+手工细节) / B=16-bit柔影 / C=赛璐璐勾线 / D=高密度细节
# 输出: tools/variants/variant_{A,B,C,D}.ts + tools/variants/preview_{A,B,C,D}.png + tools/neko_compare.png
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'game' / 'sprite.ts'
OUTDIR = ROOT / 'tools' / 'variants'
OUTDIR.mkdir(exist_ok=True)

def parse_palette(text):
    m = re.search(r'NEKO_PALETTE[^{]*\{(.*?)\}', text, re.S)
    return dict(re.findall(r"(\w+):\s*'(#[0-9a-fA-F]{6})'", m.group(1)))

def parse_grid(text, name):
    m = re.search(name + r": SpriteGrid = \[\n(.*?)\n\]", text, re.S)
    rows = re.findall(r"'([.A-Za-z]*)'", m.group(1))
    assert len(rows) == 96 and all(len(r) == 96 for r in rows), f'{name} not 96x96'
    return [list(r) for r in rows]

def mix(a, b):
    ca = [int(a[i:i+2], 16) for i in (1, 3, 5)]
    cb = [int(b[i:i+2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple((x + y) // 2 for x, y in zip(ca, cb))

text = SRC.read_text(encoding='utf-8')
BASE_PAL = parse_palette(text)
A = parse_grid(text, 'NEKO_IDLE')

# A 版两处错位的"铃铛高光"补丁（实际落在了胸口皮肤上）：派生变体先修正
def fix_stray(g):
    g[47][63] = 'S'
    g[48][62] = 'S'
    return g

def clone(g):
    return [row[:] for row in g]

def put(g, x, y, ch):
    if 0 <= x < 96 and 0 <= y < 96:
        g[y][x] = ch

# ---------------- 款式 B：16-bit 柔影晕染（中间色过渡带） ----------------
def make_B():
    pal = dict(BASE_PAL)
    pal['1'] = mix(pal['H'], pal['h'])  # 发 H↔h
    pal['2'] = mix(pal['h'], pal['d'])  # 发 h↔d
    pal['3'] = mix(pal['S'], pal['s'])  # 肤 S↔s
    pal['4'] = mix(pal['w'], pal['q'])  # 和服 w↔q
    pal['5'] = mix(pal['K'], pal['k'])  # 黑斑 K↔k
    g = fix_stray(clone(A))
    pairs = [('H', 'h', '1'), ('h', 'd', '2'), ('S', 's', '3'),
             ('w', 'q', '4'), ('K', 'k', '5')]
    src = clone(g)
    for y in range(96):
        for x in range(96):
            c = src[y][x]
            for light, dark, mid in pairs:
                if c == dark:
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < 96 and 0 <= ny < 96 and src[ny][nx] == light:
                            g[y][x] = mid
                            break
    return g, pal

# ---------------- 款式 C：赛璐璐强勾线（黑轮廓 + 平色块 + 高对比） ----------------
def make_C():
    pal = dict(BASE_PAL)
    # 压平中间色：高光并入主色，深影并入单一阴影级
    g = fix_stray(clone(A))
    quant = {'i': 'H', 'k': 'K', 'd': 'h', 'y': 'Y'}
    for y in range(96):
        for x in range(96):
            g[y][x] = quant.get(g[y][x], g[y][x])
    # 提高对比：阴影色加深
    pal['h'] = '#d9a844'
    pal['q'] = '#c9bd9e'
    pal['s'] = '#eeb98f'
    # 黑色外轮廓：透明像素的 4 邻域有实体 → 描 B
    src = clone(g)
    for y in range(96):
        for x in range(96):
            if src[y][x] != '.':
                continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x+dx, y+dy
                if 0 <= nx < 96 and 0 <= ny < 96 and src[ny][nx] != '.':
                    g[y][x] = 'B'
                    break
    return g, pal

# ---------------- 款式 D：高密度细节（发束/花纹/金属铃/大眼多层高光） ----------------
def draw_eye_D(g, x0, y0):
    """6x10 大眼：上暗下亮的琥珀虹膜 + 双高光。y0..y0+9, x0..x0+5"""
    Yd = '6'
    rows = [
        '.BBBB.',
        'B6666B',
        'B6YYYY B'.replace(' ', ''),
        'BYWWYYB',
        'BYWWYYB',
        'BYYYYYB',
        'BYYYyYB',
        'BYYyyWB',
        'BYYYYYB',
        '.BBBB.',
    ]
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch != '.':
                put(g, x0 + dx, y0 + dy, ch)

def make_D():
    pal = dict(BASE_PAL)
    pal['6'] = '#c98a1a'  # 虹膜暗琥珀
    g = fix_stray(clone(A))
    # —— 发束感：更多细分发丝 ——
    for x, y, ch in [
        (33,18,'h'),(34,19,'h'),(35,20,'h'),(36,21,'h'),
        (40,15,'i'),(41,16,'i'),(42,17,'i'),
        (52,17,'h'),(53,18,'h'),(54,19,'h'),
        (29,22,'h'),(29,23,'h'),(29,24,'h'),(29,25,'h'),
        (31,26,'i'),(31,27,'i'),(31,28,'i'),
        (44,23,'h'),(45,24,'h'),
    ]:
        put(g, x, y, ch)
    # —— 和服花纹：白色区域自动寻找 3x3 空地画小碎花 ——
    for yy in range(58, 79, 5):
        for xx in range(24, 78, 7):
            ok = all(
                0 <= xx+dx < 96 and 0 <= yy+dy < 96 and g[yy+dy][xx+dx] == 'w'
                for dx in (-1, 0, 1) for dy in (-1, 0, 1)
            )
            if ok:
                put(g, xx, yy, 'p')
                put(g, xx-1, yy, 'P'); put(g, xx+1, yy, 'P')
                put(g, xx, yy-1, 'P'); put(g, xx, yy+1, 'P')
    # —— 金属质感金铃（x45-50, y46-49） ——
    bell = [
        (45,46,'g'),(46,46,'y'),(47,46,'y'),(48,46,'y'),(49,46,'y'),(50,46,'g'),
        (45,47,'L'),(46,47,'L'),(47,47,'W'),(48,47,'L'),(49,47,'L'),(50,47,'L'),
        (45,48,'G'),(46,48,'L'),(47,48,'L'),(48,48,'L'),(49,48,'G'),(50,48,'G'),
        (46,49,'g'),(47,49,'G'),(48,49,'G'),(49,49,'g'),
    ]
    for x, y, ch in bell:
        put(g, x, y, ch)
    # —— 大眼 + 多层高光（左眼 x38-43、右眼 x61-66，y27-36） ——
    draw_eye_D(g, 38, 27)
    draw_eye_D(g, 61, 27)
    return g, pal

VARIANTS = {
    'A': ('现版 · EPX精细', lambda: (clone(A), dict(BASE_PAL))),
    'B': ('16-bit 柔影晕染', make_B),
    'C': ('赛璐璐强勾线', make_C),
    'D': ('高密度细节', make_D),
}

def render(grid, pal, cell, bg=(245, 240, 230), margin=16):
    img = Image.new('RGB', (96 * cell + margin * 2, 96 * cell + margin * 2), bg)
    px = img.load()
    for r, row in enumerate(grid):
        for c, ch in enumerate(row):
            if ch == '.':
                continue
            col = pal.get(ch)
            assert col, f'missing palette for {ch!r}'
            rgb = tuple(int(col[i:i+2], 16) for i in (1, 3, 5))
            for dy in range(cell):
                for dx in range(cell):
                    px[margin + c * cell + dx, margin + r * cell + dy] = rgb
    return img

def find_cjk_font():
    base = Path(r'C:\Users\56366\AppData\Roaming\kimi-desktop\daimon-share\daimon\runtime')
    try:
        for pat in ('*.ttf', '*.otf', '*.ttc'):
            for f in base.rglob(pat):
                if re.search(r'cjk|noto|han|wqy|hei|song', f.name, re.I):
                    return str(f)
    except Exception:
        pass
    return None

results = {}
for key, (label, fn) in VARIANTS.items():
    g, pal = fn()
    results[key] = (label, g, pal)
    # 单款预览（5x = 480px，浅底）
    img = render(g, pal, 5)
    img.save(OUTDIR / f'preview_{key}.png')
    # 网格数据 TS
    with open(OUTDIR / f'variant_{key}.ts', 'w', encoding='utf-8') as f:
        f.write(f'// 精细版小玉 · 款式 {key}：{label}（96x96 字符串网格 + 调色板，选自审后并入 sprite.ts）\n')
        f.write('type SpriteGrid = string[]\n\n')
        f.write(f'export const NEKO_PALETTE_VARIANT_{key}: Record<string, string> = {{\n')
        for k, v in pal.items():
            f.write(f"  {k}: '{v}',\n")
        f.write('}\n\n')
        f.write(f'export const NEKO_IDLE_VARIANT_{key}: SpriteGrid = [\n')
        for row in g:
            f.write(f"  '{''.join(row)}',\n")
        f.write(']\n')

# ---------------- 并排对比图 ----------------
cell = 3
pw, ph = 96 * cell, 96 * cell
label_h, gap = 46, 12
W = pw * 4 + gap * 5
H = ph + label_h + gap * 2
cmp_img = Image.new('RGB', (W, H), (232, 226, 212))
dr = ImageDraw.Draw(cmp_img)
font_path = find_cjk_font()
font = ImageFont.truetype(font_path, 22) if font_path else ImageFont.load_default()
print('font:', font_path or 'default(EN)')

for i, key in enumerate(['A', 'B', 'C', 'D']):
    label, g, pal = results[key]
    ox = gap + i * (pw + gap)
    oy = label_h + gap
    panel = render(g, pal, cell, bg=(245, 240, 230), margin=0)
    cmp_img.paste(panel, (ox, oy))
    dr.rectangle([ox - 1, oy - 1, ox + pw, oy + ph], outline=(120, 110, 90))
    text = f'{key}  {label}'
    bb = dr.textbbox((0, 0), text, font=font)
    dr.text((ox + (pw - (bb[2] - bb[0])) / 2, 10), text, fill=(60, 50, 40), font=font)

cmp_img.save(ROOT / 'tools' / 'neko_compare.png')
print('OK: 4 previews + variants + neko_compare.png')
