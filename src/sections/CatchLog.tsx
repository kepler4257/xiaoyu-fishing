// 最近渔获滚动条
import { FISH_MAP, RARITY_INFO } from '@/game/fish'
import type { LogEntry } from '@/hooks/useFishingGame'

export default function CatchLog({ log }: { log: LogEntry[] }) {
  return (
    <div className="pixel-border mt-4 p-2">
      <div className="mb-1 text-xs text-slate-400">最近渔获</div>
      <div className="catch-log-scroll flex gap-4 overflow-x-auto pb-1 whitespace-nowrap">
        {log.length === 0 && (
          <span className="text-xs text-slate-600">小玉还没有钓到鱼，耐心等待吧…</span>
        )}
        {log.map((e) => {
          const f = FISH_MAP.get(e.fishId)
          if (!f) return null
          return (
            <span key={e.id} className="text-xs">
              <span className="text-slate-500">[{e.time}]</span>{' '}
              <span style={{ color: RARITY_INFO[f.rarity].color }}>{f.name}</span>{' '}
              <span className="text-slate-400">{e.weight.toFixed(1)}kg</span>{' '}
              <span className="text-gold">+{e.gold}金</span>
              {e.perfect && <span className="ml-1 text-pink-400">完美!</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
