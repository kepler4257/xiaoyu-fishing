# -*- coding: utf-8 -*-
"""小玉 48x48 像素 sprite 旧变体生成 + 预览渲染（已被 render_xiaoyu.py 取代）。"""
import json
import math
import os

W = H = 48
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- 调色板 ----------------
BASE_PAL = {
    'H': '#f6d97e',  # 金发
    'h': '#e0b84f',  # 金发阴影
    'd': '#c99836',  # 金发深影
    'i': '#fdf0b8',  # 金发高光
    'K': '#2b2b33',  # 黑色挑染
    'k': '#4a4a58',  # 挑染高光
    'W': '#ffffff',  # 白毛/虎牙
    'E': '#f7a8c0',  # 内耳粉
    'S': '#ffe6cc',  # 皮肤
    's': '#f2cba4',  # 皮肤阴影
    'u': '#f5b09a',  # 腮红
    'Y': '#f2b134',  # 金琥珀眼
    'y': '#ffd76e',  # 眼睛高光
    'B': '#1c1c26',  # 黑线
    'M': '#c95a5a',  # 口腔
    'w': '#f7f3e8',  # 和服白
    'q': '#e2dbc8',  # 和服阴影
    'G': '#e8b93e',  # 金边
    'g': '#b98a24',  # 暗金
    'L': '#ffd24a',  # 铃铛金
    'P': '#ffb3c8',  # 碎花 粉
    'p': '#f2d45c',  # 碎花 黄
    'O': '#23232e',  # 腰带黑
    'o': '#a8832a',  # 腰带暗金纹
    'R': '#d64545',  # 注连绳红
    'X': '#a83232',  # 绳暗红
    'T': '#f4f4f8',  # 过膝袜
    't': '#d5d5e2',  # 袜阴影
    'r': '#c0392b',  # 红木屐
    'b': '#7e2418',  # 木屐深色
    'F': '#ff9ebb',  # 头花粉
    'C': '#7fb3ff',  # 头花蓝
}

# C 变体：柔彩渐变（更柔和的色阶）
SOFT_PAL = dict(BASE_PAL, **{
    'H': '#f8e09a', 'h': '#ecc469', 'd': '#dcb04e', 'i': '#fdf5cd',
    'S': '#ffe9d4', 's': '#f5d2b0', 'u': '#f7bcab',
    'w': '#f9f6ee', 'q': '#e8e1d2',
})

# ---------------- 画布 ----------------
class Canvas:
    def __init__(self):
        self.g = [['.'] * W for _ in range(H)]

    def set(self, x, y, ch):
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = ch

    def get(self, x, y):
        if 0 <= x < W and 0 <= y < H:
            return self.g[y][x]
        return '.'

    def rect(self, x0, y0, w, h, ch):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.set(x, y, ch)

    def ellipse(self, cx, cy, rx, ry, ch):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if ((x - cx) / max(rx, 0.1)) ** 2 + ((y - cy) / max(ry, 0.1)) ** 2 <= 1.0:
                    self.set(x, y, ch)

    def rows(self):
        return [''.join(r) for r in self.g]


# ---------------- 部件 ----------------
def ear(c, tip_x, tip_y, black_side=False):
    """猫耳：宽三角，白毛粉内耳；black_side 时右外侧带黑毛（还原参考图右耳）。"""
    widths = [1, 3, 5, 7, 7, 9]  # 从尖到根
    for i, wd in enumerate(widths):
        y = tip_y + i
        x0 = tip_x - wd // 2
        for x in range(x0, x0 + wd):
            c.set(x, y, 'W')
        # 内耳（收窄变短，白毛外圈更厚）
        if 2 <= i <= 4:
            for x in range(x0 + 2, x0 + wd - 2):
                c.set(x, y, 'E')
        if black_side:
            c.set(x0 + wd - 1, y, 'K')
            if i >= 3:
                c.set(x0 + wd - 2, y, 'K')


def flower(c, cx, cy, big=False):
    """粉蓝小花。"""
    if big:
        pts = [(0, -2, 'F'), (-1, -1, 'F'), (0, -1, 'C'), (1, -1, 'F'),
               (-2, 0, 'F'), (-1, 0, 'C'), (0, 0, 'C'), (1, 0, 'F'), (2, 0, 'F'),
               (-1, 1, 'F'), (0, 1, 'F'), (1, 1, 'F'), (0, 2, 'F')]
    else:
        pts = [(0, -1, 'F'), (-1, 0, 'F'), (0, 0, 'C'), (1, 0, 'F'), (0, 1, 'F')]
    for dx, dy, ch in pts:
        c.set(cx + dx, cy + dy, ch)


def eye(c, x, y):
    """2x4 金琥珀眼，右向高光。"""
    c.set(x, y, 'B'); c.set(x, y + 1, 'B'); c.set(x, y + 2, 'B'); c.set(x, y + 3, 'B')
    c.set(x + 1, y, 'y'); c.set(x + 1, y + 1, 'Y'); c.set(x + 1, y + 2, 'Y'); c.set(x + 1, y + 3, 'Y')
    c.set(x + 2, y + 1, 'B'); c.set(x + 2, y + 2, 'B'); c.set(x + 2, y + 3, 'B')


def twin_tail(c, x0, y0, length, streak=False, flower_tip=True, side=1):
    """双马尾：上宽下窄，末端向外微卷，尖端带花。"""
    widths = {0: 5, 1: 6, 2: 6, 3: 6, 4: 6, 5: 6, 6: 5, 7: 5, 8: 5, 9: 5,
              10: 4, 11: 4, 12: 4, 13: 4, 14: 3, 15: 3}
    for i in range(min(length, 16)):
        wd = widths.get(i, 3)
        y = y0 + i
        sway = (1 * side) if i >= 13 else 0
        for x in range(x0 + sway, x0 + wd + sway):
            c.set(x, y, 'H')
        c.set(x0 + wd - 1 + sway, y, 'h')  # 内侧阴影
        if streak and 1 <= i <= 10:
            c.set(x0 + sway, y, 'K')
            if i <= 6:
                c.set(x0 + 1 + sway, y, 'K')
    # 末端卷
    tip_y = y0 + min(length, 16)
    c.set(x0 + 1 * side, tip_y, 'H'); c.set(x0 + 2 * side, tip_y, 'h')
    if flower_tip:
        flower(c, x0 + 2, tip_y + 1)


def rope_side(c, x0, y0, y1, width=3):
    """注连绳：红白交织斜纹，垂到铃铛。"""
    for y in range(y0, y1):
        for i in range(width):
            x = x0 + i
            c.set(x, y, 'R' if (x + y) % 2 == 0 else 'X')


def bell_tassel(c, cx, y, big=False):
    """金铃铛 + 红流苏。"""
    r = 2 if big else 1
    c.ellipse(cx, y + r, r + 1, r + 1, 'L')
    c.ellipse(cx, y + r, r, r, 'G')
    c.set(cx, y + 2 * r + 1, 'B')  # 铃缝
    ty = y + 2 * r + 2
    for i in range(3 if big else 2):
        x = cx - (1 if big else 0) + i
        for y2 in range(ty, min(ty + (3 if big else 2), H)):
            c.set(x, y2, 'R' if (i % 2 == 0) else 'X')


def floral(c, x, y):
    """和服碎花：3px 小簇。"""
    c.set(x, y, 'P'); c.set(x - 1, y + 1, 'P'); c.set(x + 1, y + 1, 'p'); c.set(x, y + 2, 'P')


# ---------------- 变体 A/C/D：精致比例 ----------------
def compose_detailed(ornate=False, gradient=False):
    c = Canvas()

    # --- 双马尾（后发） ---
    twin_tail(c, 5, 12, 16, streak=True, side=-1)   # 左侧带黑色挑染
    twin_tail(c, 37, 12, 16, streak=False, side=1)
    if gradient:
        for y in range(14, 22):
            c.set(6, y, 'i')   # 左尾挑染旁的高光丝
            c.set(8, y, 'i')   # 挑染另一侧过渡
        for y in range(14, 24):
            c.set(42, y, 'i')  # 右尾外侧高光
            c.set(40, y, 'i')

    # --- 后发（头部后层） ---
    c.ellipse(24, 13, 11, 8, 'H')
    c.ellipse(24, 15, 11, 5, 'h')  # 下层阴影

    # --- 腿（坐姿下垂，先画腿再画裙摆） ---
    c.rect(22, 40, 4, 6, 'T'); c.rect(25, 40, 1, 6, 't')
    c.rect(28, 40, 4, 6, 'T'); c.rect(31, 40, 1, 6, 't')
    # 木屐
    c.rect(21, 46, 6, 2, 'r'); c.rect(27, 46, 6, 2, 'r')
    c.rect(21, 47, 6, 1, 'b'); c.rect(27, 47, 6, 1, 'b')
    c.set(24, 46, 'B'); c.set(30, 46, 'B')  # 屐带

    # --- 和服躯干 ---
    c.rect(15, 27, 19, 12, 'w')
    c.rect(15, 38, 21, 4, 'w')              # 裙摆加宽
    c.rect(15, 27, 1, 15, 'q')              # 左侧阴影
    c.rect(35, 38, 1, 4, 'q')
    # 大袖子（收窄，避免方块感）
    c.rect(8, 27, 6, 10, 'w'); c.rect(34, 27, 6, 10, 'w')
    c.rect(8, 27, 1, 10, 'q'); c.rect(39, 27, 1, 10, 'q')
    # 袖口与袖缘金边
    c.rect(8, 36, 6, 1, 'G'); c.rect(34, 36, 6, 1, 'G')
    c.rect(7, 28, 1, 8, 'G'); c.rect(40, 28, 1, 8, 'G')
    if ornate:
        c.rect(13, 28, 1, 8, 'G'); c.rect(34, 28, 1, 8, 'G')  # 袖内缘金边
    # 裙摆金边
    c.rect(15, 41, 21, 1, 'G')
    # 黑色内衬前片（带花，避开两腿之间）
    c.rect(29, 36, 4, 5, 'O')
    floral(c, 30, 37); c.set(32, 39, 'p')
    # 躯干碎花
    floral(c, 18, 29); floral(c, 22, 33)
    c.set(20, 36, 'p')
    # 袖子碎花
    floral(c, 9, 29); floral(c, 11, 33)
    floral(c, 36, 29); floral(c, 38, 33)
    if ornate:
        floral(c, 12, 28); floral(c, 35, 28); c.set(10, 35, 'p'); c.set(37, 35, 'p')

    # --- 腰带（黑金 + 大金结） ---
    c.rect(15, 31, 19, 4, 'O')
    c.rect(15, 31, 19, 1, 'g')
    for x in (17, 21, 25, 31):
        c.set(x, 33, 'o')
    # 大金结（右侧，面向前方）
    kx = 27
    c.rect(kx - 1, 30, 5, 6, 'G')
    c.set(kx, 31, 'L'); c.set(kx + 2, 31, 'L')
    c.set(kx - 1, 32, 'L'); c.set(kx + 3, 32, 'L')
    c.set(kx, 34, 'g'); c.set(kx + 2, 34, 'g')
    c.set(kx + 1, 32, 'L'); c.set(kx + 1, 33, 'L')
    c.rect(kx, 36, 1, 3, 'R'); c.rect(kx + 2, 36, 1, 3, 'X')  # 结下垂绳
    if ornate:
        c.set(kx - 2, 31, 'L'); c.set(kx + 4, 33, 'L')  # 更大金结

    # --- 注连绳（垂在和服前面，过肩） ---
    rw = 4 if ornate else 3
    rope_side(c, 9 if ornate else 10, 27, 40, rw)
    rope_side(c, 35, 27, 40, rw)
    # 过肩部分
    c.rect(12, 24, 4, 3, 'R'); c.rect(33, 24, 4, 3, 'R')
    c.set(13, 24, 'X'); c.set(35, 24, 'X')

    # --- 颈 & 露肩 ---
    c.rect(23, 21, 3, 3, 'S')
    c.rect(16, 23, 17, 2, 'S')              # 肩部皮肤
    c.set(16, 24, 's'); c.set(32, 24, 's')
    # 衣领：金边 + 黑内衬（露肩宽领）
    c.rect(14, 25, 21, 1, 'G')
    c.rect(15, 26, 19, 1, 'O')
    # 胸前留白
    c.rect(20, 25, 8, 2, 'S')

    # --- 铃铛项圈 ---
    c.rect(20, 22, 9, 1, 'R')
    c.rect(23, 23, 3, 2, 'L'); c.set(24, 25, 'B')
    if ornate:
        c.rect(22, 23, 5, 2, 'L'); c.rect(23, 25, 3, 1, 'G'); c.set(24, 26, 'B')

    # --- 头部 ---
    c.ellipse(26, 15, 8, 7, 'S')            # 脸（偏右，面向右）
    c.set(26, 21, 's'); c.set(27, 21, 's')
    # 刘海
    for x in range(15, 35):
        depth = 13 + (1 if x % 3 == 0 else 0)
        for y in range(8, depth + 1):
            c.set(x, y, 'H')
    # 刘海阴影层
    for x in range(16, 34):
        if x % 4 == 0:
            c.set(x, 13, 'h')
    # 黑色挑染（刘海右侧大块 + 参考图右上方黑毛）
    c.ellipse(31, 10, 4, 4, 'K')
    c.set(29, 8, 'k'); c.set(33, 9, 'k')
    c.set(30, 13, 'K'); c.set(31, 13, 'K'); c.set(32, 13, 'h')
    # 两侧垂发
    c.rect(14, 13, 2, 8, 'H'); c.set(15, 20, 'h')
    c.rect(34, 13, 2, 8, 'H'); c.set(34, 20, 'h')
    # 头顶高光
    for x in range(18, 26):
        if c.get(x, 6) == 'H':
            c.set(x, 6, 'i')
    if gradient:
        for x in range(17, 21):
            c.set(x, 9, 'i'); c.set(x, 10, 'i')
        c.set(22, 7, 'i'); c.set(23, 7, 'i')

    # --- 猫耳 ---
    ear(c, 17, 2, black_side=False)
    ear(c, 33, 2, black_side=True)
    # 右耳小花（粉蓝）
    flower(c, 38, 4, big=ornate)
    if ornate:
        flower(c, 40, 7)  # 第二朵小花

    # --- 五官 ---
    eye(c, 22, 14)
    eye(c, 29, 14)
    c.set(22, 12, 'd'); c.set(23, 12, 'd')  # 眉
    c.set(29, 12, 'd'); c.set(30, 12, 'd')
    # 虎牙笑
    c.set(26, 19, 'B'); c.set(27, 19, 'B'); c.set(28, 19, 'B')
    c.set(27, 20, 'W')
    # 腮红
    c.set(19, 17, 'u'); c.set(20, 17, 'u')
    c.set(32, 17, 'u'); c.set(33, 17, 'u')

    # --- 铃铛与流苏 ---
    bell_tassel(c, 10 if ornate else 11, 40, big=ornate)
    bell_tassel(c, 37, 40, big=ornate)

    # --- 华丽变体追加：发簪（贴近左耳发边） ---
    if ornate:
        c.rect(13, 5, 1, 4, 'R')            # 簪杆
        c.set(13, 4, 'L'); c.set(12, 5, 'L'); c.set(14, 5, 'L'); c.set(13, 6, 'G')

    return c.rows()


# ---------------- 变体 B：Q版大头 ----------------
def compose_chibi():
    c = Canvas()

    # 双马尾（短胖）
    for x0 in (7, 35):
        for i, wd in enumerate([5, 6, 6, 6, 6, 5, 5, 4, 4, 3]):
            y = 13 + i
            for x in range(x0, x0 + wd):
                c.set(x, y, 'H')
            c.set(x0 + wd - 1, y, 'h')
        c.set(x0 + 1, 23, 'H'); c.set(x0 + 2, 23, 'h')
        flower(c, x0 + 2, 25)
    # 左尾挑染
    for y in range(14, 21):
        c.set(7, y, 'K'); c.set(8, y, 'K' if y < 18 else 'k')

    # 大头后发
    c.ellipse(24, 14, 13, 10, 'H')
    c.ellipse(24, 17, 13, 6, 'h')

    # 绳（细，画在和服前面）
    # 小身体和服
    c.rect(16, 28, 17, 9, 'w')
    c.rect(16, 28, 1, 9, 'q')
    c.rect(12, 29, 4, 6, 'w'); c.rect(33, 29, 4, 6, 'w')  # 小袖子
    c.rect(12, 34, 4, 1, 'G'); c.rect(33, 34, 4, 1, 'G')
    floral(c, 18, 30); floral(c, 34, 30); c.set(14, 32, 'P'); c.set(29, 30, 'p')
    c.rect(28, 33, 4, 4, 'O'); c.set(29, 34, 'P'); c.set(30, 35, 'p')

    # 腰带 + 金结
    c.rect(16, 31, 17, 3, 'O')
    c.rect(16, 31, 17, 1, 'g')
    c.rect(25, 30, 4, 4, 'G'); c.set(26, 31, 'L'); c.set(27, 32, 'L')
    c.rect(26, 34, 1, 2, 'R')

    # 绳（前置，垂在袖子外侧）
    rope_side(c, 10, 28, 38, 2)
    rope_side(c, 37, 28, 38, 2)
    c.rect(12, 26, 3, 2, 'R'); c.rect(34, 26, 3, 2, 'R')

    # 腿（短）
    c.rect(21, 37, 4, 5, 'T'); c.rect(27, 37, 4, 5, 'T')
    c.rect(24, 37, 1, 5, 't'); c.rect(30, 37, 1, 5, 't')
    c.rect(20, 42, 6, 2, 'r'); c.rect(26, 42, 6, 2, 'r')
    c.rect(20, 43, 6, 1, 'b'); c.rect(26, 43, 6, 1, 'b')

    # 露肩 + 领
    c.rect(17, 26, 15, 2, 'S')
    c.rect(15, 27, 19, 1, 'G')
    c.rect(21, 27, 6, 1, 'S')

    # 项圈铃铛
    c.rect(20, 25, 8, 1, 'R')
    c.rect(23, 26, 3, 2, 'L'); c.set(24, 27, 'B')

    # 大脸
    c.ellipse(26, 16, 10, 8, 'S')
    # 刘海
    for x in range(13, 37):
        depth = 12 + (1 if x % 3 == 0 else 0)
        for y in range(6, depth + 1):
            c.set(x, y, 'H')
    # 黑色挑染
    c.ellipse(31, 8, 4, 3, 'K')
    c.set(29, 6, 'k'); c.set(31, 12, 'K'); c.set(32, 12, 'K')
    # 垂发
    c.rect(12, 12, 2, 7, 'H'); c.rect(36, 12, 2, 7, 'H')

    # 猫耳（大）
    ear(c, 16, 1)
    ear(c, 33, 1, black_side=True)
    flower(c, 38, 3)

    # 大眼睛（金色占比更大，避免黑条感）
    for ex in (20, 28):
        c.rect(ex, 13, 1, 5, 'B')
        c.rect(ex + 1, 14, 2, 3, 'Y')
        c.set(ex + 1, 13, 'y'); c.set(ex + 2, 13, 'y')
        c.rect(ex + 3, 14, 1, 4, 'B')
        c.set(ex + 1, 17, 'B'); c.set(ex + 2, 17, 'B')
    c.set(20, 11, 'd'); c.set(21, 11, 'd'); c.set(28, 11, 'd'); c.set(29, 11, 'd')
    # 虎牙笑
    c.rect(24, 20, 4, 1, 'B'); c.set(25, 21, 'W'); c.set(26, 21, 'M')
    c.set(17, 18, 'u'); c.set(18, 18, 'u'); c.set(33, 18, 'u'); c.set(34, 18, 'u')

    # 铃铛流苏
    bell_tassel(c, 12, 38)
    bell_tassel(c, 36, 38)

    return c.rows()


# ---------------- 当前版本（对比用，从 sprite.ts 复制的 32x32） ----------------
CURRENT_GRID = [
    '................................',
    '.......WW..........WW...........',
    '......WEEW........WEEW..........',
    '......WEEWFf......WEEW..........',
    '....HHHHHHHHHHHHHHHHHHHH........',
    '...HHHHHHHHHHHHHHHHHHHHHH.......',
    '..HHKHHHHHHHHHHHHHHHHHHHHH......',
    '..HKHHHSSSSSSSSSSSSSSHHHHH......',
    '.HKHHHHSSSSSSSSSSSSSSHHHHH......',
    '.HKHHHSSYBBSSSSSSYBBSsHHHHH.....',
    '.HHHHHSSYBSSSSSSSYBSSsHHHHH.....',
    '.HHHHHSSSSSSSSSSSSSSSSsHHHH.....',
    '.HHHHHSSSSSSWBWSSSSSSsHHHH......',
    '..HHHHSSSSSSSSSSSSSSsHHHH.......',
    '..HHHHHsSSSSSSSSSSssHHHHH.......',
    '...HHHHHLLLLLLLLLLHHHHH.........',
    '..RRRRwwwwwwwwwwwwwwRRRR........',
    '.RLRLwwGGwwwwwwwwGGwwRLRL.......',
    '.RRRRwwwwwpwwwwwwpwwwRRRR........',
    '..KHwwwwwPwwwwwwPwwwwwHH........',
    '..KHwwwwwwwwwwwwwwwwwwHH........',
    '..KHooggggggggggggggooHH........',
    '...KoogGGGGGGGGGGGGgooH.........',
    '...HwwwwwwwPwwwwwwwwwwH.........',
    '....wwwwwwwwpwwwwwwww...........',
    '....wwwwwPwwwwwwwwwww...........',
    '.....wwwwwTTTTTTTTww............',
    '..........TTTTTTTTTTT...........',
    '..........TTTTTTTTTTT...........',
    '..........TTTTTTTTTTT...........',
    '..........rrrrrrrrrrr...........',
    '................................',
]
CURRENT_PAL = {
    'H': '#f2cf7a', 'h': '#d9ad4e', 'K': '#2b2b33', 'W': '#ffffff',
    'E': '#f7a8c0', 'F': '#ff8fb3', 'f': '#7fb3ff', 'S': '#ffe3c9',
    's': '#f0c8a0', 'Y': '#f2b134', 'B': '#14141c', 'w': '#f5f2e8',
    'G': '#e8b93e', 'P': '#ffb3c8', 'p': '#f2d45c', 'o': '#23232e',
    'g': '#e8b93e', 'R': '#d64545', 'L': '#ffd24a', 'T': '#f0f0f5',
    'r': '#c0392b',
}


# ---------------- 变体定义 ----------------
def build_variants():
    return [
        {
            'id': 'refined',
            'name': 'A · 精致还原系',
            'description': '贴近参考图的标准比例：碎花和服、黑金腰带大金结、双耳不对称（右耳黑毛+粉蓝花）、注连绳垂铃，细节最全。',
            'grid': compose_detailed(),
            'palette': BASE_PAL,
        },
        {
            'id': 'chibi',
            'name': 'B · Q版大头系',
            'description': '二头身 Q 版：大头大眼短马尾，元素精简但辨识度极高，小尺寸下最清晰可爱。',
            'grid': compose_chibi(),
            'palette': BASE_PAL,
        },
        {
            'id': 'gradient',
            'name': 'C · 柔彩渐变系',
            'description': '在精致版基础上加入多档发色高光丝与更柔和的色阶，发丝有光泽流动感，整体色调更软更甜。',
            'grid': compose_detailed(gradient=True),
            'palette': SOFT_PAL,
        },
        {
            'id': 'ornate',
            'name': 'D · 华丽装饰系',
            'description': '装饰最大化：加大头花与金发簪、更粗的注连绳与大铃铛长流苏、双倍碎花与袖内金边，华丽抢眼。',
            'grid': compose_detailed(ornate=True),
            'palette': BASE_PAL,
        },
    ]


# ---------------- 渲染 ----------------
def load_font(size):
    candidates = [
        r'C:\Windows\Fonts\msyh.ttc',
        r'C:\Windows\Fonts\msyhbd.ttc',
        r'C:\Windows\Fonts\simhei.ttf',
        r'C:\Windows\Fonts\simsun.ttc',
        r'C:\Windows\Fonts\Deng.ttf',
    ]
    from PIL import ImageFont
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def render_grid(grid, palette, scale):
    from PIL import Image
    h = len(grid)
    w = max(len(r) for r in grid)
    img = Image.new('RGBA', (w * scale, h * scale), (0, 0, 0, 0))
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

    variants = build_variants()

    # 导出 JSON
    out_json = os.path.join(ROOT, 'src', 'game', 'sprite-variants.json')
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(variants, f, ensure_ascii=False, indent=2)
    print('JSON ->', out_json)

    # ---- 联系表 ----
    BG = (26, 26, 38, 255)
    CELL_W = 520
    SCALE = 10
    BIG = 48 * SCALE
    SMALL_H = 36  # 实机尺寸
    SMALL_SHOW = SMALL_H * 4
    title_h, name_h, desc_h, small_label_h = 56, 40, 66, 30
    top_h = title_h + name_h + BIG + desc_h
    total_h = top_h + small_label_h + SMALL_SHOW + 30

    cols = [('current', '当前版本 (32px)', '游戏内现用 sprite，供对比', CURRENT_GRID, CURRENT_PAL)] + [
        (v['id'], v['name'], v['description'], v['grid'], v['palette']) for v in variants
    ]

    sheet = Image.new('RGBA', (CELL_W * len(cols), total_h), BG)
    draw = ImageDraw.Draw(sheet)
    f_title = load_font(30)
    f_name = load_font(22)
    f_desc = load_font(15)
    f_small = load_font(15)

    draw.text((16, 12), '小玉 Sprite 旧变体预览（10x）+ 实机尺寸测试', font=f_title, fill=(255, 210, 74))

    for i, (_id, name, desc, grid, pal) in enumerate(cols):
        ox = i * CELL_W + (CELL_W - BIG) // 2
        # 名称与描述
        draw.text((i * CELL_W + 16, title_h - 6), name, font=f_name, fill=(255, 255, 255))
        # 描述换行
        line, lines = '', []
        for ch in desc:
            line += ch
            if draw.textlength(line, font=f_desc) > CELL_W - 40:
                lines.append(line)
                line = ''
        if line:
            lines.append(line)
        for j, ln in enumerate(lines[:3]):
            draw.text((i * CELL_W + 16, title_h + name_h + BIG + 4 + j * 20), ln,
                      font=f_desc, fill=(170, 170, 200))
        # 大图（棋盘格底表现透明）
        big = render_grid(grid, pal, SCALE)
        checker = Image.new('RGBA', (BIG, BIG), (32, 32, 48, 255))
        cd = ImageDraw.Draw(checker)
        for yy in range(0, BIG, 16):
            for xx in range(0, BIG, 16):
                if (xx // 16 + yy // 16) % 2 == 0:
                    cd.rectangle([xx, yy, xx + 15, yy + 15], fill=(40, 40, 58, 255))
        checker.paste(big, (0, 0), big)
        sheet.paste(checker, (ox, title_h + name_h))
        draw.rectangle([ox, title_h + name_h, ox + BIG - 1, title_h + name_h + BIG - 1],
                       outline=(74, 74, 106))

        # 实机尺寸：最近邻缩到 36px 高，再放大 4 倍显示
        src = render_grid(grid, pal, 1)
        ratio = SMALL_H / src.height
        small = src.resize((max(1, round(src.width * ratio)), SMALL_H), Image.NEAREST)
        show = small.resize((small.width * 4, SMALL_SHOW), Image.NEAREST)
        sx = i * CELL_W + (CELL_W - show.width) // 2
        sy = top_h + small_label_h
        draw.text((i * CELL_W + 16, top_h + 4), f'实机尺寸 ~{SMALL_H}px 高 (4x 放大显示)',
                  font=f_small, fill=(140, 200, 255))
        frame = Image.new('RGBA', (show.width + 8, SMALL_SHOW + 8), (32, 32, 48, 255))
        frame.paste(show, (4, 4), show)
        sheet.paste(frame, (sx - 4, sy))
        draw.rectangle([sx - 4, sy, sx + show.width + 3, sy + SMALL_SHOW + 7],
                       outline=(74, 74, 106))

    out_png = os.path.join(ROOT, 'sprite-preview.png')
    sheet.convert('RGB').save(out_png)
    print('PNG ->', out_png, sheet.size)

    # 校验网格尺寸与字符
    for v in variants:
        used = {ch for row in v['grid'] for ch in row if ch != '.'}
        missing = used - set(v['palette'])
        assert not missing, f"{v['id']} 缺色: {missing}"
        widths = {len(r) for r in v['grid']}
        print(v['id'], 'rows=', len(v['grid']), 'widths=', sorted(widths), 'chars=', len(used))


if __name__ == '__main__':
    main()
