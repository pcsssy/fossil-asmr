import { useEffect, useRef, useState } from 'react'
import Icon from './components/Icon'
import CollectionGallery from './components/CollectionGallery'
import type { ExcavationPhase } from './engine/DamageField'
import SpecimenDetail from './components/SpecimenDetail'
import { SPECIMENS, drawSpecimen, getSpecimen, RARITY_LABELS, RARITY_PROBABILITIES } from './domain/collection'
import ExcavationStage from './components/ExcavationStage'
import { DamageField } from './engine/DamageField'
import { ExcavationAudio } from './audio/ExcavationAudio'
import { readSaved, registerDiscovery, save } from './platform/storage'
import type { Preferences } from './platform/storage'
import './App.css'

type Page = 'home' | 'dig' | 'journal'
const fossil = '/assets/specimens/specimen-011.webp'

function Settings({ preferences, onChange, close }: { preferences: Preferences; onChange: (p: Preferences) => void; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog className="settings-dialog" ref={dialog} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close() }} aria-labelledby="settings-title">
    <div className="sheet-heading"><div><span className="eyebrow">YOUR PREFERENCE</span><h2 id="settings-title">나만의 발굴 환경</h2></div><button className="icon-button" aria-label="설정 닫기" onClick={close}><Icon name="close"/></button></div>
    <div className="setting-row"><div><strong>발굴 사운드</strong><p>돌이 부서지는 작은 소리에 집중해요</p></div><button role="switch" aria-checked={!preferences.muted} className={`switch ${!preferences.muted ? 'on' : ''}`} aria-label="발굴 사운드" onClick={() => onChange({ ...preferences, muted: !preferences.muted })}><span/></button></div>
    <label className="volume-label" htmlFor="volume">효과음 크기 <span>{Math.round(preferences.volume * 100)}%</span></label><input id="volume" className="volume-slider" type="range" min="0" max="100" value={Math.round(preferences.volume * 100)} onChange={e => onChange({ ...preferences, volume: Number(e.target.value) / 100 })}/>
    <div className="setting-row"><div><strong>움직임 줄이기</strong><p>화면 흔들림과 발견 시 확대를 줄여요</p></div><button role="switch" aria-checked={preferences.reducedMotion} className={`switch ${preferences.reducedMotion ? 'on' : ''}`} aria-label="움직임 줄이기" onClick={() => onChange({ ...preferences, reducedMotion: !preferences.reducedMotion })}><span/></button></div>
    <div className="setting-row"><div><strong>그래픽 품질</strong><p>가벼운 모드에서는 먼지와 파편을 줄여요</p></div><select aria-label="그래픽 품질" value={preferences.quality} onChange={e => onChange({ ...preferences, quality: e.target.value as Preferences['quality'] })}><option value="high">섬세하게</option><option value="low">가볍게</option></select></div>
    <details className="probability-details"><summary>등장 확률 안내</summary><p>매 회차 독립적으로 선정해요. 같은 등급 안에서는 모든 표본의 확률이 같고, 중복 발견도 가능해요.</p><table><thead><tr><th>등급</th><th>종수</th><th>등급 확률</th><th>개별 확률</th></tr></thead><tbody>{Object.entries(RARITY_PROBABILITIES).map(([tier, probability]) => { const count = SPECIMENS.filter(item => item.rarity === tier).length; return <tr key={tier}><td>{RARITY_LABELS[tier as keyof typeof RARITY_LABELS]}</td><td>{count}</td><td>{probability * 100}%</td><td>{(probability / count * 100).toFixed(3)}%</td></tr> })}</tbody></table><p>표시된 등급은 게임 내 분류이며 현금성 보상과 연결되지 않아요.</p></details>
    <div className="quiet-note"><Icon name="leaf" size={18}/><p>화석과 광물 50종이 숨겨진 개발 버전이에요. 사운드는 직접 합성한 임시 효과음이며, 표본 이미지는 생성형 이미지로 재구성했어요.</p></div>
    <button className="primary-button" onClick={close}>이대로 발굴하기 <Icon name="check" size={20}/></button>
  </dialog>
}

export default function App() {
  const [saved] = useState(readSaved)
  const [preferences, setPreferences] = useState(saved.preferences)
  const [journal, setJournal] = useState(saved.journal)
  const [page, setPage] = useState<Page>('home')
  const [settings, setSettings] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [specimen, setSpecimen] = useState(SPECIMENS[10])
  const [attemptStarted, setAttemptStarted] = useState(false)
  const [field, setField] = useState(() => new DamageField())
  const [session, setSession] = useState(() => crypto.randomUUID())
  const [audio] = useState(() => new ExcavationAudio())
  const [tool, setTool] = useState<'hammer' | 'brush'>('hammer')
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<ExcavationPhase>('excavating')
  const complete = phase === 'completed', broken = phase === 'broken', finishing = phase === 'brushing'
  const [saveError, setSaveError] = useState(false)
  useEffect(() => { audio.configure(preferences.muted, preferences.volume, specimen.material) }, [audio, preferences.muted, preferences.volume, specimen])
  useEffect(() => () => audio.dispose(), [audio])
  useEffect(() => { if (page !== 'dig' || settings) audio.stop() }, [page, settings, audio])
  useEffect(() => { window.scrollTo(0, 0) }, [page])

  function updatePreferences(next: Preferences) {
    setPreferences(next)
    setSaveError(!save(next, journal))
  }

  function start(fresh = false) {
    audio.unlock()
    if (fresh || field.terminal || !attemptStarted) {
      setSpecimen(drawSpecimen()); setAttemptStarted(true)
      audio.stop(); setField(new DamageField()); setSession(crypto.randomUUID()); setProgress(0); setPhase('excavating'); setTool('hammer')
    }
    setPage('dig')
  }
  function onProgress(p: number, nextPhase: ExcavationPhase) {
    setProgress(p)
    setPhase(nextPhase)
    if (nextPhase === 'completed' && !complete) {
      const next = registerDiscovery(journal, session, undefined, specimen.id)
      setJournal(next)
      setSaveError(!save(preferences, next))
    }
  }
  const foundCount = Object.keys(journal.discoveries).length
  const recentId = Object.entries(journal.discoveries).sort((a, b) => b[1].lastFound.localeCompare(a[1].lastFound))[0]?.[0]
  const recent = recentId ? getSpecimen(recentId) : null
  const expanded = expandedId ? getSpecimen(expandedId) : null
  const revealTitle = { dinosaur: '오래된 생명의 흔적.', ammonite: '오래된 바다의 흔적.', mineral: '돌 속의 반짝임.', shell: '옛 바다의 조각.', plant: '잎에 남겨진 시간.', trilobite: '고대 바다의 생명.' }[specimen.category]
  const percent = complete || broken ? 100 : Math.min(finishing ? 99 : 89, Math.floor(progress * 100))
  const phaseLabel = broken ? '암석이 충격을 견디지 못했어요' : complete ? '소중한 표본을 발견했어요' : finishing ? '이제 브러시로 조심스럽게 털어주세요' : percent === 0 ? '아직은 조용한 돌 한 조각' : percent < 30 ? '작은 균열이 생기고 있어요' : percent < 65 ? '돌 속의 무늬가 보이기 시작해요' : '90%가 되면 브러시로 바꿔주세요'

  return <div className="app-layout">
    <aside className="desktop-note" aria-hidden="true"><span className="editorial-line"/><p>작은 소리,<br/>아주 오래된<br/><em>발견.</em></p><span>FOSSIL EXCAVATION<br/>A MOMENT OF QUIET DISCOVERY</span></aside>
    <div className={`app-shell page-${page} phase-${phase}`}>
      <header className="app-header"><button className="brand" onClick={() => setPage('home')} aria-label="화석발굴 홈"><span className="brand-mark"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M26 17c1-9-11-15-19-8-8 7-2 19 8 18 9-1 13-11 7-17-5-5-14-1-13 6 1 7 11 7 12 1 1-5-6-8-8-3-2 3 2 6 4 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></span><span>화석발굴<span className="brand-sub">FOSSIL ATELIER</span></span></button><div className="header-actions"><button className="icon-button sound-button" aria-label={preferences.muted ? '사운드 켜기' : '사운드 끄기'} aria-pressed={!preferences.muted} onClick={() => { audio.unlock(); updatePreferences({ ...preferences, muted: !preferences.muted }) }}><Icon name={preferences.muted ? 'mute' : 'sound'} size={21}/></button><button className="icon-button" aria-label="설정 열기" onClick={() => setSettings(true)}><Icon name="settings" size={21}/></button></div></header>
      {saveError && <div className="save-warning" role="alert">기록을 저장하지 못했어요. 저장 공간을 확인해주세요.<button onClick={() => setSaveError(!save(preferences, journal))}>다시 저장</button></div>}
      <main>
        {page === 'home' && <div className="home-page enter-page">
          <div className="intro"><div className="eyebrow"><span className="small-line"/> A LITTLE DISCOVERY</div><h1>돌 속에 무엇이<br/>숨어 있을까요<span className="serif-punctuation">?</span></h1><p>두드리고, 털어내고, 발견하는<br className="narrow-break"/> 나만의 ASMR 발굴 시간</p></div>
          <div className="hero-scene"><div className="hero-orbit"/><div className="hero-orbit second"/><span className="scene-cross cross-one">+</span><span className="scene-cross cross-two">+</span><img src={fossil} alt="따뜻한 석회암 속에 드러난 암모나이트 표본" className="hero-specimen" fetchPriority="high"/><span className="specimen-tag"><span className="tag-dot"/> 오래된 바다의 흔적</span><span className="vertical-label">NATURE, UNCOVERED.</span></div>
          <div className="home-action"><p className="headphone-hint"><Icon name="sound" size={16}/> 소리를 켜면, 발견이 더 가까워져요</p><button className="primary-button" onClick={() => start()}>발굴 시작하기 <Icon name="arrow"/></button><span className="small-caption">서두르지 않아도 괜찮아요. 한 번씩, 톡톡.</span></div>
          <section className="home-variety" aria-label="발굴할 수 있는 다양한 표본"><div><h2>돌마다, 다른 발견.</h2><span>6개 분류 · 50종</span></div><p>공룡의 흔적부터 반짝이는 광물까지.</p><div className="variety-specimens">{[{ number: 10, label: '공룡' }, { number: 21, label: '광물' }, { number: 32, label: '조개' }, { number: 39, label: '식물' }, { number: 46, label: '삼엽충' }].map(item => <figure key={item.number}><img src={SPECIMENS[item.number - 1].image} alt={item.label + ' 표본 예시'} loading="lazy"/><figcaption>{item.label}</figcaption></figure>)}</div></section>
          <section className="journal-preview"><div className="section-heading"><h2>나의 작은 발견들</h2><button className="text-button" onClick={() => setPage('journal')}>도감 보기 <Icon name="arrow" size={16}/></button></div><button className="collection-preview" onClick={() => setPage('journal')}><span className="preview-image">{recent ? <img src={recent.image} alt=""/> : <Icon name="book" size={27}/>}</span><span className="preview-copy"><strong>{recent ? recent.name : '첫 번째 발견을 기다려요'}</strong><span>{recent ? recent.description : '직접 발견한 표본을 여기에 모아드릴게요'}</span></span><span className="collection-number">{String(foundCount).padStart(2, '0')}<span>/ 50</span></span></button></section>
          <div className="field-note"><span>FIELD NOTE</span><p>돌을 두드리는 동안,<br/>생각은 잠시 내려두세요.</p><span className="note-stroke"/></div>
        </div>}
        {page === 'dig' && <div className="dig-page enter-page"><div className="dig-meta"><span className="eyebrow">A NEW DISCOVERY</span><button className="text-button reset-button" onClick={() => start(true)} aria-label="새 암석으로 다시 시작"><Icon name="reset" size={15}/> 처음부터</button></div><div className="dig-heading"><h1>{broken ? <>아차, 암석이<br/>깨져버렸어요.</> : complete ? <>반가워요,<br/>{revealTitle}</> : finishing ? <>이제는 살살,<br/>브러시로 마무리해요.</> : <>손끝에서 시작되는<br/>작은 발견.</>}</h1><p>{broken ? '다음 암석은 마지막에 조금 더 부드럽게.' : complete ? '돌 속의 표본을 안전하게 발견했어요.' : finishing ? '망치를 계속 쓰면 표본도 깨질 수 있어요.' : tool === 'hammer' ? '90%까지 톡톡, 마지막은 브러시로 마무리해요.' : '손가락을 움직여 남은 먼지를 털어보세요.'}</p></div>
          <ExcavationStage key={session} field={field} audio={audio} specimen={specimen} preferences={preferences} tool={tool} onProgress={onProgress}/>
          <div className={'excavation-status' + (finishing ? ' needs-brush' : broken ? ' is-broken' : '')} role="status" aria-live="polite"><div className="progress-label"><span>{phaseLabel}</span><span className="progress-number">{percent}<small>%</small></span></div><div className="progress-track" role="progressbar" aria-label="발굴 진행률" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><div style={{ width: percent + '%' }}/></div></div>
          {finishing && <div className={'brush-warning' + (tool === 'brush' ? ' brush-active' : '')} role="status"><Icon name="brush" size={20}/><div><strong>{tool === 'brush' ? '좋아요. 남은 먼지를 골고루 털어주세요' : '브러시로 바꿔주세요!'}</strong><p>{tool === 'brush' ? '표본이 다치지 않게, 살살 문질러 마무리해요.' : '지금부터 망치를 더 쓰면 100%에서 암석이 깨져요.'}</p></div></div>}
          {broken ? <div className="broken-panel"><span className="broken-stamp">EXCAVATION FAILED</span><h2>다음에는 꼭 만나요</h2><p>마지막 먼지는 브러시로 털어야 해요.<br/>이번 표본은 도감에 등록되지 않았어요.</p><button className="primary-button" onClick={() => start(true)}>새 암석으로 다시 도전 <Icon name="reset" size={19}/></button><button className="text-button next-dig" onClick={() => setPage('journal')}>나의 도감 보기 <Icon name="book" size={17}/></button></div> : complete ? <div className="discovery-panel"><div className="discovery-label"><span className="status-dot"/> {journal.discoveries[specimen.id]?.count === 1 ? '새로운 발견 · 도감에 기록했어요' : '다시 만났어요 · 발견 횟수 +1'}</div><div className={'discovery-name rarity-' + specimen.rarity}><h2>{specimen.name}</h2><span className="rarity-label">{RARITY_LABELS[specimen.rarity]}</span></div><p>{specimen.description}</p><button className="primary-button" onClick={() => { setPage('journal'); setExpandedId(specimen.id) }}>발견한 표본 살펴보기 <Icon name="book" size={19}/></button><button className="text-button next-dig" onClick={() => start(true)}>새로운 암석 발굴하기 <Icon name="arrow" size={17}/></button></div> : <><div className="tool-tray" role="group" aria-label="발굴 도구"><button className={`tool-button ${tool === 'hammer' ? 'selected' : ''}`} aria-pressed={tool === 'hammer'} onClick={() => setTool('hammer')}><span className="tool-icon"><Icon name="hammer" size={27}/></span><span><strong>망치</strong><small>{finishing ? '파손 주의' : '톡톡, 돌 깨기'}</small></span><span className="tool-indicator"/></button><button className={`tool-button ${tool === 'brush' ? 'selected' : ''}`} aria-pressed={tool === 'brush'} onClick={() => setTool('brush')}><span className="tool-icon"><Icon name="brush" size={27}/></span><span><strong>브러시</strong><small>{finishing ? '필수 · 마무리하기' : '살살, 먼지 털기'}</small></span><span className="tool-indicator"/></button></div><p className="dig-footer-note"><span className="tiny-diamond"/> {finishing ? '먼지를 모두 털어야 안전하게 발견할 수 있어요' : '망치 90% → 브러시로 안전하게 마무리'}</p></>}
        </div>}
        {page === 'journal' && <CollectionGallery journal={journal} onOpen={setExpandedId} onStart={() => start()}/>}
      </main>
      <nav className="bottom-nav" aria-label="주 메뉴">{(['home', 'dig', 'journal'] as const).map((item, i) => <button key={item} className={page === item ? 'active' : ''} aria-current={page === item ? 'page' : undefined} onClick={() => { if (item === 'dig') start(); else setPage(item) }}><Icon name={(['home', 'hammer', 'book'] as const)[i]} size={23}/><span>{['홈', '발굴', '도감'][i]}</span><span className="nav-dot"/></button>)}</nav>
      {settings && <Settings preferences={preferences} onChange={updatePreferences} close={() => setSettings(false)}/>}{expanded && journal.discoveries[expanded.id] && <SpecimenDetail specimen={expanded} discovery={journal.discoveries[expanded.id]} close={() => setExpandedId(null)}/>}
    </div>
    <aside className="desktop-caption" aria-hidden="true"><span>50 / NATURAL WONDERS</span><div className="caption-line"/><p>두드리고,<br/>털어내고,<br/><em>발견하는 시간.</em></p><span className="prototype-stamp">INTERACTIVE ASMR<br/>PROTOTYPE — VOL. 01</span></aside>
  </div>
}

