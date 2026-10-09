# 交易所横幅像素画：小玉坐在电脑前炒股（96x48，C 款赛璐璐风格：平色块 + 黑轮廓）
# 输出预览 tools/stock_art_preview.png + 网格 tools/stock_art_out.txt
from pathlib import Path
from PIL import Image
import re

ROOT = Path(__file__).resolve().parent.parent
W, H = 96, 48

# 复用 NEKO_PALETTE 的角色色 + 扩展道具色
EXTRA = {
    '0': '#141c2e',  # 屏幕
    '1': '#26262e',  # 显示器边框/键盘/椅子
    '2': '#8a6547',  # 桌面
    '3': '#6e4f36',  # 桌沿/椅腿
    '5': '#3ddc84',  # 阴线绿（国服：红涨绿跌）
    '6': '#7db8e8',  # 屏幕反光
}
PAL = {
    'H': '#f7dd8e', 'h': '#d9a844', 'K': '#26262e', 'k': '#26262e',
    'W': '#ffffff', 'E': '#f7a8c0', 'S': '#ffe9d2', 'u': '#f5b09a',
    'B': '#1c1c26', 'M': '#c95a5a', 'w': '#f5efe0', 'q': '#c9bd9e',
    'G': '#e8b93e', 'L': '#ffd24a', 'R': '#d64545', 'F': '#ff9ebb',
    'C': '#7fb3ff', 'v': '#6aa84f', **EXTRA,
}

g = [['.'] * W for _ in range(H)]

def put(x, y, ch):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = ch

def rect(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(x, y, ch)

def ellipse(cx, cy, rx, ry, ch):
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            if ((x - cx) / max(rx, 0.1)) ** 2 + ((y - cy) / max(ry, 0.1)) ** 2 <= 1.05:
                put(x, y, ch)

def line(x0, y0, x1, y1, ch, thick=1):
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(steps + 1):
        t = i / steps
        x, y = round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t)
        for dx in range(thick):
            for dy in range(thick):
                put(x + dx, y + dy, ch)

# ---------- 椅子（小玉身后） ----------
rect(6, 14, 13, 34, '1')          # 椅背
rect(8, 35, 11, 38, '1')          # 椅座边
put(8, 39, '1'); put(8, 40, '1'); put(11, 39, '1'); put(11, 40, '1')

# ---------- 小玉（坐椅子上面朝右看屏幕） ----------
# 身体：露肩白和服（桌面下被挡住）
ellipse(33, 29, 10, 8, 'w')       #  torso
rect(24, 26, 42, 33, 'w')
line(25, 27, 20, 33, 'w', 2)      # 左袖垂落
# 红腰带（露出桌面上一截）
rect(28, 31, 40, 32, 'R')
# 红项圈 + 金铃
rect(28, 20, 39, 21, 'R')
put(33, 22, 'L'); put(34, 22, 'L'); put(33, 23, 'L'); put(34, 23, 'L')
put(33, 22, 'W')                  # 铃高光
# 头：奶油金发
ellipse(33, 11, 10, 9, 'H')
# 三毛猫黑斑（右后侧头顶）
ellipse(39, 6, 5, 4, 'K')
# 头发阴影层次（C 款单阴影级）
ellipse(28, 16, 6, 4, 'h')
rect(23, 12, 26, 18, 'h')         # 左侧后发
# 脸（皮肤，朝右）
ellipse(39, 13, 5, 5, 'S')
put(43, 12, 'S'); put(43, 13, 'S'); put(43, 14, 'S')
put(44, 13, 'S'); put(44, 14, 'S')  # 小鼻子
# 眼睛（盯着屏幕的竖瞳）
rect(40, 11, 40, 14, 'B'); put(41, 12, 'G')
# 腮红 + 嘴
put(42, 15, 'u'); put(43, 15, 'u'); put(43, 16, 'M')
# 刘海
rect(31, 6, 37, 8, 'H'); put(38, 7, 'H'); put(38, 8, 'H')
put(35, 9, 'H'); put(33, 9, 'H')
# 猫耳（后画，不被头发盖住）
line(25, 5, 21, 0, 'H'); line(25, 5, 28, 2, 'H'); line(21, 0, 28, 2, 'H')
put(24, 3, 'E'); put(25, 4, 'E'); put(23, 2, 'E')
line(37, 2, 38, 0, 'H'); line(37, 2, 41, 1, 'H'); line(38, 0, 41, 1, 'H')
put(38, 1, 'E')
# 右耳花饰（粉白蓝大花 + 绿叶）
put(42, 0, 'F'); put(43, 0, 'W'); put(41, 1, 'W'); put(42, 1, 'C'); put(43, 1, 'F')
put(44, 0, 'F'); put(44, 1, 'v')
# 右臂伸向键盘
line(41, 26, 52, 31, 'w', 2)
rect(52, 30, 54, 31, 'S')         # 手
# 猫尾巴从椅后卷起
line(13, 34, 8, 42, 'H', 2)
put(6, 42, 'W'); put(7, 43, 'W')  # 尾尖白

# ---------- 桌子 ----------
rect(18, 33, 93, 36, '2')
rect(18, 36, 93, 37, '3')
rect(20, 38, 22, 44, '3')
rect(88, 38, 90, 44, '3')

# ---------- 键盘 ----------
rect(46, 32, 58, 32, '1')
for x in range(47, 58, 2):
    put(x, 32, '3')

# ---------- 显示器（屏幕红绿 K 线） ----------
rect(60, 6, 90, 28, '1')          # 边框
rect(62, 8, 88, 26, '0')          # 屏幕
# K 线蜡烛（红涨绿跌，带影线）
candles = [(64, 18, 6, 'R'), (68, 12, 8, 'R'), (72, 16, 5, '5'),
           (76, 10, 7, 'R'), (80, 14, 4, '5'), (84, 9, 6, 'R')]
for cx, top, hh, col in candles:
    put(cx, top - 2, col)         # 上影线
    rect(cx - 1, top, cx + 1, top + hh, col)  # 实体
    put(cx, top + hh + 1, col)    # 下影线
# 屏幕反光
line(63, 9, 70, 9, '6'); put(63, 10, '6')
# 显示器支架
rect(73, 29, 74, 32, '1')
rect(70, 32, 77, 33, '1')

# ---------- C 款黑轮廓（透明像素 4 邻域有实体 → B） ----------
src = [row[:] for row in g]
for y in range(H):
    for x in range(W):
        if src[y][x] != '.':
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and src[ny][nx] != '.':
                g[y][x] = 'B'
                break

# ---------- 预览（4x，深色面板底） ----------
cell = 4
img = Image.new('RGB', (W * cell + 16, H * cell + 16), (30, 30, 46))
px = img.load()
for r, row in enumerate(g):
    for c, ch in enumerate(row):
        if ch == '.':
            continue
        rgb = tuple(int(PAL[ch][i:i+2], 16) for i in (1, 3, 5))
        for dy in range(cell):
            for dx in range(cell):
                px[8 + c * cell + dx, 8 + r * cell + dy] = rgb
img.save(ROOT / 'tools' / 'stock_art_preview.png')

with open(ROOT / 'tools' / 'stock_art_out.txt', 'w', encoding='utf-8') as f:
    f.write('NEKO_STOCK_PALETTE_EXTRA = {\n')
    for k, v in EXTRA.items():
        f.write(f"  '{k}': '{v}',\n")
    f.write('}\nNEKO_STOCK = [\n')
    for row in g:
        f.write(f"  '{''.join(row)}',\n")
    f.write(']\n')
print('OK: stock_art_preview.png + stock_art_out.txt')
