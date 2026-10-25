// eslint-disable-next-line no-unused-expressions -- Playwright CLI consumes this function expression.
async (page) => {
  const report = { viewports: [], checks: [], screenshots: [], audio: {}, errors: [] }
  const assert = (value, message) => { if (!value) throw new Error(message); report.checks.push(message) }
  page.on('pageerror', error => report.errors.push(error.message))
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext
    window.__fossilAudio = []
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) { super(...args); window.__fossilAudio.push(this) }
      createAnalyser() { const node = super.createAnalyser(); this.__analyser = node; return node }
    }
  })
  await page.goto('http://127.0.0.1:5187')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  const screenshot = async name => {
    const path = 'output/playwright/' + name + '.png'
    await page.screenshot({ path, fullPage: true, animations: 'disabled' })
    report.screenshots.push(path)
  }
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.getByRole('heading', { name: '돌 속에 무엇이 숨어 있을까요?' }).waitFor()
    await page.locator('.hero-specimen').evaluate(image => image.decode())
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    assert(!overflow, 'No horizontal overflow at ' + width + 'px')
    report.viewports.push({ width, height: 844, overflow })
    await screenshot('home-' + width)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await screenshot('home-desktop')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '도감', exact: true }).click()
  await page.getByRole('list', { name: '표본 카드 목록' }).waitFor()
  assert(await page.getByRole('listitem').count() === 50, 'Collection shows all 50 planned slots')
  assert(await page.locator('.card-name').filter({ hasText: '???' }).count() === 50, 'Undiscovered cards display question marks')
  await screenshot('journal-empty-390')
  await page.getByRole('button', { name: '설정 열기' }).click()
  await page.getByRole('switch', { name: '발굴 사운드' }).click()
  await page.getByRole('switch', { name: '움직임 줄이기' }).click()
  await page.getByLabel('효과음 크기').focus()
  await page.keyboard.press('Home')
  for (let i = 0; i < 35; i++) await page.keyboard.press('ArrowRight')
  await screenshot('settings-390')
  await page.getByRole('button', { name: '설정 닫기' }).click()
  await page.reload()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fossil-asmr:prototype:v1')))
  assert(stored.preferences.muted && stored.preferences.reducedMotion && stored.preferences.volume === .35, 'Sound, motion and volume persist after reload')
  await page.getByRole('button', { name: '사운드 켜기' }).click()
  await page.getByRole('button', { name: '발굴 시작하기', exact: true }).click()
  const canvas = page.locator('canvas.excavation-canvas')
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.hits === '0')
  await screenshot('dig-000-390')
  const stats = () => canvas.evaluate(node => ({ ...node.dataset }))
  const tap = async (x, y) => {
    const box = await canvas.boundingBox()
    await page.mouse.click(box.x + x / 600 * box.width, box.y + y / 600 * box.height)
  }
  const pixel = (x, y) => canvas.evaluate((node, point) => Array.from(node.getContext('2d').getImageData(Math.round(node.width * point[0] / 600), Math.round(node.height * point[1] / 600), 1, 1).data), [x, y])
  const beforeLocal = await pixel(200, 200), beforeDistant = await pixel(430, 430)
  await tap(200, 200)
  let peak = 0
  for (let i = 0; i < 10; i++) {
    peak = Math.max(peak, await page.evaluate(() => {
      const ctx = window.__fossilAudio.at(-1), node = ctx?.__analyser
      if (!node) return 0
      const data = new Float32Array(node.fftSize); node.getFloatTimeDomainData(data)
      return Math.sqrt(data.reduce((sum, n) => sum + n * n, 0) / data.length)
    }))
    await page.waitForTimeout(10)
  }
  await page.waitForTimeout(900)
  assert(JSON.stringify(beforeLocal) !== JSON.stringify(await pixel(200, 200)), 'Tapped location changes after impact')
  assert(JSON.stringify(beforeDistant) === JSON.stringify(await pixel(430, 430)), 'Distant rock pixels remain unchanged')
  report.audio.rmsPeak = peak
  report.audio.context = await page.evaluate(() => window.__fossilAudio.at(-1)?.state)
  assert(peak > 0 && report.audio.context === 'running', 'User gesture unlocks audio and nonzero output reaches analyser')
  const initialProgress = (await stats()).progress
  await page.getByRole('button', { name: '홈', exact: true }).click()
  await page.getByRole('button', { name: '발굴', exact: true }).click()
  await page.waitForFunction(p => document.querySelector('canvas')?.dataset.progress === p, initialProgress)
  assert(true, 'Local excavation damage survives navigation away and back')
  await page.getByRole('button', { name: '사운드 끄기' }).click()
  const playedBefore = (await stats()).audioPlayed
  await tap(205, 205)
  await page.waitForTimeout(80)
  assert((await stats()).audioPlayed === playedBefore, 'Mute suppresses new audio voices')
  await page.getByRole('button', { name: '사운드 켜기' }).click()
  await page.getByRole('button', { name: '브러시 살살, 먼지 털기' }).click()
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * .4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * .65, box.y + box.height * .6, { steps: 12 })
  await page.mouse.up()
  assert((await stats()).audioPlayed > playedBefore, 'Brush drag produces interaction audio')
  await page.getByRole('button', { name: '망치 톡톡, 돌 깨기' }).click()
  await page.getByRole('button', { name: '새 암석으로 다시 시작' }).click()
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.hits === '0')
  assert((await stats()).progress === '0.0000', 'Restart clears all damage')
  let taps = 0
  const captured = new Set()
  for (let pass = 0; pass < 4; pass++) {
    for (const y of [160, 255, 350, 445]) {
      for (const x of [160, 255, 350, 445]) {
        if ((await stats()).phase !== 'excavating') break
        await tap(x, y); taps++
        await page.waitForTimeout(40)
        const p = Number((await stats()).progress)
        for (const threshold of [.25, .5, .75]) {
          if (p >= threshold && !captured.has(threshold)) {
            captured.add(threshold)
            await page.waitForTimeout(700)
            await screenshot('dig-' + Math.round(threshold * 100) + '-390')
          }
        }
      }
      if ((await stats()).phase !== 'excavating') break
    }
    if ((await stats()).phase !== 'excavating') break
  }
  assert((await stats()).phase === 'brushing', '90% exposure enters mandatory brush finishing')
  await screenshot('dig-90-brush-required-390')
  assert(await page.locator('.discovery-panel').count() === 0, 'Hammer cannot register a discovery at 90%')
  await page.getByRole('button', { name: '브러시 필수 · 마무리하기' }).click()
  for (let pass = 0; pass < 3 && (await stats()).phase === 'brushing'; pass++) {
    for (const y of [135, 210, 285, 360, 435]) {
      for (const x of [135, 210, 285, 360, 435]) {
        if ((await stats()).phase !== 'brushing') break
        await tap(x, y)
      }
      if ((await stats()).phase !== 'brushing') break
    }
  }
  await page.getByRole('heading', { name: '암모나이트', exact: true }).waitFor()
  await page.waitForTimeout(1000)
  await screenshot('dig-100-390')
  assert(taps >= 20 && taps <= 40, 'Distributed excavation reaches brush stage within 20-40 taps')
  report.hammerTapsToBrushStage = taps
  report.maxParticles = (await stats()).maxParticles
  const frames = (await stats()).frames
  await page.waitForTimeout(300)
  assert((await stats()).frames === frames, 'Canvas render loop sleeps after animations settle')
  const countBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('fossil-asmr:prototype:v1')).journal.count)
  await tap(300, 300)
  const countAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('fossil-asmr:prototype:v1')).journal.count)
  assert(countBefore === 1 && countAfter === 1, 'Completed specimen is registered exactly once')
  await page.getByRole('button', { name: '발견한 표본 살펴보기' }).click()
  await screenshot('journal-discovered-390')
  assert(await page.locator('.collection-card.discovered').count() === 1, 'Only the discovered specimen is revealed in the card grid')
  await page.getByRole('button', { name: '암모나이트 상세 보기' }).click()
  await screenshot('specimen-expanded-390')
  await page.keyboard.press('Escape')
  await page.reload()
  await page.getByRole('button', { name: '도감', exact: true }).click()
  assert(await page.getByRole('button', { name: '암모나이트 상세 보기' }).count() === 1, 'Discovery persists after reload')
  await page.getByRole('button', { name: '발굴', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.hits === '0')
  await tap(200, 200)
  await page.waitForTimeout(800)
  const progressBeforeRotate = (await stats()).progress
  await page.setViewportSize({ width: 844, height: 390 })
  await canvas.scrollIntoViewIfNeeded()
  await page.waitForTimeout(100)
  assert((await stats()).progress === progressBeforeRotate, 'Orientation change preserves damage')
  await screenshot('dig-landscape')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '설정 열기' }).click()
  await page.evaluate(() => { window.__originalStorageSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('QA storage quota') } })
  await page.getByRole('switch', { name: '발굴 사운드' }).click()
  await page.getByRole('button', { name: '설정 닫기' }).click()
  assert(await page.getByRole('alert').count() === 1, 'Storage failure is shown rather than silently claimed saved')
  await page.evaluate(() => { Storage.prototype.setItem = window.__originalStorageSet })
  await page.getByRole('button', { name: '다시 저장' }).click()
  assert(await page.getByRole('alert').count() === 0, 'Storage retry recovers')
  assert(report.errors.length === 0, 'No uncaught browser errors')
  return report
}
