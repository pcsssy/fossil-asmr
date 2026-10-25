import { DamageField, GRID, LAYERS, SIZE } from './DamageField'
import type { ExcavationPhase } from './DamageField'
import type { ExcavationAudio } from '../audio/ExcavationAudio'
import type { Specimen } from '../domain/collection'

type Particle = { x: number; y: number; vx: number; vy: number; size: number; age: number; life: number; rotation: number; spin: number; dust: boolean; color: string }
const surface = (size = SIZE) => { const c = document.createElement('canvas'); c.width = c.height = size; return c }
const context = (c: HTMLCanvasElement) => c.getContext('2d')!
const load = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('표본 이미지를 불러오지 못했어요.')); image.src = url
})

export class ExcavationRenderer {
  private canvas: HTMLCanvasElement
  private field: DamageField
  private audio: ExcavationAudio
  private specimen: Specimen
  private changed: (progress: number, phase: ExcavationPhase) => void
  private textures: HTMLCanvasElement[] = []
  private covers: HTMLCanvasElement[] = []
  private cracks = surface()
  private remaining = surface()
  private crackDisplay = surface()
  private dustCoat = surface()
  private brokenTexture = surface()
  private mask = surface(GRID)
  private fossil: HTMLImageElement | null = null
  private particles: Particle[] = []
  private raf = 0
  private last = 0
  private shake = 0
  private toolAt = { x: 300, y: 300, age: 9, brush: false }
  private revealAge = -1
  private breakAge = -1
  private destroyed = false
  reducedMotion = false
  lowQuality = false
  paused = false
  ready = false
  totalFrames = 0
  maxParticles = 0

  constructor(canvas: HTMLCanvasElement, field: DamageField, audio: ExcavationAudio, specimen: Specimen, changed: (p: number, phase: ExcavationPhase) => void) {
    this.canvas = canvas; this.field = field; this.audio = audio; this.specimen = specimen; this.changed = changed
  }

  async initialize() {
    const [fossil, rock] = await Promise.all([load(this.specimen.image), load('/assets/limestone.png')])
    if (this.destroyed) return
    this.fossil = fossil
    for (let layer = 0; layer < LAYERS; layer++) {
      const texture = surface(), ctx = context(texture)
      ctx.drawImage(rock, 25 + layer * 4, 25, 550, 550)
      ctx.globalCompositeOperation = 'source-atop'
      const tones = this.specimen.material === 'shale' ? ['#484b42', '#7f806e', '#a6a491', '#b9b49f']
        : this.specimen.material === 'crystal' ? ['#57535a', '#8b8283', '#ad9d95', '#c5b9a6']
        : this.specimen.material === 'bone' ? ['#61442c', '#977451', '#b49572', '#c7aa86']
        : ['#68503e', '#a88b6b', '#bb9e7d', '#c5ad8d']
      ctx.fillStyle = tones[layer]
      ctx.globalAlpha = layer === 0 ? .45 : .16
      ctx.fillRect(0, 0, SIZE, SIZE)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(fossil, 25, 25, 550, 550)
      this.textures.push(texture); this.covers.push(surface())
    }
    this.ready = true
    this.rebuild()
    if (this.field.broken) { this.captureBrokenTexture(); this.breakAge = 1 }
    this.resize()
  }

  resize() {
    if (this.destroyed) return
    const dpr = Math.min(devicePixelRatio || 1, this.lowQuality ? 1.25 : 2)
    const width = Math.max(1, this.canvas.getBoundingClientRect().width)
    this.canvas.width = this.canvas.height = Math.round(width * dpr)
    this.wake()
  }

  strike(x: number, y: number, brush: boolean) {
    if (!this.ready || this.field.terminal || this.paused) return
    const removed = this.field.strike(x, y, brush)
    if (!removed) return
    this.audio.hit(brush)
    this.toolAt = { x, y, age: 0, brush }
    this.shake = this.reducedMotion ? 0 : brush ? .25 : 2.7
    if (!brush) this.addCracks(x, y)
    this.emit(x, y, brush)
    this.rebuild()
    if (this.field.completed) {
      this.revealAge = 0
      this.audio.reveal(this.specimen.rarity)
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * Math.PI * 2
        this.emit(300 + Math.cos(angle) * 190, 300 + Math.sin(angle) * 185, false)
      }
    } else if (this.field.broken) {
      this.breakAge = 0
      this.captureBrokenTexture()
      this.audio.fracture()
      for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2
        this.emit(300 + Math.cos(angle) * 140, 300 + Math.sin(angle) * 140, false)
      }
    }
    this.changed(this.field.progress, this.field.phase)
    this.wake()
  }

  private rebuild() {
    const m = context(this.mask), image = m.createImageData(GRID, GRID)
    const remaining = context(this.remaining)
    remaining.clearRect(0, 0, SIZE, SIZE)
    for (let layer = 0; layer < LAYERS; layer++) {
      for (let i = 0; i < this.field.heights.length; i++) {
        image.data[i * 4 + 3] = Math.round((1 - Math.max(0, Math.min(1, this.field.heights[i] - layer))) * 255)
      }
      m.putImageData(image, 0, 0)
      const ctx = context(this.covers[layer])
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(this.textures[layer], 0, 0)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(this.mask, 0, 0, SIZE, SIZE)
      ctx.globalCompositeOperation = 'source-over'
      remaining.drawImage(this.covers[layer], 0, 0)
    }
    const ctx = context(this.crackDisplay)
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(this.cracks, 0, 0)
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(this.remaining, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    const dust = context(this.dustCoat)
    dust.clearRect(0, 0, SIZE, SIZE)
    if (this.field.phase !== 'excavating') {
      for (let i = 0; i < this.field.dust.length; i++) image.data[i * 4 + 3] = Math.round(this.field.dust[i] * 90)
      m.putImageData(image, 0, 0)
      dust.globalCompositeOperation = 'source-over'
      dust.drawImage(this.textures[3], 0, 0)
      dust.globalCompositeOperation = 'destination-in'
      dust.drawImage(this.mask, 0, 0, SIZE, SIZE)
      dust.globalCompositeOperation = 'source-over'
    }
  }

  private captureBrokenTexture() {
    const ctx = context(this.brokenTexture)
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.drawImage(this.fossil!, 25, 25, 550, 550)
    for (const cover of this.covers) ctx.drawImage(cover, 0, 0)
    ctx.drawImage(this.crackDisplay, 0, 0)
    ctx.drawImage(this.dustCoat, 0, 0)
  }

  private drawBroken(ctx: CanvasRenderingContext2D) {
    const t = Math.min(1, Math.max(0, this.breakAge) / .85)
    for (let i = 0; i < 9; i++) {
      const angle = i / 9 * Math.PI * 2, middle = angle + Math.PI / 9
      ctx.save()
      const motion = this.reducedMotion ? .18 : t
      ctx.translate(300 + Math.cos(middle) * motion * 115, 300 + Math.sin(middle) * motion * 75 + motion * motion * 145)
      ctx.rotate((i % 2 ? 1 : -1) * motion * .28)
      ctx.translate(-300, -300)
      ctx.globalAlpha = this.reducedMotion ? .5 : Math.max(.12, 1 - t * .88)
      ctx.beginPath(); ctx.moveTo(300, 300)
      for (let step = 0; step <= 8; step++) {
        const a = angle + step / 8 * Math.PI * 2 / 9
        ctx.lineTo(300 + Math.cos(a) * 440, 300 + Math.sin(a) * 440)
      }
      ctx.closePath(); ctx.clip()
      ctx.drawImage(this.brokenTexture, 0, 0)
      ctx.restore()
    }
  }

  private addCracks(x: number, y: number) {
    const ctx = context(this.cracks)
    ctx.strokeStyle = '#4d3828'; ctx.lineWidth = 1.25
    ctx.shadowColor = '#f5dfbd'; ctx.shadowOffsetY = 1; ctx.shadowBlur = 0
    for (let branch = 0; branch < 4; branch++) {
      const angle = Math.random() * Math.PI * 2
      let px = x, py = y
      ctx.beginPath(); ctx.moveTo(px, py)
      for (let step = 0; step < 4; step++) {
        px += Math.cos(angle + (Math.random() - .5) * .9) * (13 + Math.random() * 12)
        py += Math.sin(angle + (Math.random() - .5) * .9) * (13 + Math.random() * 12)
        ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
  }

  private emit(x: number, y: number, brush: boolean) {
    const count = this.reducedMotion ? 3 : this.lowQuality ? 9 : brush ? 10 : 24
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, dust = i % 3 !== 0 || brush
      this.particles.push({ x, y, vx: Math.cos(angle) * (20 + Math.random() * (brush ? 80 : 240)), vy: Math.sin(angle) * 140 - 90,
        size: dust ? 2 + Math.random() * 8 : 4 + Math.random() * 9, age: 0, life: .35 + Math.random() * .5,
        rotation: Math.random() * 6, spin: (Math.random() - .5) * 12, dust,
        color: (this.field.completed && this.specimen.rarity !== 'normal'
          ? this.specimen.rarity === 'legendary' ? ['#b48b42', '#ead7a4', '#d4ad5c', '#f2e4c4'] : this.specimen.rarity === 'special' ? ['#a09cc0', '#ccc0df', '#8c7f9e', '#e0d7e9'] : ['#7babb8', '#c5d5d3', '#87a6a8', '#dfdcca']
          : this.specimen.material === 'shale' ? ['#848476', '#b6b49e', '#686c61', '#d5d0bb'] : ['#ac8b62', '#dac19b', '#8a6d4f', '#e4d1b3'])[i % 4] })
    }
    this.particles = this.particles.slice(-(this.lowQuality ? 100 : 240))
    this.maxParticles = Math.max(this.maxParticles, this.particles.length)
  }

  wake() {
    if (!this.raf && !this.destroyed && !this.paused) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame) }
  }

  private frame = (now: number) => {
    this.raf = 0
    if (this.destroyed || this.paused || !this.ready) return
    const dt = Math.min(.04, (now - this.last) / 1000)
    this.last = now; this.totalFrames++
    const ctx = context(this.canvas), scale = this.canvas.width / SIZE
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.clearRect(0, 0, SIZE, SIZE)
    this.shake *= .72
    this.toolAt.age += dt
    if (this.revealAge >= 0) this.revealAge += dt
    if (this.breakAge >= 0) this.breakAge += dt
    ctx.save()
    const reveal = this.field.completed ? this.revealAge < 0 ? 1 : Math.min(1, this.revealAge / .75) : 0
    const zoom = this.reducedMotion ? 1 : 1 + reveal * .045
    ctx.translate(300, 300); ctx.scale(zoom, zoom); ctx.translate(-300 + Math.sin(now * .11) * this.shake, -300 + Math.cos(now * .13) * this.shake)
    if (this.field.broken) this.drawBroken(ctx)
    else {
    if (this.field.completed && this.specimen.rarity !== 'normal') {
      const glow = ctx.createRadialGradient(300, 300, 70, 300, 300, 265)
      const color = this.specimen.rarity === 'legendary' ? '204,168,79' : this.specimen.rarity === 'special' ? '142,120,164' : '102,153,169'
      glow.addColorStop(0, `rgba(${color},${.23 * reveal})`); glow.addColorStop(1, `rgba(${color},0)`)
      ctx.fillStyle = glow; ctx.fillRect(0, 0, SIZE, SIZE)
    }
    ctx.shadowColor = '#54351d35'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 15
    ctx.drawImage(this.fossil!, 25, 25, 550, 550)
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    ctx.save()
    ctx.globalAlpha = 1 - reveal
    ctx.translate(0, this.reducedMotion ? 0 : reveal * reveal * 30)
    for (const cover of this.covers) {
      ctx.shadowColor = '#38241480'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2
      ctx.drawImage(cover, 0, 0)
    }
    ctx.shadowColor = 'transparent'; ctx.drawImage(this.crackDisplay, 0, 0); ctx.drawImage(this.dustCoat, 0, 0)
    ctx.restore()
    }
    for (const particle of this.particles) {
      particle.age += dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt
      particle.vy += (particle.dust ? 35 : 650) * dt; particle.rotation += particle.spin * dt
      const fade = Math.max(0, 1 - particle.age / particle.life)
      ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(particle.rotation)
      ctx.globalAlpha = fade * (particle.dust ? .35 : 1); ctx.fillStyle = particle.color
      if (particle.dust) { ctx.beginPath(); ctx.ellipse(0, 0, particle.size * (1.5 - fade * .5), particle.size * .6, 0, 0, Math.PI * 2); ctx.fill() }
      else {
        ctx.beginPath(); ctx.moveTo(-particle.size, -particle.size * .5); ctx.lineTo(particle.size * .7, -particle.size); ctx.lineTo(particle.size, particle.size * .6); ctx.lineTo(-particle.size * .4, particle.size); ctx.closePath(); ctx.fill()
        ctx.strokeStyle = '#fff5df70'; ctx.lineWidth = 1; ctx.stroke()
      }
      ctx.restore()
    }
    this.particles = this.particles.filter(p => p.age < p.life)
    if (this.toolAt.age < .22 && !this.reducedMotion && !this.field.terminal) this.drawTool(ctx)
    ctx.restore()
    this.canvas.dataset.progress = this.field.progress.toFixed(4)
    this.canvas.dataset.hits = String(this.field.hits)
    this.canvas.dataset.particles = String(this.particles.length)
    this.canvas.dataset.audioPlayed = String(this.audio.played)
    this.canvas.dataset.frames = String(this.totalFrames)
    this.canvas.dataset.maxParticles = String(this.maxParticles)
    this.canvas.dataset.phase = this.field.phase
    this.canvas.dataset.cleaned = this.field.cleaned.toFixed(4)
    if (this.particles.length || this.toolAt.age < .23 || this.shake > .02 || (this.revealAge >= 0 && this.revealAge < .8) || (this.breakAge >= 0 && this.breakAge < .9)) this.raf = requestAnimationFrame(this.frame)
  }

  private drawTool(ctx: CanvasRenderingContext2D) {
    const { x, y, age, brush } = this.toolAt
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.6 + Math.sin(age / .22 * Math.PI) * .3)
    ctx.fillStyle = '#704d30'; ctx.strokeStyle = '#533923'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(-4, -58, 8, 53, 3); ctx.fill(); ctx.stroke()
    ctx.fillStyle = brush ? '#d7bc8c' : '#84796c'
    ctx.beginPath(); ctx.roundRect(brush ? -10 : -22, brush ? -7 : -17, brush ? 20 : 44, brush ? 18 : 20, 4); ctx.fill()
    ctx.strokeStyle = brush ? '#a88b60' : '#b1a798'
    if (brush) for (let i = -7; i < 10; i += 3) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 2, 11); ctx.stroke() }
    else { ctx.beginPath(); ctx.moveTo(-18, -13); ctx.lineTo(17, -13); ctx.stroke() }
    ctx.restore()
  }

  suspend() { this.paused = true; cancelAnimationFrame(this.raf); this.raf = 0; this.audio.stop() }
  resume() { this.paused = false; this.wake() }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); this.raf = 0; this.particles = []; this.audio.stop() }
}
