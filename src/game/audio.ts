// WebAudio 像素音效：首次用户交互后才初始化，可静音

let audioCtx: AudioContext | null = null
let muted = false
let unlocked = false

export function setMuted(m: boolean) {
  muted = m
}

export function isMuted() {
  return muted
}

/** 必须在用户手势中调用，解锁 AudioContext */
export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    audioCtx = new AC()
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
    resumeSongIfWanted()
  } catch {
    audioCtx = null
  }
}

function blip(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.08,
  slideTo?: number,
  delay = 0,
) {
  if (muted || !audioCtx) return
  try {
    const t0 = audioCtx.currentTime + delay
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration)
    gain.gain.setValueAtTime(volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.02)
  } catch {
    /* ignore */
  }
}

export const sfx = {
  click() {
    blip(660, 0.05, 'square', 0.05)
  },
  cast() {
    blip(300, 0.18, 'triangle', 0.09, 700)
  },
  bite() {
    blip(880, 0.09, 'square', 0.1)
    blip(1174, 0.12, 'square', 0.1, undefined, 0.1)
  },
  catch() {
    blip(523, 0.1, 'square', 0.09)
    blip(659, 0.1, 'square', 0.09, undefined, 0.09)
    blip(784, 0.16, 'square', 0.09, undefined, 0.18)
  },
  perfect() {
    blip(659, 0.08, 'square', 0.1)
    blip(880, 0.08, 'square', 0.1, undefined, 0.08)
    blip(1174, 0.08, 'square', 0.1, undefined, 0.16)
    blip(1568, 0.2, 'square', 0.1, undefined, 0.24)
  },
  purchase() {
    blip(440, 0.08, 'triangle', 0.1)
    blip(880, 0.14, 'triangle', 0.1, undefined, 0.08)
  },
  denied() {
    blip(220, 0.15, 'sawtooth', 0.07, 140)
  },
  /** 神社建成庆典号角 */
  fanfare() {
    const seq = [523, 659, 784, 1046, 784, 1046, 1318]
    seq.forEach((f, i) => blip(f, 0.16, 'square', 0.09, undefined, i * 0.11))
    // 结尾和弦
    blip(523, 0.55, 'triangle', 0.06, undefined, 0.85)
    blip(659, 0.55, 'triangle', 0.06, undefined, 0.85)
    blip(784, 0.65, 'triangle', 0.07, undefined, 0.85)
  },
}

// ---------- 小玉的歌：神社建成后垂钓时循环的芯片摇篮曲 ----------
// [频率, 拍数]，0 = 休止。24 拍 × 0.32s ≈ 7.7s 一循环
const SONG: Array<[number, number]> = [
  [659, 1], [784, 1], [880, 2], [784, 1], [659, 1],
  [587, 1], [659, 1], [523, 2], [0, 2],
  [659, 1], [784, 1], [880, 1], [1046, 1], [880, 2],
  [784, 1], [659, 1], [587, 2], [523, 2],
]
const SONG_BEAT = 0.32
const SONG_LEN_MS =
  SONG.reduce((s, [, b]) => s + b, 0) * SONG_BEAT * 1000

let songWanted = false
let songTimer: ReturnType<typeof setInterval> | null = null

function playSongLoop() {
  if (!audioCtx || muted) return
  let t = 0
  for (const [f, beats] of SONG) {
    if (f > 0) blip(f, beats * SONG_BEAT * 0.9, 'triangle', 0.035, undefined, t)
    t += beats * SONG_BEAT
  }
  // 轻柔低音垫（每 4 拍一下）
  const bassLen = SONG.reduce((s, [, b]) => s + b, 0) * SONG_BEAT
  for (let bt = 0; bt < bassLen; bt += SONG_BEAT * 4) {
    blip(131, SONG_BEAT * 1.6, 'sine', 0.045, undefined, bt)
  }
}

/** 想唱歌时调用；AudioContext 未解锁时先记账，解锁后立即开始 */
export function startSong() {
  songWanted = true
  if (songTimer || !audioCtx) return
  playSongLoop()
  songTimer = setInterval(playSongLoop, SONG_LEN_MS)
}

export function stopSong() {
  songWanted = false
  if (songTimer) {
    clearInterval(songTimer)
    songTimer = null
  }
}

/** 解锁后若有待播的歌则开始（供 unlockAudio 调用） */
export function resumeSongIfWanted() {
  if (songWanted && !songTimer && audioCtx) {
    playSongLoop()
    songTimer = setInterval(playSongLoop, SONG_LEN_MS)
  }
}
