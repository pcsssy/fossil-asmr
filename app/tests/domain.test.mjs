import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DamageField, GRID } from '../src/engine/DamageField.ts'
import { registerDiscovery, emptyJournal, readSaved, save, defaults } from '../src/platform/storage.ts'

test('damage persists locally; distant rock is untouched and outside taps do nothing', () => {
  const field = new DamageField()
  assert.equal(field.strike(5, 5), 0)
  field.strike(200, 200)
  const local = 33 * GRID + 33, distant = 65 * GRID + 65
  assert.ok(field.heights[local] < 4)
  assert.equal(field.heights[distant], 4)
  const first = field.heights[local]
  field.strike(200, 200)
  assert.ok(field.heights[local] < first)
  assert.equal(field.heights[distant], 4)
})

test('repeated hits at one position cannot complete the whole specimen', () => {
  const field = new DamageField()
  for (let n = 0; n < 100; n++) field.strike(300, 300)
  assert.equal(field.completed, false)
  assert.ok(field.progress < .4)
})

function exposeSpecimen(field) {
  let taps = 0
  for (let pass = 0; pass < 5 && field.phase === 'excavating'; pass++) {
    for (const y of [160, 255, 350, 445]) {
      for (const x of [160, 255, 350, 445]) {
        field.strike(x, y); taps++
        if (field.phase !== 'excavating') return taps
      }
    }
  }
  return taps
}

test('90% exposure requires spatial brushing; brush completion is immutable', () => {
  const field = new DamageField()
  const taps = exposeSpecimen(field)
  assert.equal(field.phase, 'brushing')
  assert.equal(field.progress, .9)
  assert.equal(field.completed, false)
  for (let n = 0; n < 50; n++) field.strike(300, 300, true)
  assert.equal(field.completed, false, 'brushing one spot cannot clear all dust')
  for (let pass = 0; pass < 4 && !field.completed; pass++) {
    for (const y of [135, 210, 285, 360, 435]) {
      for (const x of [135, 210, 285, 360, 435]) {
        field.strike(x, y, true)
      }
    }
  }
  assert.ok(field.completed, `cleaned ${field.cleaned}, progress ${field.progress}`)
  assert.equal(field.broken, false)
  const heights = field.heights.slice(), hits = field.hits
  assert.equal(field.strike(300, 300), 0)
  assert.deepEqual(field.heights, heights)
  assert.equal(field.hits, hits)
  console.log(`Distributed hammer calibration: ${taps} taps to brush stage`)
})

test('hammer overuse after 90% breaks the rock, including already cleared locations', () => {
  const field = new DamageField()
  exposeSpecimen(field)
  for (let n = 0; n < 3; n++) { field.strike(300, 300); assert.equal(field.broken, false) }
  field.strike(300, 300)
  assert.equal(field.phase, 'broken')
  assert.equal(field.progress, 1)
  assert.equal(field.completed, false)
  const heights = field.heights.slice(), dust = field.dust.slice()
  assert.equal(field.strike(300, 300, true), 0)
  assert.deepEqual(field.heights, heights)
  assert.deepEqual(field.dust, dust)
})

test('discovery is registered once per session and retains first date', () => {
  const first = registerDiscovery(emptyJournal, 'a', '2026-10-24T00:00:00Z')
  assert.equal(registerDiscovery(first, 'a').count, 1)
  const second = registerDiscovery(first, 'b', '2026-10-25T00:00:00Z')
  assert.equal(second.count, 2)
  assert.equal(second.firstFound, first.firstFound)
})

test('storage handles corrupt data, future schemas, persistence and quota failures', () => {
  let raw = '{invalid'
  globalThis.localStorage = { getItem: () => raw, setItem: (_, value) => { raw = value } }
  assert.equal(readSaved().journal.count, 0)
  raw = JSON.stringify({ version: 99, journal: { count: 100 } })
  assert.equal(readSaved().journal.count, 0)
  const journal = registerDiscovery(emptyJournal, 'a')
  assert.equal(save({ ...defaults, muted: true }, journal), true)
  assert.equal(readSaved().journal.count, 1)
  assert.equal(readSaved().preferences.muted, true)
  globalThis.localStorage.setItem = () => { throw Error('Quota exceeded') }
  assert.equal(save(defaults, journal), false)
})

test('old single-ammonite records migrate without losing count or first discovery date', () => {
  const raw = JSON.stringify({ version: 1, preferences: { muted: true }, journal: { version: 1, count: 7, firstFound: '2026-10-24T00:00:00Z', lastSession: 'old-session' } })
  globalThis.localStorage = { getItem: () => raw }
  const saved = readSaved()
  assert.equal(saved.journal.version, 2)
  assert.equal(saved.journal.count, 7)
  assert.equal(saved.journal.discoveries['specimen-011'].count, 7)
  assert.equal(saved.journal.discoveries['specimen-011'].firstFound, '2026-10-24T00:00:00Z')
  assert.equal(registerDiscovery(saved.journal, 'old-session').count, 7)
})

test('multiple species and duplicates retain independent first dates and counts', () => {
  const a = registerDiscovery(emptyJournal, 'a', '2026-10-24T00:00:00Z', 'specimen-010')
  const b = registerDiscovery(a, 'b', '2026-10-25T00:00:00Z', 'specimen-021')
  const c = registerDiscovery(b, 'c', '2026-10-26T00:00:00Z', 'specimen-010')
  assert.equal(c.count, 3)
  assert.equal(Object.keys(c.discoveries).length, 2)
  assert.equal(c.discoveries['specimen-010'].count, 2)
  assert.equal(c.discoveries['specimen-010'].firstFound, '2026-10-24T00:00:00Z')
  assert.equal(c.discoveries['specimen-021'].count, 1)
  assert.equal(registerDiscovery(c, 'a', undefined, 'specimen-010').count, 3)
})
