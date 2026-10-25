import { useEffect, useRef, useState } from 'react'
import { DamageField, SIZE } from '../engine/DamageField'
import type { ExcavationPhase } from '../engine/DamageField'
import type { Specimen } from '../domain/collection'
import { ExcavationRenderer } from '../engine/ExcavationRenderer'
import type { ExcavationAudio } from '../audio/ExcavationAudio'
import type { Preferences } from '../platform/storage'

export default function ExcavationStage({ field, audio, specimen, preferences, tool, onProgress }: {
  field: DamageField; audio: ExcavationAudio; specimen: Specimen; preferences: Preferences; tool: 'hammer' | 'brush'; onProgress: (p: number, phase: ExcavationPhase) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null), renderer = useRef<ExcavationRenderer | null>(null)
  const change = useRef(onProgress), motion = useRef(preferences)
  const drag = useRef<{ id: number; x: number; y: number; at: number } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => { change.current = onProgress; motion.current = preferences }, [onProgress, preferences])

  useEffect(() => {
    let live = true
    const engine = new ExcavationRenderer(canvas.current!, field, audio, specimen, (p, done) => change.current(p, done))
    renderer.current = engine
    engine.reducedMotion = motion.current.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches
    engine.lowQuality = motion.current.quality === 'low'
    engine.initialize().then(() => { if (live) setState('ready') }).catch(() => { if (live) setState('error') })
    const observer = new ResizeObserver(() => engine.resize())
    observer.observe(canvas.current!)
    const visibility = () => { if (document.hidden) { drag.current = null; engine.suspend() } else engine.resume() }
    document.addEventListener('visibilitychange', visibility)
    return () => { live = false; observer.disconnect(); document.removeEventListener('visibilitychange', visibility); engine.destroy(); renderer.current = null }
  }, [field, audio, specimen, attempt])

  useEffect(() => {
    if (!renderer.current) return
    renderer.current.reducedMotion = preferences.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches
    renderer.current.lowQuality = preferences.quality === 'low'
    renderer.current.resize()
  }, [preferences.reducedMotion, preferences.quality])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / rect.width * SIZE, y: (event.clientY - rect.top) / rect.height * SIZE }
  }

  return <div className={`excavation-stage ${state === 'loading' ? 'is-loading' : ''}`}>
    <div className="stage-orbit orbit-one"/><div className="stage-orbit orbit-two"/>
    <span className="coordinate top-left">SEDIMENT / LAYER 04</span><span className="coordinate bottom-right">FIELD STUDY / 001</span>
    <canvas ref={canvas} className="excavation-canvas" aria-label="발굴 중인 암석. 원하는 위치를 두드리세요. 키보드 화살표로 타격 위치를 옮기고 스페이스로 발굴할 수 있어요." tabIndex={0}
      onPointerDown={event => {
        if (state !== 'ready' || event.button !== 0 || field.terminal) return
        const p = point(event)
        event.currentTarget.setPointerCapture(event.pointerId)
        audio.unlock()
        drag.current = { id: event.pointerId, ...p, at: performance.now() }
        renderer.current?.strike(p.x, p.y, tool === 'brush')
      }}
      onPointerMove={event => {
        if (!drag.current || drag.current.id !== event.pointerId || tool !== 'brush') return
        const p = point(event), now = performance.now()
        if (Math.hypot(p.x - drag.current.x, p.y - drag.current.y) < 12 || now - drag.current.at < 35) return
        renderer.current?.strike(p.x, p.y, true)
        drag.current = { id: event.pointerId, ...p, at: now }
      }}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
      onKeyDown={event => {
        const current = { x: Number(event.currentTarget.dataset.keyboardX || 300), y: Number(event.currentTarget.dataset.keyboardY || 300) }
        if (event.key.startsWith('Arrow')) {
          event.preventDefault()
          current.x = Math.max(90, Math.min(510, current.x + (event.key === 'ArrowRight' ? 55 : event.key === 'ArrowLeft' ? -55 : 0)))
          current.y = Math.max(90, Math.min(510, current.y + (event.key === 'ArrowDown' ? 55 : event.key === 'ArrowUp' ? -55 : 0)))
          event.currentTarget.dataset.keyboardX = String(current.x); event.currentTarget.dataset.keyboardY = String(current.y)
          event.currentTarget.setAttribute('aria-label', `발굴 위치 가로 ${Math.round(current.x / 6)}%, 세로 ${Math.round(current.y / 6)}%. 스페이스로 타격`)
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault(); audio.unlock(); renderer.current?.strike(current.x, current.y, tool === 'brush')
        }
      }}/>
    {state === 'loading' && <div className="stage-message" role="status">발굴대를 준비하고 있어요<span className="loading-line"/></div>}
    {state === 'error' && <div className="stage-message" role="alert">이미지를 불러오지 못했어요.<button className="text-button" onClick={() => { setState('loading'); setAttempt(v => v + 1) }}>다시 불러오기</button></div>}
  </div>
}
