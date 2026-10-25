// eslint-disable-next-line no-unused-expressions -- Playwright CLI consumes this function expression.
async (page) => {
  const checks = [], failures = []
  const assert = (condition, label) => { if (!condition) throw Error(label); checks.push(label) }
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('http://127.0.0.1:5187')
  await page.getByRole('button', { name: '도감', exact: true }).click()
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert(await page.locator('.collection-card').count() === 50, '50 overview cards at ' + width + 'px')
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No collection overflow at ' + width + 'px')
    await page.screenshot({ path: 'output/playwright/collection-v2-' + width + '.png', fullPage: false, animations: 'disabled' })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '공룡', exact: true }).click()
  assert(await page.locator('.collection-card').count() === 10, 'Category filter shows 10 planned dinosaur slots')
  await page.getByRole('button', { name: '암모나이트', exact: true }).click()
  assert(await page.locator('.collection-card').count() === 8, 'Ammonite category shows 8 slots')
  await page.getByRole('button', { name: '발견한 표본만' }).click()
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem('fossil-asmr:prototype:v1') || '{}').journal?.count || 0)
  assert(await page.locator('.collection-card').count() === (count ? 1 : 0), 'Found filter reveals only earned specimens')
  await page.getByRole('button', { name: '설정 열기' }).click()
  const reduced = page.getByRole('switch', { name: '움직임 줄이기' })
  if (await reduced.getAttribute('aria-checked') === 'true') await reduced.click()
  await page.getByRole('button', { name: '설정 닫기' }).click()
  await page.getByRole('button', { name: '발굴', exact: true }).click()
  const canvas = page.locator('.excavation-canvas')
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.phase === 'excavating')
  const phase = () => canvas.getAttribute('data-phase')
  const tap = async (x, y) => {
    const box = await canvas.boundingBox()
    await page.mouse.click(box.x + x * box.width / 600, box.y + y * box.height / 600)
    await page.waitForTimeout(35)
  }
  for (let pass = 0; pass < 4 && await phase() === 'excavating'; pass++) {
    for (const y of [160, 255, 350, 445]) {
      for (const x of [160, 255, 350, 445]) {
        if (await phase() !== 'excavating') break
        await tap(x, y)
      }
      if (await phase() !== 'excavating') break
    }
  }
  assert(await phase() === 'brushing', 'Exposure stops at mandatory brush stage')
  for (const [width, height] of [[320, 720], [360, 740], [390, 844], [430, 932]]) {
    await page.setViewportSize({ width, height })
    const tray = await page.getByRole('group', { name: '발굴 도구' }).boundingBox()
    const nav = await page.getByRole('navigation').boundingBox()
    assert(tray.y + tray.height <= nav.y, 'Finishing tools remain above bottom navigation at ' + width + 'px')
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'output/playwright/brush-warning-v2-390.png', fullPage: false })
  for (let n = 0; n < 3; n++) await tap(300, 300)
  assert(await phase() === 'brushing', 'Warning gives room to switch tools before final break')
  await page.screenshot({ path: 'output/playwright/hammer-danger-v2-390.png', fullPage: false })
  await tap(300, 300)
  await page.getByRole('heading', { name: '다음에는 꼭 만나요' }).waitFor()
  assert(await phase() === 'broken', 'Hammer pushed to 100% breaks rock rather than completing')
  await page.waitForTimeout(100)
  await page.screenshot({ path: 'output/playwright/rock-breaking-v2-390.png', fullPage: false })
  await page.waitForTimeout(1000)
  const retry = await page.getByRole('button', { name: '새 암석으로 다시 도전' }).boundingBox()
  const navigation = await page.getByRole('navigation').boundingBox()
  assert(retry.y + retry.height <= navigation.y, 'Failure retry button is visible above navigation')
  await page.screenshot({ path: 'output/playwright/rock-broken-v2-390.png', fullPage: true })
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('fossil-asmr:prototype:v1') || '{}').journal?.count || 0)
  assert(after === count, 'Failed excavation does not change existing discovery records')
  assert(await page.locator('.discovery-panel').count() === 0, 'Failed excavation has no success panel')
  const hits = await canvas.getAttribute('data-hits')
  await tap(300, 300)
  assert(await canvas.getAttribute('data-hits') === hits, 'Broken rock ignores further impacts')
  await page.getByRole('button', { name: '나의 도감 보기' }).click()
  await page.getByRole('button', { name: '발굴', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.phase === 'excavating')
  assert(await canvas.getAttribute('data-hits') === '0', 'Fresh attempt starts safely after failure and navigation')
  assert(failures.length === 0, 'No uncaught browser errors in failure flow')
  return { checks, failures, preservedCount: count }
}
