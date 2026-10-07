# -*- coding: utf-8 -*-
"""小玉 48x48 像素 sprite 生成器（基于 reference-xiaoyu.jpg）。
- 渲染预览 sprite-xiaoyu-preview.png（10x 大图 + ~40px 实机尺寸 + 参考图对照）
- 直接重写 src/game/sprite.ts（保持原有文件格式：调色板 + 字符串网格 + drawSprite）
"""
import os

W = H = 48
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- 调色板 ----------------
PAL = {
    'H': '#f7dd8e',  # 奶油金发
    'h': '#e6bd5a',  # 金发阴影
    'd': '#caa03e',  # 金发深影
    'i': '#fdf3c8',  # 金发高光
    'K': '#26262e',  # 黑色补丁（三毛猫）
    'k': '#4a4a56',  # 黑毛高光
    'W': '#ffffff',  # 白毛/虎牙/白雏菊
    'E': '#f7a8c0',  # 内耳粉
    'S': '#ffe9d2',  # 皮肤
    's': '#f2cba4',  # 皮肤阴影
    'u': '#f5b09a',  # 腮红
    'Y': '#f2b134',  # 金琥珀眼
    'y': '#ffe08a',  # 眼睛高光
    'B': '#1c1c26',  # 黑线
    'M': '#c95a5a',  # 口腔红
    'w': '#f8f4ea',  # 和服白
    'q': '#e4dcc9',  # 和服阴影
    'G': '#e8b93e',  # 金边
    'g': '#b98a24',  # 暗金
    'L': '#ffd24a',  # 铃铛金
    'P': '#ffb3c8',  # 碎花 粉
    'p': '#f2d45c',  # 碎花 黄
    'O': '#23232e',  # 黑（领口/袖口/腰带边/前片）
    'R': '#d64545',  # 注连绳红 / 红腰带
    'X': '#a83232',  # 绳暗红
    'T': '#f4f4f8',  # 过膝袜
    't': '#d5d5e2',  # 袜阴影
    'r': '#c0392b',  # 红木屐
    'b': '#7e2418',  # 木屐深色
    'F': '#ff9ebb',  # 头花粉
    'C': '#7fb3ff',  # 头花蓝
    'v': '#6aa84f',  # 花叶绿
    'a': '#4fc3a1',  # 挂饰青
}


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


def flower_small(c, cx, cy, petal='F', center='p'):
    c.set(cx, cy - 1, petal)
    c.set(cx - 1, cy, petal); c.set(cx, cy, center); c.set(cx + 1, cy, petal)
    c.set(cx, cy + 1, petal)


def corsage(c, cx, cy):
    """右耳大花饰：粉+白+蓝小花 + 绿叶 + 金链坠。"""
    # 绿叶底
    c.set(cx - 2, cy + 1, 'v'); c.set(cx + 3, cy, 'v'); c.set(cx + 1, cy + 3, 'v')
    c.set(cx - 1, cy - 2, 'v')
    # 大粉花
    flower_small(c, cx + 1, cy, 'F', 'M')
    c.set(cx + 2, cy - 1, 'F'); c.set(cx + 2, cy + 1, 'F')
    # 白雏菊
    flower_small(c, cx - 1, cy - 2, 'W', 'p')
    # 蓝小花
    flower_small(c, cx + 2, cy - 3, 'C', 'W')
    c.set(cx - 2, cy - 3, 'C')
    # 金链坠（垂到发上）
    c.set(cx + 1, cy + 2, 'L'); c.set(cx + 1, cy + 3, 'L'); c.set(cx + 1, cy + 4, 'C')
    c.set(cx - 1, cy + 2, 'L'); c.set(cx - 1, cy + 3, 'p')


def eye(c, x, y):
    """金琥珀眼 3 宽。"""
    c.set(x, y, 'B'); c.set(x, y + 1, 'B'); c.set(x, y + 2, 'B'); c.set(x, y + 3, 'B')
    c.set(x + 1, y, 'y'); c.set(x + 1, y + 1, 'Y'); c.set(x + 1, y + 2, 'Y'); c.set(x + 1, y + 3, 'Y')
    c.set(x + 2, y + 1, 'B'); c.set(x + 2, y + 2, 'B'); c.set(x + 2, y + 3, 'B')


def eye_happy(c, x, y):
    """兴奋闭眼 ^^（加粗弧线）"""
    c.set(x, y + 2, 'B'); c.set(x + 1, y + 1, 'B'); c.set(x + 2, y + 2, 'B')
    c.set(x, y + 3, 'B'); c.set(x + 2, y + 3, 'B')


def rope_side(c, x0, y0, y1, width=3):
    for y in range(y0, y1):
        for i in range(width):
            x = x0 + i
            c.set(x, y, 'R' if (x + y) % 2 == 0 else 'X')


def paired_bells(c, x0, y):
    """成对金铃 + 红流苏。"""
    for bx in (x0, x0 + 3):
        c.set(bx, y, 'g'); c.set(bx + 1, y, 'g')
        c.set(bx, y + 1, 'L'); c.set(bx + 1, y + 1, 'L')
        c.set(bx, y + 2, 'L'); c.set(bx + 1, y + 2, 'L')
        c.set(bx, y + 3, 'g'); c.set(bx + 1, y + 3, 'B')
    # 流苏
    for i in range(4):
        x = x0 + i
        for y2 in range(y + 4, min(y + 7, H)):
            c.set(x, y2, 'R' if i % 2 == 0 else 'X')


def floral(c, x, y, main='P'):
    c.set(x, y, main); c.set(x - 1, y + 1, main)
    c.set(x + 1, y + 1, 'p' if main == 'P' else 'P'); c.set(x, y + 2, main)


def compose(excited=False):
    c = Canvas()

    # ---- 后发 ----
    c.ellipse(24, 12, 11, 8, 'H')
    c.ellipse(24, 15, 11, 5, 'h')

    # ---- 两侧短卷发（贴脸，末端卷 + 花结） ----
    # 左
    for y in range(13, 21):
        c.set(13, y, 'H'); c.set(14, y, 'H'); c.set(15, y, 'h')
    c.set(13, 21, 'H'); c.set(14, 21, 'h'); c.set(14, 22, 'H')
    flower_small(c, 14, 24, 'F', 'p')
    # 右（上半带黑毛）
    for y in range(13, 21):
        c.set(33, y, 'K' if y <= 16 else 'H')
        c.set(34, y, 'H'); c.set(35, y, 'h')
    c.set(34, 21, 'H'); c.set(35, 21, 'h'); c.set(34, 22, 'H')
    flower_small(c, 34, 24, 'F', 'p')

    # ---- 注连绳（过肩垂落，画在和服前） ----
    rope_side(c, 10, 27, 41, 3)
    rope_side(c, 36, 27, 41, 3)
    c.rect(12, 25, 4, 2, 'R'); c.rect(33, 25, 4, 2, 'R')
    c.set(13, 25, 'X'); c.set(35, 25, 'X')

    # ---- 腿 + 木屐 ----
    c.rect(22, 41, 4, 5, 'T'); c.rect(25, 41, 1, 5, 't')
    c.rect(28, 41, 4, 5, 'T'); c.rect(31, 41, 1, 5, 't')
    c.rect(21, 46, 6, 1, 'r'); c.rect(27, 46, 6, 1, 'r')
    c.rect(21, 47, 6, 1, 'b'); c.rect(27, 47, 6, 1, 'b')
    c.set(24, 45, 'b'); c.set(30, 45, 'b')  # 屐带（深色人字带）

    # ---- 和服躯干 ----
    c.rect(15, 28, 19, 12, 'w')
    c.rect(15, 38, 21, 3, 'w')              # 裙摆
    c.rect(15, 28, 1, 13, 'q')
    c.rect(35, 38, 1, 3, 'q')
    c.rect(15, 40, 21, 1, 'G')              # 裙摆金边
    # 大袖子（黑袖口 + 金边）
    c.rect(8, 28, 6, 9, 'w'); c.rect(34, 28, 6, 9, 'w')
    c.rect(8, 28, 1, 9, 'q'); c.rect(39, 28, 1, 9, 'q')
    c.rect(8, 36, 6, 1, 'G'); c.rect(34, 36, 6, 1, 'G')
    c.rect(8, 37, 6, 1, 'O'); c.rect(34, 37, 6, 1, 'O')
    c.rect(7, 29, 1, 7, 'G'); c.rect(40, 29, 1, 7, 'G')
    # 黑色前片（金花纹）
    c.rect(29, 36, 4, 5, 'O')
    c.set(30, 37, 'G'); c.set(31, 38, 'p'); c.set(30, 39, 'G'); c.set(32, 37, 'p')
    # 碎花
    floral(c, 18, 29); floral(c, 22, 33)
    c.set(20, 36, 'p')
    floral(c, 9, 30); floral(c, 11, 33)
    floral(c, 36, 30); floral(c, 38, 33)

    # ---- 腰带：红底碎花 + 黑金边 + 大金饰结 + 小挂饰 ----
    c.rect(15, 30, 19, 1, 'G')
    c.rect(15, 31, 19, 1, 'O')
    c.rect(15, 32, 19, 2, 'R')
    c.set(18, 32, 'P'); c.set(22, 33, 'W'); c.set(25, 32, 'p')
    c.rect(15, 34, 19, 1, 'O')
    c.rect(15, 35, 19, 1, 'G')
    # 大金饰结（右前）
    kx = 28
    c.rect(kx - 1, 30, 5, 6, 'G')
    c.set(kx, 31, 'L'); c.set(kx + 2, 31, 'L')
    c.set(kx - 1, 32, 'L'); c.set(kx + 3, 32, 'L')
    c.set(kx + 1, 32, 'R'); c.set(kx + 1, 33, 'R')  # 红心
    c.set(kx, 34, 'g'); c.set(kx + 2, 34, 'g')
    # 放射绳
    c.set(kx - 2, 31, 'R'); c.set(kx + 4, 31, 'R')
    # 小挂饰
    c.rect(23, 36, 1, 2, 'R'); c.rect(25, 36, 1, 2, 'R')
    c.rect(22, 38, 2, 2, 'a'); c.rect(25, 38, 2, 2, 'C')
    c.set(22, 39, 'p'); c.set(25, 39, 'W')

    # ---- 颈 & 露肩 & 衣领 ----
    c.rect(23, 21, 3, 2, 'S')
    c.rect(16, 23, 17, 2, 'S')
    c.set(16, 24, 's'); c.set(32, 24, 's')
    c.rect(14, 25, 21, 1, 'G')              # 领金边
    c.rect(15, 26, 19, 1, 'O')              # 黑领
    c.rect(16, 27, 17, 1, 'G')
    c.rect(20, 25, 8, 3, 'S')               # 胸前留白

    # ---- 红项圈 + 金铃 ----
    c.rect(20, 22, 9, 1, 'R')
    c.set(20, 22, 'X'); c.set(28, 22, 'X')
    c.rect(23, 23, 3, 2, 'L')
    c.rect(23, 23, 3, 1, 'g') if False else None
    c.set(23, 23, 'g'); c.set(25, 23, 'g'); c.set(24, 25, 'B')

    # ---- 头部 ----
    c.ellipse(26, 15, 8, 7, 'S')
    c.set(26, 21, 's'); c.set(27, 21, 's')
    # 刘海
    for x in range(15, 35):
        depth = 13 + (1 if x % 3 == 0 else 0)
        for y in range(8, depth + 1):
            c.set(x, y, 'H')
    for x in range(16, 34):
        if x % 4 == 0:
            c.set(x, 13, 'h')
    # 大黑色补丁（三毛猫：盖住头顶右半 + 右侧，下缘碎发过渡）
    c.ellipse(30, 9, 5, 5, 'K')
    c.set(31, 12, 'K'); c.set(32, 12, 'K'); c.set(33, 12, 'K'); c.set(34, 12, 'K')
    c.set(30, 13, 'K'); c.set(32, 13, 'K'); c.set(34, 13, 'K')
    c.set(27, 13, 'K'); c.set(28, 13, 'K'); c.set(31, 14, 'K'); c.set(33, 14, 'K')
    c.set(28, 6, 'k'); c.set(33, 8, 'k')
    # 头顶高光
    for x in range(17, 24):
        if c.get(x, 6) == 'H':
            c.set(x, 6, 'i')
    c.set(19, 8, 'i'); c.set(20, 8, 'i')

    # ---- 猫耳 ----
    # 左耳：白毛粉内耳 + 小蓝花
    widths = [1, 3, 5, 7, 9, 9]
    for i, wd in enumerate(widths):
        y = 2 + i
        x0 = 17 - wd // 2
        for x in range(x0, x0 + wd):
            c.set(x, y, 'W')
        if 2 <= i <= 4:
            for x in range(x0 + 2, x0 + wd - 2):
                c.set(x, y, 'E')
    flower_small(c, 14, 4, 'C', 'W')        # 左耳小蓝花（贴在耳缘）
    # 右耳：黑毛
    for i, wd in enumerate(widths):
        y = 2 + i
        x0 = 33 - wd // 2
        for x in range(x0, x0 + wd):
            c.set(x, y, 'K')
        if 2 <= i <= 4:
            for x in range(x0 + 2, x0 + wd - 2):
                c.set(x, y, 'k')
    c.set(30, 2, 'W'); c.set(31, 3, 'W')    # 耳尖白梢
    # 右耳大花饰（压在耳侧发上）
    corsage(c, 36, 5)

    # ---- 五官 ----
    if excited:
        eye_happy(c, 21, 14)
        eye_happy(c, 29, 14)
        # 张嘴笑
        c.set(25, 19, 'B'); c.set(26, 19, 'W'); c.set(27, 19, 'W'); c.set(28, 19, 'B')
        c.set(25, 20, 'M'); c.set(26, 20, 'M'); c.set(27, 20, 'M'); c.set(28, 20, 'B')
    else:
        eye(c, 21, 14)
        eye(c, 29, 14)
        # 小开口笑 + 虎牙
        c.set(25, 19, 'B'); c.set(26, 19, 'W'); c.set(27, 19, 'B')
        c.set(26, 20, 'M')
    c.set(21, 12, 'd'); c.set(22, 12, 'd')
    c.set(29, 12, 'd'); c.set(30, 12, 'd')
    c.set(19, 17, 'u'); c.set(20, 17, 'u')
    c.set(31, 17, 'u'); c.set(32, 17, 'u')

    # ---- 成对金铃 + 流苏 ----
    paired_bells(c, 9, 41)
    paired_bells(c, 34, 41)

    return c.rows()


# ---------------- sprite.ts 模板 ----------------
TS_TEMPLATE = '''// 手绘像素角色精灵：猫娘"小玉"（字符串网格调色板定义，无外部素材）
// 48x48 坐姿垂钓 sprite（面向右侧水面），钓竿由场景代码程序化绘制
// 形象依据 reference-xiaoyu.jpg：奶油金发 + 三毛猫大黑斑、右耳花饰、红项圈金铃、
// 露肩白和服（黑金领口/袖口 + 碎花 + 黑金前片）、红腰带大金结、注连绳成对金铃红流苏

export type SpriteGrid = string[]

// 调色板
export const NEKO_PALETTE: Record<string, string> = {
{PALETTE}
}

// 48x48 坐姿垂钓 sprite（面向右侧水面）
export const NEKO_IDLE: SpriteGrid = [
{IDLE}
]

// 钓到鱼时的兴奋姿势：闭眼笑 + 张嘴笑
export const NEKO_EXCITED: SpriteGrid = [
{EXCITED}
]

export const PIG_PALETTE: Record<string, string> = {
  P: '#ffb3c8',
  p: '#ff9eb8',
  B: '#14141c',
  n: '#ff7ba3',
  W: '#ffffff',
}

// 粉色猪猪气球
export const PIG_BALLOON: SpriteGrid = [
  '....PP......PP....',
  '...PPPP....PPPP...',
  '...PPPPPPPPPPPP...',
  '..PPPPPPPPPPPPPP..',
  '..PPBPPPPPPPPBPP..',
  '..PPPPPnnnnPPPPP..',
  '..PPPPPnnnnPPPPP..',
  '..PPPPPPPPPPPPPP..',
  '...PPPPPPPPPPPP...',
  '....PPPPPPPPPP....',
]

/** 通用像素精灵绘制：'.' 为透明。自动容忍行宽不一致。 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  grid: SpriteGrid,
  palette: Record<string, string>,
  x: number,
  y: number,
  scale: number,
) {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      if (ch === '.') continue
      const color = palette[ch]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale)
    }
  }
}
'''

PAL_COMMENTS = {
    'H': '奶油金发', 'h': '金发阴影', 'd': '金发深影', 'i': '金发高光',
    'K': '三毛猫黑色补丁', 'k': '黑毛高光', 'W': '白毛/虎牙/白雏菊',
    'E': '内耳粉', 'S': '皮肤', 's': '皮肤阴影', 'u': '腮红',
    'Y': '金琥珀眼', 'y': '眼睛高光', 'B': '黑线', 'M': '口腔红',
    'w': '和服白', 'q': '和服阴影', 'G': '金边', 'g': '暗金',
    'L': '铃铛金', 'P': '碎花 粉', 'p': '碎花 黄',
    'O': '黑（领口/袖口/腰带边/前片）', 'R': '注连绳红/红腰带',
    'X': '绳暗红', 'T': '过膝袜', 't': '袜阴影', 'r': '红木屐',
    'b': '木屐深色', 'F': '头花粉', 'C': '头花蓝', 'v': '花叶绿',
    'a': '挂饰青',
}


def write_ts(idle, excited):
    pal_lines = '\n'.join(
        f"  {ch}: '{color}', // {PAL_COMMENTS.get(ch, '')}" for ch, color in PAL.items()
    )
    idle_lines = '\n'.join(f"  '{r}'," for r in idle)
    exc_lines = '\n'.join(f"  '{r}'," for r in excited)
    content = (TS_TEMPLATE
               .replace('{PALETTE}', pal_lines)
               .replace('{IDLE}', idle_lines)
               .replace('{EXCITED}', exc_lines))
    path = os.path.join(ROOT, 'src', 'game', 'sprite.ts')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('TS ->', path)


# ---------------- 渲染 ----------------
def load_font(size):
    from PIL import ImageFont
    for p in [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\msyhbd.ttc',
              r'C:\Windows\Fonts\simhei.ttf', r'C:\Windows\Fonts\Deng.ttf']:
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


def main(write=False):
    from PIL import Image, ImageDraw

    idle = compose(excited=False)
    excited = compose(excited=True)

    if write:
        write_ts(idle, excited)

    # ---- 预览：参考图 | 待机动画 10x | 兴奋 10x | 实机尺寸 ----
    BG = (26, 26, 38, 255)
    SCALE = 10
    BIG = 48 * SCALE
    GAME_H = 40
    GAME_SHOW = GAME_H * 4

    ref_path = os.path.join(ROOT, 'reference-xiaoyu.jpg')
    ref = Image.open(ref_path).convert('RGBA')
    # 截取角色主体（头+上半身+腿）缩放到 480 高
    ref_crop = ref.crop((400, 240, 1100, 1290))
    ratio = BIG / ref_crop.height
    ref_crop = ref_crop.resize((round(ref_crop.width * ratio), BIG), Image.LANCZOS)

    cell_w = BIG + 40
    title_h, label_h = 50, 34
    top_h = title_h + label_h + BIG + 20
    total_h = top_h + label_h + GAME_SHOW + 30
    sheet = Image.new('RGBA', (cell_w * 3 + 40, total_h), BG)
    draw = ImageDraw.Draw(sheet)
    f_title = load_font(28)
    f_label = load_font(20)
    draw.text((16, 10), '小玉 Sprite 预览（10x）+ 实机尺寸测试', font=f_title, fill=(255, 210, 74))

    def checker(size):
        img = Image.new('RGBA', (size, size), (32, 32, 48, 255))
        d = ImageDraw.Draw(img)
        for yy in range(0, size, 16):
            for xx in range(0, size, 16):
                if (xx // 16 + yy // 16) % 2 == 0:
                    d.rectangle([xx, yy, xx + 15, yy + 15], fill=(40, 40, 58, 255))
        return img

    # 参考图
    draw.text((20, title_h), '参考图', font=f_label, fill=(170, 170, 200))
    sheet.paste(ref_crop, (20 + (cell_w - ref_crop.width) // 2, title_h + label_h), ref_crop)
    # 待机 / 兴奋
    for i, (grid, label) in enumerate([(idle, '待机 idle'), (excited, '兴奋 excited')]):
        ox = cell_w * (i + 1) + 20
        draw.text((ox, title_h), label, font=f_label, fill=(255, 255, 255))
        base = checker(BIG)
        big = render_grid(grid, PAL, SCALE)
        base.paste(big, (0, 0), big)
        sheet.paste(base, (ox, title_h + label_h))
        draw.rectangle([ox, title_h + label_h, ox + BIG - 1, title_h + label_h + BIG - 1],
                       outline=(74, 74, 106))
        # 实机尺寸
        src = render_grid(grid, PAL, 1)
        ratio2 = GAME_H / src.height
        small = src.resize((max(1, round(src.width * ratio2)), GAME_H), Image.NEAREST)
        show = small.resize((small.width * 4, GAME_SHOW), Image.NEAREST)
        sx = ox + (BIG - show.width) // 2
        sy = top_h + label_h
        draw.text((ox, top_h), f'实机 ~{GAME_H}px 高 (4x)', font=f_label, fill=(140, 200, 255))
        frame = Image.new('RGBA', (show.width + 8, GAME_SHOW + 8), (32, 32, 48, 255))
        frame.paste(show, (4, 4), show)
        sheet.paste(frame, (sx - 4, sy))

    out = os.path.join(ROOT, 'sprite-xiaoyu-preview.png')
    sheet.convert('RGB').save(out)
    print('PNG ->', out, sheet.size)

    used = {ch for row in idle + excited for ch in row if ch != '.'}
    missing = used - set(PAL)
    assert not missing, f'缺色: {missing}'
    widths = {len(r) for r in idle + excited}
    print('rows=', len(idle), 'widths=', sorted(widths), 'chars=', len(used))


if __name__ == '__main__':
    import sys
    main(write='--write' in sys.argv)
