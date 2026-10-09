# 小玉 96x96 重绘管线：解析 sprite.ts 的 48x48 网格 → EPX 平滑放大 2x → 手工细节补丁 → 导出 TS
# 用法: python tools/neko96.py  （输出 tools/neko96_preview.png + tools/neko96_out.txt）
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'game' / 'sprite.ts'

def parse_palette(text):
    m = re.search(r'NEKO_PALETTE[^{]*\{(.*?)\}', text, re.S)
    pal = {}
    for k, v in re.findall(r"(\w+):\s*'(#[0-9a-fA-F]{6})'", m.group(1)):
        pal[k] = v
    return pal

def parse_grid(text, name):
    m = re.search(name + r"[^[]*\[(.*?)\]", text, re.S)
    rows = re.findall(r"'([.A-Za-z]*)'", m.group(1))
    return rows

def epx(grid):
    """EPX/Scale2x 平滑放大：楼梯状边缘变成斜切，轮廓更细腻。"""
    h, w = len(grid), len(grid[0])
    out = [['.'] * (w * 2) for _ in range(h * 2)]
    def at(x, y):
        if 0 <= x < w and 0 <= y < h:
            return grid[y][x]
        return '.'
    for y in range(h):
        for x in range(w):
            p = at(x, y)
            a, b, c, d = at(x, y-1), at(x+1, y), at(x-1, y), at(x, y+1)
            p1 = a if (a == c and a != b and c != d) else p
            p2 = a if (a == b and a != c and b != d) else p
            p3 = c if (c == d and c != a and d != b) else p
            p4 = b if (b == d and b != a and d != c) else p
            # 只在源像素非透明时沿用透明逻辑：EPX 可能把透明角填成轮廓色（平滑外轮廓），允许
            out[y*2][x*2] = p1 if p1 != '.' else ('.' if p == '.' else p1)
            out[y*2][x*2+1] = p2
            out[y*2+1][x*2] = p3
            out[y*2+1][x*2+1] = p4
    return [list(r) for r in out]

def patch(g, pts):
    for x, y, ch in pts:
        if 0 <= x < 96 and 0 <= y < 96:
            g[y][x] = ch

# ---------------- 细节补丁（在 96 网格坐标系上，按实际 EPX 输出定位） ----------------
def detail_patches(g, excited):
    P = []
    # —— 奶油发高光丝（i）：两条斜向细发丝 ——
    P += [(x, y, 'i') for x, y in [
        (37, 17), (38, 18), (39, 19), (40, 20), (41, 21), (42, 22),
        (46, 15), (47, 16), (48, 17), (49, 18), (50, 19),
    ]]
    # —— 发中阴影丝（h） ——
    P += [(x, y, 'h') for x, y in [(43, 26), (44, 27), (45, 28)]]
    # —— 黑斑边界深色丝（d） ——
    P += [(x, y, 'd') for x, y in [(54, 20), (55, 21), (56, 22)]]
    # —— 两侧发梢加深（d） ——
    P += [(x, y, 'd') for x, y in [(29, 42), (30, 43), (66, 42), (67, 43)]]
    # —— 金铃高光（W）与暗面（y） ——
    P += [(63, 47, 'W'), (62, 48, 'y')]
    # —— 和服袖子褶皱（q 细线） ——
    P += [(x, y, 'q') for x, y in [
        (23, 62), (23, 63), (23, 64), (23, 65), (23, 66), (23, 67),
        (72, 62), (72, 63), (72, 64), (72, 65), (72, 66), (72, 67),
    ]]
    # —— 裙摆褶皱（q 斜线） ——
    P += [(x, y, 'q') for x, y in [
        (40, 73), (41, 74), (42, 75), (43, 76),
        (50, 73), (50, 74), (50, 75), (50, 76), (50, 77),
    ]]
    # —— 过膝袜高光（W 细列） ——
    P += [(x, y, 'W') for x, y in [
        (39, 83), (39, 84), (39, 85), (39, 86), (39, 87),
        (55, 83), (55, 84), (55, 85), (55, 86), (55, 87),
    ]]
    # —— 眼睛高光（仅普通睁眼状态；兴奋闭眼不加） ——
    if not excited:
        P += [(40, 31, 'W'), (63, 31, 'W')]
    patch(g, P)

def main():
    text = SRC.read_text(encoding='utf-8')
    pal = parse_palette(text)
    idle = parse_grid(text, 'NEKO_IDLE')
    excited = parse_grid(text, 'NEKO_EXCITED')
    assert len(idle) == 48 and all(len(r) == 48 for r in idle), f'idle dims {len(idle)}x{len(idle[0])}'
    assert len(excited) == 48

    results = {}
    for name, src, is_excited in [('NEKO_IDLE', idle, False), ('NEKO_EXCITED', excited, True)]:
        g = epx(src)
        assert len(g) == 96 and all(len(r) == 96 for r in g)
        detail_patches(g, is_excited)
        results[name] = [''.join(r) for r in g]

    # ---------- 预览：模拟 pond 白天场景背存（960x360 设备像素） ----------
    img = Image.new('RGB', (960, 360))
    px = img.load()
    top, mid, hor, sea = (0x4a,0x90,0xd9),(0x7e,0xc0,0xee),(0xcf,0xee,0xf7),(0x3f,0x7a,0xb8)
    for y in range(200):
        t = y/200
        if t < 0.55: k = t/0.55; c = tuple(round(top[i]+(mid[i]-top[i])*k) for i in range(3))
        else: k = (t-0.55)/0.45; c = tuple(round(mid[i]+(hor[i]-mid[i])*k) for i in range(3))
        for x in range(960): px[x,y] = c
    for y in range(200,360):
        for x in range(960): px[x,y] = sea
    # 码头（逻辑坐标 *2）
    for x in range(0, 264):
        for y in range(224, 238): px[x,y] = (0x8a,0x65,0x47)
    for x in range(0, 264):
        px[x,224] = (0xa8,0x7f,0x5c); px[x,225] = (0xa8,0x7f,0x5c)

    def draw(g, ox, oy, cell=2):
        for r, row in enumerate(g):
            for c, ch in enumerate(row):
                if ch == '.': continue
                col = pal.get(ch)
                if not col: continue
                rgb = tuple(int(col[i:i+2],16) for i in (1,3,5))
                for dy in range(cell):
                    for dx in range(cell):
                        X, Y = ox + c*cell + dx, oy + r*cell + dy
                        if 0 <= X < 960 and 0 <= Y < 360: px[X,Y] = rgb

    # idle 在场景锚点（逻辑 nekoX=72, nekoY=34 → 设备 144,68）；excited 放右侧对照
    draw(results['NEKO_IDLE'], 144, 68)
    draw(results['NEKO_EXCITED'], 620, 68)
    img.save(ROOT / 'tools' / 'neko96_preview.png')

    # 细节放大图（3x 放大 idle 上半身）
    crop = img.crop((144, 68, 144+192, 68+140)).resize((192*3, 140*3), Image.NEAREST)
    crop.save(ROOT / 'tools' / 'neko96_zoom.png')

    # ---------- 导出 TS ----------
    with open(ROOT / 'tools' / 'neko96_out.txt', 'w', encoding='utf-8') as f:
        for name, rows in results.items():
            f.write(f'export const {name}: SpriteGrid = [\n')
            for r in rows:
                f.write(f"  '{r}',\n")
            f.write(']\n\n')
    print('OK: preview + zoom + neko96_out.txt')

main()
