export const SIZE = 600
export const GRID = 100
export const LAYERS = 4
export const BRUSH_THRESHOLD = .9
export type ExcavationPhase = 'excavating' | 'brushing' | 'completed' | 'broken'

/** Persistent, spatial damage. Rendering and React do not own this state. */
export class DamageField {
  heights = new Float32Array(GRID * GRID).fill(LAYERS)
  hits = 0
  dust = new Float32Array(GRID * GRID).fill(1)
  phase: ExcavationPhase = 'excavating'
  private finishProgress = BRUSH_THRESHOLD
  get completed() { return this.phase === 'completed' }
  get broken() { return this.phase === 'broken' }
  get terminal() { return this.completed || this.broken }

  strike(x: number, y: number, brush = false): number {
    if (this.terminal || !this.contains(x, y)) return 0
    const finishing = this.phase === 'brushing'
    let removed = 0
    const radius = brush ? finishing ? 76 : 53 : 96
    for (let row = Math.max(0, Math.floor((y - radius) / 6)); row < Math.min(GRID, Math.ceil((y + radius) / 6)); row++) {
      for (let col = Math.max(0, Math.floor((x - radius) / 6)); col < Math.min(GRID, Math.ceil((x + radius) / 6)); col++) {
        const px = (col + .5) * 6, py = (row + .5) * 6
        const distance = Math.hypot(px - x, py - y) / radius
        if (distance >= 1) continue
        const i = row * GRID + col
        const old = this.heights[i]
        // Irregular chipped rim, stable in space rather than flickering each frame.
        const grain = .9 + .15 * Math.sin(col * 19.7 + row * 37.3)
        const strength = brush ? finishing ? 1.8 : .3 : 2.2
        this.heights[i] = Math.max(0, old - Math.pow(1 - distance * distance, .65) * strength * grain)
        removed += old - this.heights[i]
        if (finishing && brush) {
          const oldDust = this.dust[i]
          this.dust[i] = Math.max(0, oldDust - Math.pow(1 - distance * distance, .65) * 1.7 * grain)
          removed += oldDust - this.dust[i]
        }
      }
    }
    // Once the shell is exposed, even a hit on an already cleared spot is risky.
    if (!brush) this.hits++
    if (!finishing && this.exposure >= BRUSH_THRESHOLD) {
      this.phase = 'brushing'
      this.finishProgress = BRUSH_THRESHOLD
    } else if (finishing && !brush) {
      this.finishProgress = Math.min(1, this.finishProgress + .025)
      if (this.finishProgress >= 1 - 1e-9) this.phase = 'broken'
      removed = Math.max(removed, 1)
    } else if (finishing && brush) {
      const cleaned = this.cleaned
      this.finishProgress = Math.max(this.finishProgress, Math.min(.99, .9 + cleaned * .1))
      if (cleaned >= .9) { this.phase = 'completed'; this.finishProgress = 1 }
    }
    return removed
  }

  contains(x: number, y: number) {
    return ((x - 300) / 248) ** 2 + ((y - 300) / 245) ** 2 < 1
  }

  get progress() {
    return this.phase === 'excavating' ? Math.min(BRUSH_THRESHOLD, this.exposure) : this.finishProgress
  }

  get cleaned() {
    let cleaned = 0, total = 0
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (Math.hypot((col + .5) * 6 - 300, (row + .5) * 6 - 300) > 205) continue
        total++
        cleaned += 1 - this.dust[row * GRID + col]
      }
    }
    return cleaned / total
  }

  get exposure() {
    let exposed = 0, total = 0
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        // The specimen's central footprint, rather than the decorative matrix edge.
        if (Math.hypot((col + .5) * 6 - 300, (row + .5) * 6 - 300) > 205) continue
        total++
        const h = this.heights[row * GRID + col]
        exposed += 1 - Math.min(1, h)
      }
    }
    return exposed / total
  }
}
