// 钓场定义：解锁费用 + 展示文案。场景主题在 scene.ts 的 SCENE_THEMES。

export interface SpotDef {
  id: string
  name: string
  cost: number // 解锁费用（金币），0 = 默认解锁
  desc: string
}

export const SPOTS: SpotDef[] = [
  {
    id: 'pond',
    name: '村口池塘',
    cost: 0,
    desc: '小玉家门口的小池塘，鱼儿好钓，适合攒第一桶金。',
  },
  {
    id: 'bamboo',
    name: '竹林溪涧',
    cost: 5000,
    desc: '竹叶婆娑的山溪，水更清、鱼更值钱。',
  },
  {
    id: 'abyss',
    name: '深海',
    cost: 50000,
    desc: '永夜的深海，荧光生物在黑暗中游弋。',
  },
  {
    id: 'starlake',
    name: '星空湖畔',
    cost: 300000,
    desc: '星星坠入湖面的传说钓场，据说有鲸鲸女仆出没。',
  },
]

export const SPOT_MAP = new Map(SPOTS.map((s) => [s.id, s]))

export const DEFAULT_SPOT = 'pond'
