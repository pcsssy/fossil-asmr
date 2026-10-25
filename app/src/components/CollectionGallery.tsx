import { useState } from 'react'
import { COLLECTIONS, COLLECTION_SLOTS, RARITY_LABELS } from '../domain/collection'
import type { Rarity } from '../domain/collection'
import type { Journal } from '../platform/storage'
import Icon from './Icon'

export default function CollectionGallery({ journal, onOpen, onStart }: { journal: Journal; onOpen: (id: string) => void; onStart: () => void }) {
  const [category, setCategory] = useState('all')
  const [rarity, setRarity] = useState('all')
  const [onlyFound, setOnlyFound] = useState(false)
  const found = Object.keys(journal.discoveries).length
  const visible = COLLECTION_SLOTS.filter(slot => (category === 'all' || slot.category === category) && (rarity === 'all' || slot.rarity === rarity) && (!onlyFound || journal.discoveries[slot.id]))

  return <div className="journal-page collection-page enter-page">
    <div className="eyebrow"><span className="small-line"/> THE DISCOVERY ARCHIVE</div>
    <div className="archive-heading"><h1>나의 발견 도감<span>.</span></h1><span className="archive-edition">VOL.<br/><strong>01</strong></span></div>
    <p className="page-description">아직 모르는 돌 속의 이야기, 하나씩 채워가요.</p>
    <div className="archive-summary">
      <div className="archive-count"><strong>{String(found).padStart(2, '0')}</strong><span>/ 50<span>발견한 표본</span></span></div>
      <div className="archive-percent"><strong>{found * 2}<small>%</small></strong><span>나의 수집률</span></div>
      <div className="archive-progress" aria-label={`50종 중 ${found}종 발견`}><span style={{ width: `${found * 2}%` }}/></div>
    </div>
    <p className="archive-availability"><span className="status-dot"/> 공룡부터 보석까지, 6개 분류의 50종을 찾아보세요</p>
    <div className="collection-filters" role="group" aria-label="도감 분류">
      <button aria-pressed={category === 'all'} className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>전체 <span>50</span></button>
      {COLLECTIONS.map(item => <button key={item.id} aria-pressed={category === item.id} className={category === item.id ? 'selected' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}
    </div>
    <div className="archive-grid-heading"><label className="rarity-filter"><select aria-label="도감 희귀도" value={rarity} onChange={event => setRarity(event.target.value)}><option value="all">모든 등급</option>{Object.entries(RARITY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><span>{visible.length}</span></label><button className={`found-filter ${onlyFound ? 'selected' : ''}`} aria-pressed={onlyFound} onClick={() => setOnlyFound(value => !value)}><span className="filter-checkbox">{onlyFound && <Icon name="check" size={11}/>}</span>발견한 표본만</button></div>
    <div className="collection-grid" role="list" aria-label="표본 카드 목록">
      {visible.map(slot => {
        const discovery = journal.discoveries[slot.id]
        return <article key={slot.id} className={`collection-card ${discovery ? 'discovered rarity-' + slot.rarity : 'undiscovered'} available`} role="listitem" aria-label={`도감 ${slot.number}번 ${discovery ? slot.name + ' 발견' : '미발견'}`}>
          {discovery ? <button className="collection-card-content" onClick={() => onOpen(slot.id)} aria-label={slot.name + ' 상세 보기'}>
            <div className="card-topline"><span>No. {String(slot.number).padStart(3, '0')}</span><span className="card-found-mark"><Icon name="check" size={12}/></span></div>
            <div className="card-specimen"><img src={slot.image} alt={'발견한 ' + slot.name} loading="lazy"/></div>
            <strong className="card-name">{slot.name}</strong><span className="card-status">{RARITY_LABELS[slot.rarity as Rarity]} <span className="duplicate-count">×{discovery.count}</span></span>
          </button> : <div className="collection-card-content">
            <div className="card-topline"><span>No. {String(slot.number).padStart(3, '0')}</span><span className="card-top-dot"/></div>
            <div className="card-unknown" aria-hidden="true"><img src={slot.image} alt="" loading="lazy"/><span className="question-mark">?</span></div>
            <strong className="card-name">???</strong><span className="card-status">미발견</span>
          </div>}
        </article>
      })}
    </div>
    {visible.length === 0 && <div className="collection-empty"><Icon name="book" size={30}/><h2>아직 발견한 표본이 없어요</h2><p>돌 속의 다음 이야기를 만나러 가볼까요?</p><button className="primary-button" onClick={onStart}>발굴 시작하기 <Icon name="arrow" size={18}/></button></div>}
    <div className="archive-end"><span className="small-line"/><p>{journal.count ? `작은 발견 ${journal.count}회, 이야기는 계속돼요.` : '당신의 첫 번째 발견을 기다리고 있어요.'}</p><span className="small-line"/></div>
  </div>
}
