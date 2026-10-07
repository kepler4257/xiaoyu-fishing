// 商店：升级卡片 + 结缘金铃神社（终局五阶段建造）
import {
  UPGRADE_DEFS,
  upgradeCost,
  type UpgradeKey,
  type Upgrades,
} from '@/hooks/useFishingGame'
import {
  SHRINE_STAGES,
  SHRINE_MAX_STAGE,
  SHRINE_TOTAL_COST,
  SHRINE_INCOME_MULT,
} from '@/game/shrine'

export default function ShopSection({
  gold,
  upgrades,
  onBuy,
  shrineStage,
  onBuildShrine,
}: {
  gold: number
  upgrades: Upgrades
  onBuy: (key: UpgradeKey) => void
  shrineStage: number
  onBuildShrine: () => void
}) {
  const built = shrineStage >= SHRINE_MAX_STAGE
  const next = built ? null : SHRINE_STAGES[shrineStage]
  const spent = SHRINE_STAGES.slice(0, shrineStage).reduce((s, x) => s + x.cost, 0)
  const progress = next ? Math.min(1, gold / next.cost) : 1
  const stageLabel = built
    ? '已建成'
    : shrineStage === 0
      ? '未动工'
      : `${SHRINE_STAGES[shrineStage - 1].name}已完成`

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(Object.keys(UPGRADE_DEFS) as UpgradeKey[]).map((key) => {
        const def = UPGRADE_DEFS[key]
        const lv = upgrades[key]
        const maxed = lv >= def.maxLv
        const cost = upgradeCost(key, lv)
        const affordable = gold >= cost
        return (
          <div key={key} className="pixel-panel p-4">
            <div className="flex items-center justify-between">
              <div className="text-base font-bold text-white">
                <span className="mr-2">{def.icon}</span>
                {def.name}
                <span className="text-gold ml-2">Lv.{lv}</span>
              </div>
              {maxed && <span className="text-xs text-pink-300">已满级</span>}
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-300">{def.desc}</div>
            <div className="mt-1 text-xs text-emerald-300">
              当前效果：{def.effect(lv)}
            </div>
            {!maxed && (
              <div className="mt-1 text-xs text-slate-400">
                下一级：{def.effect(lv + 1)}
              </div>
            )}
            <button
              className="pixel-btn pixel-btn-gold mt-3 w-full px-3 py-2 text-sm font-bold"
              disabled={maxed || !affordable}
              onClick={() => onBuy(key)}
            >
              {maxed ? '已满级' : `升级 · ${cost} 金币`}
            </button>
          </div>
        )
      })}

      {/* 结缘金铃神社 · 终局目标 */}
      <div className="pixel-border-gold sm:col-span-2 bg-[#241e14] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-base font-bold">
            <span className="mr-2">⛩️</span>
            <span className="text-gold">结缘金铃神社</span>
            <span
              className={`ml-2 text-xs ${built ? 'text-pink-300' : 'text-slate-400'}`}
            >
              {stageLabel}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            总造价 {SHRINE_TOTAL_COST.toLocaleString()} 金
            {spent > 0 && ` · 已投入 ${spent.toLocaleString()}`}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          小玉想用毕生积蓄在钓场边建一座金铃神社，感谢每一尾结缘的鱼。
          建成后：<span className="text-gold font-bold">全部渔获收益 ×{SHRINE_INCOME_MULT}</span>
          （含完美收杆与离线收益），小玉还会一边唱歌一边钓鱼喵~
        </p>

        {/* 五阶段指示 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {SHRINE_STAGES.map((s, i) => {
            const done = i < shrineStage
            const current = i === shrineStage && !built
            return (
              <div key={s.name} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-slate-600">→</span>}
                <span
                  className={`pixel-btn px-2 py-1 text-[11px] font-bold ${
                    done
                      ? 'pixel-btn-gold'
                      : current
                        ? 'pixel-btn-pink'
                        : 'opacity-50'
                  }`}
                >
                  {done ? `✓ ${s.name}` : s.name}
                </span>
              </div>
            )
          })}
        </div>

        {built ? (
          <div className="pixel-panel mt-3 p-3 text-center">
            <div className="text-gold text-sm font-bold">
              🔔 神社已建成 · 永久收益 ×{SHRINE_INCOME_MULT} 生效中
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              金铃在风里叮当作响，小玉每天都来擦一遍石阶。
            </div>
          </div>
        ) : (
          <>
            {/* 下一阶段金币进度 */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                下一阶段：<span className="text-gold font-bold">{next!.name}</span>
              </span>
              <span>
                {gold.toLocaleString()} / {next!.cost.toLocaleString()} 金
              </span>
            </div>
            <div className="pixel-panel mt-1 h-3 w-full overflow-hidden">
              <div
                className="h-full bg-yellow-400"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <button
              className="pixel-btn pixel-btn-gold mt-3 w-full px-3 py-2 text-sm font-bold"
              disabled={gold < next!.cost}
              onClick={onBuildShrine}
            >
              建造{next!.name} · {next!.cost.toLocaleString()} 金币
            </button>
          </>
        )}
      </div>
    </div>
  )
}
