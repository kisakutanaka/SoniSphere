import type { SpatialAudio, Range } from './audio'
import type { Star } from './types'

// 星の位置は固定のまま、発音タイミングだけをランダムにする生成的な
// サウンドスケープ（Plan.mdの「星の位置は天文学データ、音楽的な時間構造は
// 生成的」という方針）。明るい星ほど平均的に短い間隔で瞬く。
// 20個の星が独立に鳴るため、1個あたりの間隔をある程度長く取らないと
// 全体では音の洪水になってしまう（Findings.md参照。この値では全星合計で
// 平均約1回/秒の発音頻度になるよう調整済み）。
const INTERVAL_AT_BRIGHTEST_MS = 5000
const INTERVAL_AT_DIMMEST_MS = 30000
// 平均間隔に対してどれだけランダムに揺らすか（0.5〜1.5倍）
const JITTER_MIN = 0.5
const JITTER_MAX = 1.5

function mapRange(value: number, from: Range, to: Range): number {
  if (from.max === from.min) return (to.min + to.max) / 2
  const t = (value - from.min) / (from.max - from.min)
  return to.min + (to.max - to.min) * t
}

export class Soundscape {
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private running = false

  constructor(
    private audio: SpatialAudio,
    private stars: Star[],
  ) {}

  start() {
    if (this.running) return
    this.running = true
    const vmagRange = this.audio.getVmagRange()
    for (const star of this.stars) {
      this.scheduleNext(star, vmagRange)
    }
  }

  stop() {
    this.running = false
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
  }

  private scheduleNext(star: Star, vmagRange: Range) {
    const avgIntervalMs = mapRange(star.vmag, vmagRange, {
      min: INTERVAL_AT_BRIGHTEST_MS,
      max: INTERVAL_AT_DIMMEST_MS,
    })
    const jitter = JITTER_MIN + Math.random() * (JITTER_MAX - JITTER_MIN)
    const delayMs = avgIntervalMs * jitter

    const timer = setTimeout(() => {
      this.timers.delete(timer)
      if (!this.running) return
      this.audio.playStar(star)
      this.scheduleNext(star, vmagRange)
    }, delayMs)
    this.timers.add(timer)
  }
}
