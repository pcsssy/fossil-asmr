/** Original procedural placeholder audio. No third-party recordings. */
export class ExcavationAudio {
  context: AudioContext | null = null
  master: GainNode | null = null
  analyser: AnalyserNode | null = null
  muted = false
  volume = .55
  material: 'bone' | 'limestone' | 'crystal' | 'shale' = 'limestone'
  played = 0
  private buffers: AudioBuffer[] = []
  private active = new Set<AudioScheduledSourceNode>()
  private variation = 0

  unlock() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' })
      this.master = this.context.createGain()
      const compressor = this.context.createDynamicsCompressor()
      compressor.threshold.value = -14
      compressor.ratio.value = 8
      this.analyser = this.context.createAnalyser()
      this.master.connect(compressor).connect(this.analyser).connect(this.context.destination)
      this.applyVolume()
      this.buffers = Array.from({ length: 5 }, (_, variant) => {
        const buffer = this.context!.createBuffer(1, this.context!.sampleRate * .32, this.context!.sampleRate)
        const data = buffer.getChannelData(0)
        let low = 0
        for (let i = 0; i < data.length; i++) {
          const t = i / buffer.sampleRate
          low = low * .65 + (Math.random() * 2 - 1) * .35
          const knock = Math.sin(2 * Math.PI * (175 + variant * 21) * t) * Math.exp(-t * 55)
          const crackle = (Math.random() * 2 - 1) * Math.exp(-t * 30) * .23
          data[i] = (low * Math.exp(-t * 18) * .65 + knock * .45 + crackle) * Math.min(1, t * 1500)
        }
        return buffer
      })
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
  }

  configure(muted: boolean, volume: number, material = this.material) {
    this.muted = muted
    this.volume = volume
    this.material = material
    this.applyVolume()
    if (muted) this.stop()
  }

  private applyVolume() {
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * .72, this.context.currentTime, .015)
  }

  hit(brush = false) {
    if (this.muted) return
    this.unlock()
    if (!this.context || !this.master || this.active.size > 18) return
    const ctx = this.context, now = ctx.currentTime
    this.variation = (this.variation + 1 + Math.floor(Math.random() * 3)) % 5
    const source = ctx.createBufferSource()
    source.buffer = this.buffers[this.variation]
    const tone = this.material === 'crystal' ? 1.25 : this.material === 'shale' ? .8 : this.material === 'bone' ? .9 : 1
    source.playbackRate.value = (brush ? .7 + Math.random() * .1 : .9 + Math.random() * .2) * tone
    const filter = ctx.createBiquadFilter()
    filter.type = brush ? 'highpass' : 'lowpass'
    filter.frequency.value = brush ? 1600 : (2400 + Math.random() * 1600) * tone
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(brush ? .24 : .75 + Math.random() * .2, now)
    gain.gain.exponentialRampToValueAtTime(.001, now + (brush ? .18 : .3))
    source.connect(filter).connect(gain).connect(this.master)
    this.track(source, () => { source.disconnect(); filter.disconnect(); gain.disconnect() })
    source.start(now)
    source.stop(now + .34)
    this.played++
    if (!brush) {
      const thud = ctx.createOscillator(), envelope = ctx.createGain()
      thud.frequency.setValueAtTime(100 + Math.random() * 40, now)
      thud.frequency.exponentialRampToValueAtTime(38, now + .12)
      envelope.gain.setValueAtTime(.24, now)
      envelope.gain.exponentialRampToValueAtTime(.001, now + .16)
      thud.connect(envelope).connect(this.master)
      this.track(thud, () => { thud.disconnect(); envelope.disconnect() })
      thud.start(now); thud.stop(now + .17)
    }
  }

  reveal(rarity = 'normal') {
    if (this.muted) return
    this.unlock()
    if (!this.context || !this.master) return
    const ctx = this.context
    const notes = rarity === 'legendary' ? [392, 523.25, 659.25, 783.99, 1046.5] : rarity === 'special' ? [440, 659.25, 880, 987.77] : rarity === 'rare' ? [493.88, 587.33, 739.99, 987.77] : [523.25, 659.25, 783.99]
    for (const [i, hz] of notes.entries()) {
      const note = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime + i * .11
      note.type = 'sine'; note.frequency.value = hz
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(.12, at + .025)
      gain.gain.exponentialRampToValueAtTime(.001, at + .9)
      note.connect(gain).connect(this.master)
      this.track(note, () => { note.disconnect(); gain.disconnect() })
      note.start(at); note.stop(at + 1)
    }
  }

  fracture() {
    if (this.muted) return
    this.unlock()
    if (!this.context || !this.master) return
    const source = this.context.createBufferSource(), gain = this.context.createGain()
    const now = this.context.currentTime
    source.buffer = this.buffers[0]
    source.playbackRate.value = .45
    gain.gain.setValueAtTime(.7, now)
    gain.gain.exponentialRampToValueAtTime(.001, now + .65)
    source.connect(gain).connect(this.master)
    this.track(source, () => { source.disconnect(); gain.disconnect() })
    source.start(now); source.stop(now + .7)
  }

  private track(source: AudioScheduledSourceNode, cleanup: () => void) {
    this.active.add(source)
    source.onended = () => { this.active.delete(source); cleanup() }
  }

  stop() {
    for (const source of this.active) { try { source.stop() } catch { /* Already ended. */ } }
    this.active.clear()
  }

  dispose() {
    this.stop()
    void this.context?.close()
    this.context = null; this.master = null; this.analyser = null; this.buffers = []
  }
}
