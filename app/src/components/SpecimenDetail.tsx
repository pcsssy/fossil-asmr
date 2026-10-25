import { useEffect, useRef } from 'react'
import { RARITY_LABELS, individualProbability, COLLECTIONS } from '../domain/collection'
import type { Specimen } from '../domain/collection'
import type { Discovery } from '../platform/storage'
import Icon from './Icon'

export default function SpecimenDetail({ specimen, discovery, close }: { specimen: Specimen; discovery: Discovery; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} className={'specimen-dialog rarity-' + specimen.rarity} aria-label={specimen.name + ' 확대 관찰'} onCancel={close}>
    <button className="icon-button" aria-label="확대 보기 닫기" onClick={close}><Icon name="close"/></button>
    <span className="eyebrow">SPECIMEN {String(specimen.number).padStart(3, '0')} · {COLLECTIONS.find(item => item.id === specimen.category)?.label}</span>
    <img src={specimen.image} alt={specimen.name + '의 형태와 질감 확대'}/>
    <div className="specimen-modal-title"><h2>{specimen.name}</h2><span className="rarity-label">{RARITY_LABELS[specimen.rarity]}</span></div>
    <p>{specimen.english}</p><p className="specimen-description">{specimen.description}</p><p>{specimen.era}</p>
    <dl className="specimen-record"><div><dt>최초 발견</dt><dd>{new Date(discovery.firstFound).toLocaleDateString('ko-KR')}</dd></div><div><dt>발견 횟수</dt><dd>{discovery.count}회</dd></div><div><dt>개별 등장 확률</dt><dd>{(individualProbability(specimen) * 100).toFixed(3)}%</dd></div></dl>
    <p className="scientific-note">실제 출토 표본의 사진이 아닌 시각적 재구성이에요. 게임 내 등급은 학술적 가치나 실제 희소성을 뜻하지 않아요.</p>
    <a className="reference-link" href={specimen.source} target="_blank" rel="noreferrer">분류 참고 자료 보기 <Icon name="arrow" size={14}/></a>
  </dialog>
}
