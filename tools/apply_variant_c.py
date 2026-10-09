# C 款（赛璐璐强勾线）收尾：idle 并入 + 同管线生成 excited + 修错位像素 → 写回 sprite.ts
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'game' / 'sprite.ts'
VAR = ROOT / 'tools' / 'variants' / 'variant_C.ts'

def parse_palette(text, name):
    m = re.search(name + r'[^{]*\{(.*?)\}', text, re.S)
    return dict(re.findall(r"(\w+):\s*'(#[0-9a-fA-F]{6})'", m.group(1)))

def parse_grid_any(text, name, type_name='SpriteGrid'):
    m = re.search(name + r": \w+ = \[\n(.*?)\n\]", text, re.S)
    rows = re.findall(r"'([.A-Za-z]*)'", m.group(1))
    assert len(rows) == 96 and all(len(r) == 96 for r in rows), f'{name} not 96x96 ({len(rows)})'
    return [list(r) for r in rows]

def clone(g):
    return [row[:] for row in g]

# ---- 读 C 款 idle 与调色板 ----
vtext = VAR.read_text(encoding='utf-8')
C_PAL = parse_palette(vtext, 'NEKO_PALETTE_VARIANT_C')
C_IDLE = parse_grid_any(vtext, 'NEKO_IDLE_VARIANT_C')

# ---- C 管线（与 neko_variants.py make_C 完全一致） ----
def cel_pipeline(g):
    g = clone(g)
    # 修错位铃铛高光（现版 A 的 1px 瑕疵）
    g[47][63] = 'S'
    g[48][62] = 'S'
    quant = {'i': 'H', 'k': 'K', 'd': 'h', 'y': 'Y'}
    for y in range(96):
        for x in range(96):
            g[y][x] = quant.get(g[y][x], g[y][x])
    src = clone(g)
    for y in range(96):
        for x in range(96):
            if src[y][x] != '.':
                continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < 96 and 0 <= ny < 96 and src[ny][nx] != '.':
                    g[y][x] = 'B'
                    break
    return g

# ---- 生成 C 风格 excited ----
stext = SRC.read_text(encoding='utf-8')
A_EXCITED = parse_grid_any(stext, 'NEKO_EXCITED')
C_EXCITED = cel_pipeline(A_EXCITED)

# 校验：C_IDLE 也应等于 cel_pipeline(A idle)，防止 variant 文件与管线漂移
A_IDLE = parse_grid_any(stext, 'NEKO_IDLE')
assert cel_pipeline(A_IDLE) == C_IDLE, 'variant_C.ts 与 C 管线输出不一致！'

# ---- 写回 sprite.ts ----
def grid_ts(g):
    return '\n'.join(f"  '{''.join(row)}'," for row in g)

# 1) 调色板（C 款压平了部分色值：h/q/s 更深）
pal_body = '\n'.join(f"  {k}: '{v}'," for k, v in C_PAL.items())
stext = re.sub(
    r'NEKO_PALETTE: Record<string, string> = \{.*?\}',
    'NEKO_PALETTE: Record<string, string> = {\n' + pal_body + '\n}',
    stext, flags=re.S,
)
# 2) 两个网格
for name, g in [('NEKO_IDLE', C_IDLE), ('NEKO_EXCITED', C_EXCITED)]:
    stext = re.sub(
        name + r": SpriteGrid = \[\n.*?\n\]",
        name + ': SpriteGrid = [\n' + grid_ts(g) + '\n]',
        stext, flags=re.S,
    )
SRC.write_text(stext, encoding='utf-8')

# ---- 自审预览：C idle + C excited 并排（浅底 4x） ----
def render(g, pal, cell=4, bg=(245, 240, 230)):
    img = Image.new('RGB', (96 * cell + 16, 96 * cell + 16), bg)
    px = img.load()
    for r, row in enumerate(g):
        for c, ch in enumerate(row):
            if ch == '.':
                continue
            col = pal[ch]
            rgb = tuple(int(col[i:i+2], 16) for i in (1, 3, 5))
            for dy in range(cell):
                for dx in range(cell):
                    px[8 + c * cell + dx, 8 + r * cell + dy] = rgb
    return img

side = Image.new('RGB', ((96 * 4 + 16) * 2 + 12, 96 * 4 + 16), (232, 226, 212))
side.paste(render(C_IDLE, C_PAL), (0, 0))
side.paste(render(C_EXCITED, C_PAL), (96 * 4 + 16 + 12, 0))
side.save(ROOT / 'tools' / 'variants' / 'preview_C_final.png')
print('OK: sprite.ts updated (C idle + C excited + palette), preview_C_final.png')
