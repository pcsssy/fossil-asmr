// eslint-disable-next-line no-unused-expressions -- Playwright CLI consumes this function expression.
async (page) => {
  const checks = [], errors = []
  const assert = (ok, label) => { if (!ok) throw Error(label); checks.push(label) }
  page.on('pageerror', error => errors.push(error.message))
  const catalog = JSON.parse(await (await page.request.get('http://127.0.0.1:5186/src/data/specimens.json')).text())
  await page.goto('http://127.0.0.1:5187')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.setViewportSize({ width: 390, height: 844 })
  const decoded = await page.evaluate(async items => Promise.all(items.map(async item => {
    const image = new Image(); image.src = item.image
    try { await image.decode(); return image.naturalWidth >= 700 } catch { return false }
  })), catalog)
  assert(decoded.length === 50 && decoded.every(Boolean), 'All 50 production specimen images decode')
  await page.getByRole('button', { name: '도감', exact: true }).click()
  assert(await page.locator('.card-name').filter({ hasText: '???' }).count() === 50, 'All 50 undiscovered cards hide names')
  assert(await page.getByText('준비 중', { exact: true }).count() === 0, 'No placeholder specimens remain')
  await page.screenshot({ path: 'output/playwright/catalog50-unknown.png', fullPage: false })
  // Unlock the procedural audio before controlling the next two catalog draws.
  await page.locator('.sound-button').click()
  const canvas = page.locator('.excavation-canvas')
  const phase = () => canvas.getAttribute('data-phase')
  const tap = async (x, y) => {
    const box = await canvas.boundingBox()
    await page.mouse.click(box.x + x * box.width / 600, box.y + y * box.height / 600)
    await page.waitForTimeout(35)
  }
  const select = async id => {
    const item = catalog.find(value => value.id === id)
    const peers = catalog.filter(value => value.rarity === item.rarity)
    const tier = { normal: .3, rare: .7, special: .9, legendary: .99 }[item.rarity]
    await page.evaluate(rolls => {
      const original = Math.random
      Math.random = () => { const value = rolls.shift(); if (!rolls.length) Math.random = original; return value }
    }, [tier, (peers.findIndex(value => value.id === id) + .5) / peers.length])
    if (await canvas.count()) await page.getByRole('button', { name: '새 암석으로 다시 시작' }).click()
    else await page.getByRole('button', { name: '발굴', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.phase === 'excavating' && !document.querySelector('.stage-message'))
    return item
  }
  const expose = async () => {
    for (let pass = 0; pass < 4 && await phase() === 'excavating'; pass++) {
      for (const y of [160, 255, 350, 445]) for (const x of [160, 255, 350, 445]) {
        if (await phase() !== 'excavating') break
        await tap(x, y)
      }
    }
    assert(await phase() === 'brushing', 'Mandatory brush stage reached')
  }
  for (const id of ['specimen-010', 'specimen-011', 'specimen-021', 'specimen-029', 'specimen-032', 'specimen-039', 'specimen-046', 'specimen-010']) {
    const item = await select(id)
    await expose()
    await page.getByRole('button', { name: '브러시 필수 · 마무리하기' }).click()
    for (let pass = 0; pass < 3 && await phase() === 'brushing'; pass++) {
      for (const y of [135, 210, 285, 360, 435]) for (const x of [135, 210, 285, 360, 435]) {
        if (await phase() !== 'brushing') break
        await tap(x, y)
      }
    }
    await page.getByRole('heading', { name: item.name, exact: true }).waitFor()
    assert(await phase() === 'completed', item.name + ' can actually be excavated')
    const action = await page.getByRole('button', { name: '발견한 표본 살펴보기' }).boundingBox()
    const navigation = await page.getByRole('navigation').boundingBox()
    assert(action.y + action.height <= navigation.y, item.name + ' completion action clears bottom navigation')
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'output/playwright/catalog50-' + id + '.png', fullPage: true })
  }
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('fossil-asmr:prototype:v1')).journal)
  assert(Object.keys(journal.discoveries).length === 7 && journal.count === 8, 'Seven specimens across six categories save separately with eight successful digs')
  assert(journal.discoveries['specimen-010'].count === 2, 'Duplicate dinosaur discovery increments its own count')
  await select('specimen-029')
  await expose()
  for (let n = 0; n < 4; n++) await tap(300, 300)
  assert(await phase() === 'broken', 'Hammer still breaks the rock at 100%')
  const preserved = await page.evaluate(() => JSON.parse(localStorage.getItem('fossil-asmr:prototype:v1')).journal)
  assert(JSON.stringify(preserved) === JSON.stringify(journal), 'Failed discovery preserves every existing specimen record')
  await page.reload()
  await page.getByRole('button', { name: '도감', exact: true }).click()
  assert(await page.locator('.collection-card.discovered').count() === 7, 'Seven unique specimens persist after reload')
  // All-earned fixture is isolated browser QA data; no production unlock feature.
  await page.evaluate(items => {
    const saved = JSON.parse(localStorage.getItem('fossil-asmr:prototype:v1'))
    saved.journal.discoveries = Object.fromEntries(items.map(item => [item.id, { count: 1, firstFound: '2026-10-24T00:00:00.000Z', lastFound: '2026-10-24T00:00:00.000Z' }]))
    saved.journal.count = 50
    localStorage.setItem('fossil-asmr:prototype:v1', JSON.stringify(saved))
  }, catalog)
  await page.reload()
  await page.getByRole('button', { name: '도감', exact: true }).click()
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert(await page.locator('.collection-card.discovered').count() === 50, 'All 50 earned cards render at ' + width)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at ' + width)
    await page.locator('.collection-grid img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode() })))
    await page.screenshot({ path: 'output/playwright/catalog50-all-' + width + '.png', fullPage: true })
  }
  for (const [name, count] of [['공룡', 10], ['암모나이트', 8], ['보석·광물', 12], ['조개', 8], ['식물', 7], ['삼엽충', 5]]) {
    await page.getByRole('button', { name, exact: true }).click()
    assert(await page.locator('.collection-card').count() === count, name + ' category count is ' + count)
  }
  await page.getByRole('button', { name: '전체 50', exact: true }).click()
  for (const [tier, count] of [['normal', 24], ['rare', 15], ['special', 8], ['legendary', 3]]) {
    await page.getByLabel('도감 희귀도').selectOption(tier)
    assert(await page.locator('.collection-card').count() === count, tier + ' rarity count is ' + count)
  }
  await page.getByLabel('도감 희귀도').selectOption('all')
  await page.setViewportSize({ width: 320, height: 720 })
  for (const id of ['specimen-009', 'specimen-029', 'specimen-045']) {
    const item = catalog.find(value => value.id === id)
    await page.getByRole('button', { name: item.name + ' 상세 보기', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: item.name + ' 확대 관찰' })
    await dialog.locator('img').evaluate(image => image.decode())
    assert(await dialog.isVisible(), item.name + ' opens its own detailed image')
    assert(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth), 'No detail overflow for ' + item.id)
    await page.screenshot({ path: 'output/playwright/catalog50-detail-' + id + '.png', fullPage: false })
    await page.getByRole('button', { name: '확대 보기 닫기' }).click()
  }
  await page.getByRole('button', { name: '설정 열기' }).click()
  await page.locator('.probability-details summary').click()
  assert(await page.getByRole('cell', { name: '60%', exact: true }).isVisible(), 'Advertised tier probabilities are visible')
  await page.screenshot({ path: 'output/playwright/catalog50-probabilities.png', fullPage: false })
  await page.getByRole('button', { name: '설정 닫기' }).click()
  await page.getByRole('button', { name: '홈', exact: true }).click()
  await page.locator('.hero-specimen').evaluate(image => image.decode())
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'output/playwright/catalog50-home.png', fullPage: true, animations: 'disabled' })
  assert(errors.length === 0, 'No uncaught browser errors')
  return { checks, errors, journal }
}
