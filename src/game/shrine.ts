// 结缘金铃神社：五阶段建造（终局目标）。像素 sprite 在 sprite.ts 的 SHRINE_LAYERS。

export interface ShrineStageDef {
  name: string
  cost: number // 本阶段费用（金币）
}

export const SHRINE_STAGES: ShrineStageDef[] = [
  { name: '地基', cost: 1_000_000 },
  { name: '支柱', cost: 2_000_000 },
  { name: '主体', cost: 4_000_000 },
  { name: '房顶', cost: 8_000_000 },
  { name: '装饰', cost: 16_000_000 },
]

export const SHRINE_MAX_STAGE = SHRINE_STAGES.length

export const SHRINE_TOTAL_COST = SHRINE_STAGES.reduce((s, x) => s + x.cost, 0)

/** 建成后的永久收益倍率 */
export const SHRINE_INCOME_MULT = 2
