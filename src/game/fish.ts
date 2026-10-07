// 鱼类图鉴数据 & 程序化像素鱼绘制

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export const RARITY_INFO: Record<
  Rarity,
  { name: string; color: string; weight: number }
> = {
  common: { name: '普通', color: '#e8e8e8', weight: 60 },
  rare: { name: '稀有', color: '#5db4ff', weight: 25 },
  epic: { name: '史诗', color: '#c77dff', weight: 11 },
  legendary: { name: '传说', color: '#ffd24a', weight: 4 },
}

export interface FishSpecies {
  id: string
  name: string
  rarity: Rarity
  basePrice: number
  minWeight: number // kg
  maxWeight: number
  desc: string
  // 所属钓场
  spot: string
  // 像素鱼配色
  body: string
  belly: string
  fin: string
  // 可选：手绘字符串网格像素 sprite（'.' 透明），存在时优先于程序化绘制
  grid?: string[]
  palette?: Record<string, string>
}

export const FISH_SPECIES: FishSpecies[] = [
  // 普通
  { id: 'crucian', name: '小鲫鱼', rarity: 'common',
    spot: 'pond', basePrice: 8, minWeight: 0.2, maxWeight: 0.8, desc: '湖边最常见的小家伙，活泼好动。', body: '#9aa7b8', belly: '#dfe6ee', fin: '#6b7889' },
  { id: 'whitefish', name: '白条鱼', rarity: 'common',
    spot: 'pond', basePrice: 10, minWeight: 0.1, maxWeight: 0.5, desc: '银光闪闪，游得飞快。', body: '#c8d2dc', belly: '#ffffff', fin: '#93a1ad' },
  { id: 'loach', name: '泥鳅', rarity: 'common',
    spot: 'pond', basePrice: 12, minWeight: 0.1, maxWeight: 0.3, desc: '滑溜溜的，差点从手里溜走。', body: '#8a7a5c', belly: '#c9b98f', fin: '#5c5140' },
  { id: 'carp', name: '小鲤鱼', rarity: 'common',
    spot: 'pond', basePrice: 15, minWeight: 0.5, maxWeight: 2.0, desc: '红尾巴的小鲤鱼，寓意好运。', body: '#b08d57', belly: '#e3cfa3', fin: '#d1603d' },
  // 稀有
  { id: 'seabream', name: '红鲷鱼', rarity: 'rare',
    spot: 'abyss', basePrice: 45, minWeight: 0.8, maxWeight: 3.5, desc: '喜庆的红色海鱼，味道一流。', body: '#e0685c', belly: '#f7c6b8', fin: '#b03a32' },
  { id: 'bluebass', name: '蓝鳍鲈鱼', rarity: 'rare',
    spot: 'pond', basePrice: 55, minWeight: 1.0, maxWeight: 4.0, desc: '鱼鳍泛着宝石般的蓝光。', body: '#4d7ec9', belly: '#c3d9f2', fin: '#2b4f8f' },
  { id: 'lanternfish', name: '灯笼鱼', rarity: 'rare',
    spot: 'abyss', basePrice: 70, minWeight: 0.2, maxWeight: 0.6, desc: '夜里会发出幽幽的光。', body: '#3d4d6b', belly: '#ffe89e', fin: '#26324a' },
  { id: 'rainbowtrout', name: '彩虹鳟鱼', rarity: 'rare',
    spot: 'bamboo', basePrice: 80, minWeight: 0.6, maxWeight: 2.5, desc: '侧身有一道彩虹色的缎带。', body: '#7ba889', belly: '#f2d7d9', fin: '#e08ba0' },
  // 史诗
  { id: 'mooneel', name: '月光鳗', rarity: 'epic',
    spot: 'bamboo', basePrice: 220, minWeight: 1.5, maxWeight: 5.0, desc: '只在月光下出现的神秘鳗鱼。', body: '#8f7bd8', belly: '#e6dcff', fin: '#5a48a3' },
  { id: 'goldcatfish', name: '紫金鲶鱼', rarity: 'epic',
    spot: 'abyss', basePrice: 260, minWeight: 2.0, maxWeight: 8.0, desc: '长着金色胡须的大鲶鱼。', body: '#6b4d8f', belly: '#c9a86b', fin: '#3f2d5c' },
  { id: 'icesalmon', name: '冰晶鲑', rarity: 'epic',
    spot: 'starlake', basePrice: 300, minWeight: 1.2, maxWeight: 4.5, desc: '鳞片像冰晶一样透明闪亮。', body: '#9fd8e8', belly: '#eafcff', fin: '#5aa8c4' },
  { id: 'anglerfish', name: '深海鮟鱇', rarity: 'epic',
    spot: 'abyss', basePrice: 350, minWeight: 1.0, maxWeight: 6.0, desc: '提着小灯的深海猎手。', body: '#4a3a5c', belly: '#8f7ba8', fin: '#2d2238' },
  // 传说
  { id: 'goldenkoi', name: '黄金锦鲤', rarity: 'legendary',
    spot: 'pond', basePrice: 1200, minWeight: 2.0, maxWeight: 6.0, desc: '传说中能带来财运的金色锦鲤！', body: '#f2b134', belly: '#ffe9b0', fin: '#d1821f' },
  { id: 'dragonkoi', name: '龙王锦鲤', rarity: 'legendary',
    spot: 'bamboo', basePrice: 1800, minWeight: 3.0, maxWeight: 9.0, desc: '据说跃过龙门就能化龙的锦鲤之王。', body: '#d64545', belly: '#ffd9a0', fin: '#ffd24a' },
  { id: 'starwhale', name: '星海鲸', rarity: 'legendary',
    spot: 'starlake', basePrice: 2500, minWeight: 20, maxWeight: 60, desc: '小小的身体里仿佛装着整片星空。', body: '#2d3a6b', belly: '#8fa3e8', fin: '#1a2440' },
  { id: 'nightdragon', name: '夜光龙鱼', rarity: 'legendary',
    spot: 'abyss', basePrice: 3200, minWeight: 4.0, maxWeight: 12.0, desc: '只在最深夜现身的梦幻之鱼。', body: '#1f6b6b', belly: '#7dffd9', fin: '#0f3d3d' },
  // 大肥鱼：鲸鲸女仆（手绘 24x16 sprite）
  {
    id: 'dafeiyu',
    name: '大肥鱼',
    rarity: 'legendary',
    spot: 'starlake',
    basePrice: 4000,
    minWeight: 8.0,
    maxWeight: 20.0,
    desc: '圆滚滚的鲸鲸女仆！戴着荷叶边头饰，围裙上绣着小鲸鱼，被钓上来时会喊「欢迎回来喵~」。',
    body: '#4e6db4',
    belly: '#ffffff',
    fin: '#3d5a9e',
    grid: [
      '.........HBB....................',
      '...........HD...................',
      '...........IHINE................',
      '.........IEEFNNEENEC............',
      '........NFCCCCMCIFEFI...........',
      '.......NFMTTBBBDBMCFEF..........',
      '......NSBBBAAAAABBAINN..........',
      '.....FPABBABAAAAABAAINF.........',
      '.....XQAAAAQOQRARKAAAPE.........',
      '.....CBAAAAQGQKAAAAABCPH........',
      '.....AAAABBAAAABAKAAAACAU.......',
      '....HBABAKKKKKKCYBABKAURU.......',
      '....DAAABVCKQQAXEGAAAABTD.......',
      '....JAABQFIQGGYVCYAAAKTJDD......',
      '...JJAKALLLYCMIVLDLBRAKMHDD.....',
      '...DDARKLIHCPXNSAQIMQAHCSCCH....',
      '..MICTGAISUSEEEFSSPGGHJTH.......',
      '.....JARCFFNFVFNFFCRADDBB.......',
      '....BBBBLVFEFVFEFVLBABBAAA......',
      '...HAABGAHCVIVCIICHGGTBABSM.....',
      '..BSMADAOTFCJWJLPPROTDAABMK.....',
      '..QPBAKOALIIICCPCITORBAAAAA....L',
      '..ABAAGAWFVKFIPIMECTURAAAGQG.DBD',
      '.RRQGQABDICDLDHDLCLJAKRGRGQADBH.',
      'MGGGOGGAJWFNNNNNNCJJLCGOOOGHHBD.',
      '.UUUOOKDJCEEEEEEEELJWHGOOOGDDD..',
      '..GOOUHDDKEEEESMFNDJHLAQOSFHD...',
      '...OOCXDLLCEEENFNCLLWMXOOHHH....',
      '..GUMGPIJWWCPPFCMJLJCFKRGBDK....',
      '.......PXCLWJJJJWHMCFKJDDAM.....',
      '.........PXPIIISXPP.HMCQMM......',
      '..........LCM..MCH..............',
      '...........J....J...............',
    ],
    palette: {
      A: '#556496',
      B: '#4e5a8b',
      C: '#9995a8',
      D: '#49496d',
      E: '#fdf7f6',
      F: '#e8d6d7',
      G: '#6986b2',
      H: '#525477',
      I: '#aea6b1',
      J: '#323356',
      K: '#606b96',
      L: '#61576a',
      M: '#727594',
      N: '#f3e9eb',
      O: '#749dca',
      P: '#cec6cd',
      Q: '#687aa7',
      R: '#5b75a4',
      S: '#aeb3c8',
      T: '#3d4770',
      U: '#688fb8',
      V: '#d8b7b5',
      W: '#443d5b',
      X: '#c3bbc5',
      Y: '#857a8d',
    },
  },
  // ===== 竹林溪涧 专属 =====
  { id: 'qingzhu', name: '青竹鳑鲏', rarity: 'common',
    spot: 'bamboo', basePrice: 20, minWeight: 0.2, maxWeight: 0.6, desc: '爱在竹影下成群游动的小鱼。', body: '#8fbf7a', belly: '#e0f2d0', fin: '#5c8a4e' },
  { id: 'xishiban', name: '溪石斑', rarity: 'rare',
    spot: 'bamboo', basePrice: 95, minWeight: 0.5, maxWeight: 2.0, desc: '趴在溪底石头上晒太阳的隐士。', body: '#6b8f7d', belly: '#d8e8d0', fin: '#41604f' },
  { id: 'cuiyesalmon', name: '翠叶鲑', rarity: 'rare',
    spot: 'bamboo', basePrice: 120, minWeight: 0.6, maxWeight: 2.5, desc: '鳞片像浸过溪水的翠叶。', body: '#5aa87e', belly: '#f0e8c8', fin: '#2f7a58' },
  { id: 'zhuyingnian', name: '竹影青鲶', rarity: 'epic',
    spot: 'bamboo', basePrice: 420, minWeight: 1.5, maxWeight: 6.0, desc: '神出鬼没，只在竹影最深处现身。', body: '#3f6b52', belly: '#a8d8b0', fin: '#24473a' },
  // ===== 深海 专属 =====
  { id: 'neonpipefish', name: '霓虹管鱼', rarity: 'rare',
    spot: 'abyss', basePrice: 160, minWeight: 0.1, maxWeight: 0.4, desc: '身体细长，发着霓虹光，像海底的灯管。', body: '#2a3a6b', belly: '#7df2ff', fin: '#ff7de8' },
  { id: 'yingguangtun', name: '荧光鲀', rarity: 'rare',
    spot: 'abyss', basePrice: 175, minWeight: 0.3, maxWeight: 1.0, desc: '一生气就鼓成一颗发光的小球。', body: '#3d4d8f', belly: '#b8e8ff', fin: '#5c7dd8' },
  { id: 'mangyu', name: '深渊盲鱼', rarity: 'epic',
    spot: 'abyss', basePrice: 480, minWeight: 0.8, maxWeight: 3.0, desc: '在永夜深渊里放弃了眼睛的智者。', body: '#2d2438', belly: '#8f7ba8', fin: '#4a3a5c' },
  { id: 'styxfish', name: '冥河巨口鱼', rarity: 'epic',
    spot: 'abyss', basePrice: 560, minWeight: 1.5, maxWeight: 5.0, desc: '张着巨口提着红灯，深海里最不想遇见的邻居。', body: '#1c1c30', belly: '#5c4a8a', fin: '#ff5a3d' },
  // ===== 星空湖畔 专属 =====
  { id: 'starminnow', name: '星斑鲦', rarity: 'common',
    spot: 'starlake', basePrice: 32, minWeight: 0.1, maxWeight: 0.5, desc: '鳞片上缀着星星点点的光斑。', body: '#4a4a8f', belly: '#c8c8f2', fin: '#ffd24a' },
  { id: 'liuyingfish', name: '流萤鱼', rarity: 'rare',
    spot: 'starlake', basePrice: 200, minWeight: 0.3, maxWeight: 1.2, desc: '游动时拖着萤火般的光尾。', body: '#5c5cb8', belly: '#e8e8ff', fin: '#a8e8ff' },
  { id: 'dreamsturgeon', name: '织梦鲟', rarity: 'epic',
    spot: 'starlake', basePrice: 640, minWeight: 2.0, maxWeight: 8.0, desc: '据说会在月光下编织旅人的梦。', body: '#6b4d9e', belly: '#d8c8f2', fin: '#8f7bd8' },
  { id: 'meteoroarfish', name: '陨星皇带鱼', rarity: 'legendary',
    spot: 'starlake', basePrice: 5500, minWeight: 10.0, maxWeight: 30.0, desc: '身披流星余烬的湖畔霸主，出现时湖面会亮起银河。', body: '#3d2d6b', belly: '#ffd9f2', fin: '#ffd24a' },
]

export const FISH_MAP = new Map(FISH_SPECIES.map((f) => [f.id, f]))

export interface CatchResult {
  species: FishSpecies
  weight: number
  gold: number
  perfect: boolean
}

/**
 * 程序化绘制像素鱼：身体椭圆 + 尾巴三角 + 眼睛。
 * 在 (w x h) 的低分辨率画布上以整像素方块绘制，天然像素风。
 */
export function drawFishIcon(
  ctx: CanvasRenderingContext2D,
  species: FishSpecies,
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h)
  // 手绘/像素化 sprite 网格优先：等比缩放 + 居中 letterbox，绝不拉伸
  if (species.grid && species.palette) {
    const gh = species.grid.length
    const gw = Math.max(...species.grid.map((r) => r.length))
    const s = Math.min(w / gw, h / gh)
    const ox = Math.floor((w - gw * s) / 2)
    const oy = Math.floor((h - gh * s) / 2)
    for (let y = 0; y < h; y++) {
      const gy = Math.floor((y - oy) / s)
      if (gy < 0 || gy >= gh) continue
      const row = species.grid[gy]
      for (let x = 0; x < w; x++) {
        const gx = Math.floor((x - ox) / s)
        if (gx < 0 || gx >= row.length) continue
        const ch = row[gx]
        if (ch === '.') continue
        const color = species.palette[ch]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(x, y, 1, 1)
      }
    }
    return
  }
  const px = (x: number, y: number, sw: number, sh: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(sw), Math.round(sh))
  }
  const cx = w / 2
  const cy = h / 2
  const bodyW = w * 0.52
  const bodyH = h * 0.5

  // 尾巴（三角）
  const tailX = cx - bodyW / 2 - w * 0.14
  for (let i = 0; i < bodyH / 2; i++) {
    const spread = i * 0.9
    px(tailX + (bodyH / 2 - i) * 1.2, cy - spread, 2, spread * 2 || 1, species.fin)
  }
  // 身体（椭圆，逐行像素）
  for (let y = -bodyH / 2; y <= bodyH / 2; y++) {
    const t = 1 - (y * y) / ((bodyH / 2) * (bodyH / 2) || 1)
    const half = (bodyW / 2) * Math.sqrt(Math.max(t, 0))
    const color = y > bodyH * 0.12 ? species.belly : species.body
    px(cx - half, cy + y, half * 2, 1, color)
  }
  // 背部鳍
  px(cx - bodyW * 0.15, cy - bodyH / 2 - 2, bodyW * 0.3, 2, species.fin)
  // 鳃线
  px(cx + bodyW * 0.12, cy - bodyH * 0.2, 1, bodyH * 0.4, species.fin)
  // 眼睛
  const eyeX = cx + bodyW * 0.28
  const eyeY = cy - bodyH * 0.12
  px(eyeX, eyeY, 2, 2, '#101018')
  px(eyeX, eyeY, 1, 1, '#ffffff')
  // 传说鱼加星光
  if (species.rarity === 'legendary') {
    px(cx - bodyW * 0.1, cy - bodyH * 0.3, 1, 1, '#ffffff')
    px(cx - bodyW * 0.25, cy, 1, 1, '#ffffff')
  }
}
