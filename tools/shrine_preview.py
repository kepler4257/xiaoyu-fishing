# 神社像素稿离线预览 v2：程序化生成 32x36 网格（宽度断言），5 阶段分层叠加
from PIL import Image

W, H = 32, 36
PAL = {
    'S': '#8a8a9a', 's': '#66667a', 'W': '#b0b0c0',
    'R': '#c0392b', 'r': '#8f2a20',
    'w': '#f5efe0', 'q': '#d8cfb8',
    'D': '#2c2c38', 'd': '#4a4a5e',
    'G': '#e8b93e', 'L': '#ffd24a',
    'N': '#3a2a1c',
    'T': '#d64545', 'F': '#ffffff',
    'E': '#ff9d5c',
}

def empty():
    return [['.'] * W for _ in range(H)]

def put(g, x, y, ch):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = ch

def box(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(g, x, y, ch)

def rows(g):
    out = [''.join(r) for r in g]
    assert all(len(r) == W for r in out)
    return out

# ---- L1 地基：石台（两级台阶 + 石纹） ----
g = empty()
box(g, 6, 29, 25, 29, 'S')          # 上台面
box(g, 4, 30, 27, 31, 'S')          # 下台阶
box(g, 3, 32, 28, 33, 'S')          # 基底
box(g, 3, 34, 28, 35, 's')          # 水底阴影
for i, x in enumerate(range(4, 28, 3)):   # 石纹
    put(g, x, 31, 'W' if i % 2 == 0 else 's')
for i, x in enumerate(range(5, 27, 4)):
    put(g, x, 33, 's')
put(g, 6, 29, 'W'); put(g, 25, 29, 'W')
L1 = rows(g)

# ---- L2 支柱：朱红双柱 + 横梁 ----
g = empty()
box(g, 6, 12, 7, 28, 'R')
box(g, 24, 12, 25, 28, 'R')
box(g, 6, 14, 25, 15, 'R')          # 横梁（两层）
put(g, 7, 28, 'r'); put(g, 25, 28, 'r')   # 柱脚暗
for y in (13, 17, 21, 25):
    put(g, 7, y, 'r'); put(g, 25, y, 'r')  # 柱节
L2 = rows(g)

# ---- L3 主体：白墙 + 黑门 + 金线脚 ----
g = empty()
box(g, 8, 16, 23, 28, 'w')
box(g, 8, 16, 23, 16, 'q')          # 墙顶阴
box(g, 8, 27, 23, 28, 'q')          # 墙脚阴
box(g, 8, 17, 8, 28, 'q')           # 左侧阴
box(g, 12, 19, 19, 28, 'N')         # 黑门
put(g, 15, 23, 'G'); put(g, 16, 23, 'G')  # 门环金
box(g, 8, 29, 23, 29, 'G')          # 金线脚
L3 = rows(g)

# ---- L4 房顶：歇山大屋顶 + 屋脊 + 金鸱吻 ----
g = empty()
box(g, 13, 4, 18, 4, 'G')           # 脊饰
box(g, 11, 5, 20, 6, 'D')
box(g, 10, 7, 21, 7, 'D')
box(g, 8, 8, 23, 9, 'D')
box(g, 7, 10, 24, 11, 'D')
box(g, 5, 12, 26, 13, 'D')
box(g, 4, 14, 27, 15, 'D')
put(g, 3, 15, 'G'); put(g, 28, 15, 'G')   # 鸱吻
put(g, 4, 16, 'D'); put(g, 27, 16, 'D')   # 檐角下垂
for x in range(6, 27, 4):                # 瓦楞高光
    put(g, x, 12, 'd'); put(g, x + 1, 12, 'd')
for x in range(8, 24, 4):
    put(g, x, 9, 'd')
L4 = rows(g)

# ---- L5 装饰：金铃 + 注连绳纸垂 + 吊灯 + 供箱 ----
g = empty()
# 注连绳（横梁下）
box(g, 8, 16, 23, 16, 'T')
# 纸垂（白色锯齿）
for x in (10, 13, 16, 19):
    put(g, x, 17, 'F')
for x in (11, 14, 17, 20):
    put(g, x, 18, 'F')
# 成对金铃（檐角下）
for bx in (6, 24):
    put(g, bx, 16, 'L')
    box(g, bx - 1, 17, bx + 1, 17, 'L')
    put(g, bx, 18, 'L')
# 吊灯（挂在门两侧柱内）
for lx in (9, 21):
    put(g, lx + 1, 15, 'G')               # 挂钩
    box(g, lx, 16, lx + 2, 16, 'r')       # 灯顶
    box(g, lx, 17, lx + 2, 18, 'E')       # 灯身
    box(g, lx, 19, lx + 2, 19, 'r')       # 灯底
# 供箱（台阶前）
box(g, 12, 25, 19, 28, 'N')
box(g, 12, 25, 19, 25, 'D')
for x in range(13, 19, 2):
    put(g, x, 26, 'G'); put(g, x, 27, 'G')  # 金格栅
L5 = rows(g)

LAYERS = [L1, L2, L3, L4, L5]

def bg(mode):
    img = Image.new('RGB', (480, 180))
    px = img.load()
    if mode == 'day':
        top, mid, hor, sea = (0x4a,0x90,0xd9),(0x7e,0xc0,0xee),(0xcf,0xee,0xf7),(0x3f,0x7a,0xb8)
    else:
        top, mid, hor, sea = (0x0c,0x0c,0x24),(0x1c,0x1c,0x3c),(0x2c,0x2c,0x4c),(0x14,0x20,0x3c)
    for y in range(100):
        t = y/100
        if t < 0.55:
            k = t/0.55; c = tuple(round(top[i]+(mid[i]-top[i])*k) for i in range(3))
        else:
            k = (t-0.55)/0.45; c = tuple(round(mid[i]+(hor[i]-mid[i])*k) for i in range(3))
        for x in range(480): px[x,y] = c
    for y in range(100,180):
        for x in range(480): px[x,y] = sea
    return img

def draw_grid(img, grid, ox, oy, scale=2):
    px = img.load()
    for r, row in enumerate(grid):
        for c, ch in enumerate(row):
            if ch == '.': continue
            col = PAL.get(ch)
            if not col: continue
            rgb = tuple(int(col[i:i+2],16) for i in (1,3,5))
            for dy in range(scale):
                for dx in range(scale):
                    x, y = ox + c*scale + dx, oy + r*scale + dy
                    if 0 <= x < 480 and 0 <= y < 180: px[x,y] = rgb

def glow(img, gx, gy, strength=0.12, rad=16):
    px = img.load()
    for r in range(rad, 2, -2):
        a = strength
        for y in range(gy-r, gy+r):
            for x in range(gx-r, gx+r):
                if 0<=x<480 and 0<=y<180:
                    o = px[x,y]
                    px[x,y] = (min(255, round(o[0]+(255-o[0])*a)),
                               min(255, round(o[1]+(215-o[1])*a)),
                               min(255, round(o[2]+(120-o[2])*a*0.5)))

# 夜晚：叠加全场景暗角 + 神社灯晕（与 scene.ts 的实现一致：神社在暗角前绘制，
# 这里近似：先暗角后灯晕，验证夜间可读性）
def vignette(img, k=0.16):
    px = img.load()
    for y in range(180):
        for x in range(480):
            o = px[x,y]
            px[x,y] = tuple(round(o[i]*(1-k)) for i in range(3))

OUT = Image.new('RGB', (480*5, 180*2), (20,20,30))
import math
for mi, mode in enumerate(['day','night']):
    for st in range(5):
        img = bg(mode)
        ox, oy = 400, 40
        for li in range(st+1):
            draw_grid(img, LAYERS[li], ox, oy, 2)
        px = img.load()
        if st >= 4:
            # 樱花瓣（ procedural 模拟几瓣）
            for i in range(6):
                petx = 380 + i*16 + (i%3)*5
                pety = 60 + (i*13) % 50
                for dx in range(3):
                    for dy in range(2):
                        if 0<=petx+dx<480 and 0<=pety+dy<180:
                            px[petx+dx, pety+dy] = (255,179,200)
        if mode == 'night':
            vignette(img, 0.16)
            if st >= 4:
                # 吊灯暖光：sprite 坐标 (10,17)/(22,17) -> 场景 (400+21, 40+35)
                glow(img, 421, 76, 0.14, 18)
                glow(img, 445, 76, 0.14, 18)
                # 金铃微光
                glow(img, 413, 74, 0.08, 10)
                glow(img, 449, 74, 0.08, 10)
        OUT.paste(img, (480*st, 180*mi))
OUT.save('shrine_preview.png')

# 导出 TS 数组文本
with open('shrine_layers.txt', 'w', encoding='utf-8') as f:
    for i, layer in enumerate(LAYERS):
        f.write(f'// ---- 阶段 {i+1} ----\n[\n')
        for r in layer:
            f.write(f"  '{r}',\n")
        f.write(']\n')
print('saved shrine_preview.png + shrine_layers.txt')
