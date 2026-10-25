import records from '../data/specimens.json' with { type: 'json' }

export type Rarity = 'normal' | 'rare' | 'special' | 'legendary'
export type Material = 'bone' | 'limestone' | 'crystal' | 'shale'
export type Specimen = {
  id: string; number: number; name: string; category: string; rarity: Rarity
  description: string; english: string; era: string; source: string
  reconstruction: boolean; image: string; material: Material
}
export const SPECIMENS = records as Specimen[]
export const RARITY_LABELS: Record<Rarity, string> = { normal: '노멀', rare: '레어', special: '스페셜', legendary: '전설' }
export const RARITY_PROBABILITIES: Record<Rarity, number> = { normal: .6, rare: .28, special: .1, legendary: .02 }
export const COLLECTIONS = [
  { id: 'dinosaur', label: '공룡', count: 10 },
  { id: 'ammonite', label: '암모나이트', count: 8 },
  { id: 'mineral', label: '보석·광물', count: 12 },
  { id: 'shell', label: '조개', count: 8 },
  { id: 'plant', label: '식물', count: 7 },
  { id: 'trilobite', label: '삼엽충', count: 5 },
] as const
export const COLLECTION_SLOTS = SPECIMENS.map(specimen => ({ ...specimen, available: true, categoryLabel: COLLECTIONS.find(group => group.id === specimen.category)!.label }))
export const getSpecimen = (id: string) => SPECIMENS.find(item => item.id === id)

/** Two draws: advertised tier probability, then uniform specimen within the tier. */
export function drawSpecimen(random: () => number = Math.random): Specimen {
  const roll = Math.max(0, Math.min(1 - Number.EPSILON, random()))
  let cumulative = 0
  let tier: Rarity = 'legendary'
  for (const [rarity, probability] of Object.entries(RARITY_PROBABILITIES) as [Rarity, number][]) {
    cumulative += probability
    if (roll < cumulative) { tier = rarity; break }
  }
  const choices = SPECIMENS.filter(item => item.rarity === tier)
  const index = Math.floor(Math.max(0, Math.min(1 - Number.EPSILON, random())) * choices.length)
  return choices[index]
}

export const individualProbability = (specimen: Specimen) => RARITY_PROBABILITIES[specimen.rarity] / SPECIMENS.filter(item => item.rarity === specimen.rarity).length
