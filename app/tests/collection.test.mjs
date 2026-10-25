import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COLLECTION_SLOTS, COLLECTIONS, SPECIMENS, drawSpecimen, individualProbability, RARITY_PROBABILITIES } from '../src/domain/collection.ts'

test('50 unique specimens are connected to unique assets and all six categories', () => {
  assert.equal(COLLECTION_SLOTS.length, 50)
  assert.equal(new Set(COLLECTION_SLOTS.map(slot => slot.number)).size, 50)
  assert.equal(COLLECTION_SLOTS.filter(slot => slot.available).length, 50)
  assert.equal(new Set(SPECIMENS.map(item => item.image)).size, 50)
  for (const group of COLLECTIONS) assert.equal(COLLECTION_SLOTS.filter(slot => slot.category === group.id).length, group.count)
})

test('rarity counts and advertised individual probabilities sum correctly', () => {
  const counts = Object.fromEntries(Object.keys(RARITY_PROBABILITIES).map(rarity => [rarity, SPECIMENS.filter(item => item.rarity === rarity).length]))
  assert.deepEqual(counts, { normal: 24, rare: 15, special: 8, legendary: 3 })
  assert.ok(Math.abs(SPECIMENS.reduce((sum, item) => sum + individualProbability(item), 0) - 1) < 1e-12)
})

test('two-stage random selection makes every specimen reachable with equal within-tier shares', () => {
  const rolls = { normal: .2, rare: .7, special: .93, legendary: .99 }
  const seen = new Set()
  for (const [tier, roll] of Object.entries(rolls)) {
    const choices = SPECIMENS.filter(item => item.rarity === tier)
    for (let index = 0; index < choices.length; index++) {
      const sequence = [roll, (index + .5) / choices.length]
      const selected = drawSpecimen(() => sequence.shift())
      assert.equal(selected.id, choices[index].id)
      seen.add(selected.id)
    }
  }
  assert.equal(seen.size, 50)
  assert.equal(drawSpecimen(() => 0).rarity, 'normal')
  assert.equal(drawSpecimen(() => 1).rarity, 'legendary')
})
