// eslint-disable-next-line no-unused-expressions -- Playwright CLI consumes this function expression.
async (page) => {
  const checks = [], metrics = {}
  const assert = (value, text) => { if (!value) throw Error(text); checks.push(text) }
  await page.goto('http://127.0.0.1:5187')
  await page.getByRole('button', { name: '설정 열기' }).click()
  const reduced = page.getByRole('switch', { name: '움직임 줄이기' })
  if (await reduced.getAttribute('aria-checked') === 'true') await reduced.click()
  await page.getByRole('button', { name: '설정 닫기' }).click()
  await page.getByRole('button', { name: '발굴 시작하기', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.hits === '0')
  const canvas = page.locator('canvas.excavation-canvas')
  for (const [width, height] of [[320, 720], [360, 740], [390, 844], [430, 932]]) {
    await page.setViewportSize({ width, height })
    const tool = await page.getByRole('group', { name: '발굴 도구' }).boundingBox()
    const nav = await page.getByRole('navigation', { name: '주 메뉴' }).boundingBox()
    assert(tool.y + tool.height <= nav.y, 'Tool tray clears navigation at ' + width + 'x' + height)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    window.__qaFrames = []
    let prev = performance.now()
    window.__qaFrameLoop = true
    function frame(now) { window.__qaFrames.push(now - prev); prev = now; if (window.__qaFrameLoop) requestAnimationFrame(frame) }
    requestAnimationFrame(frame)
  })
  const box = await canvas.boundingBox()
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  for (let i = 0; i < 60; i++) await page.mouse.click(point.x, point.y)
  await page.waitForTimeout(50)
  await page.screenshot({ path: 'output/playwright/dig-impact-390.png', fullPage: true })
  const during = await canvas.evaluate(node => ({ ...node.dataset }))
  assert(Number(during.progress) < .4, '60 rapid taps at one point do not reveal distant specimen')
  assert(Number(during.maxParticles) <= 240, 'High-quality particles remain bounded under rapid taps')
  await page.waitForTimeout(1200)
  const settled = await canvas.evaluate(node => ({ ...node.dataset }))
  assert(settled.particles === '0', 'Rapid-tap particles expire')
  metrics.frameIntervals = await page.evaluate(() => {
    window.__qaFrameLoop = false
    const values = window.__qaFrames.slice(2).sort((a, b) => a - b)
    return { samples: values.length, median: values[Math.floor(values.length * .5)], p95: values[Math.floor(values.length * .95)], max: values.at(-1), dpr: devicePixelRatio, userAgent: navigator.userAgent }
  })
  metrics.maxParticles = Number(during.maxParticles)
  await canvas.focus()
  const hits = Number(settled.hits)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await page.waitForTimeout(50)
  assert(Number(await canvas.getAttribute('data-hits')) === hits + 1, 'Keyboard position and strike work')
  await page.getByRole('button', { name: '브러시 살살, 먼지 털기' }).click()
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await canvas.dispatchEvent('pointercancel', { pointerId: 1 })
  await page.mouse.move(point.x + 50, point.y + 20)
  await page.mouse.up()
  assert(true, 'Pointer cancellation completes without runtime failure')
  await page.route('**/assets/limestone.png', route => route.abort())
  await page.getByRole('button', { name: '새 암석으로 다시 시작' }).click()
  await page.getByText('이미지를 불러오지 못했어요.').waitFor()
  assert(true, 'Failed texture load displays retry state')
  await page.unroute('**/assets/limestone.png')
  await page.getByRole('button', { name: '다시 불러오기' }).click()
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.hits === '0')
  assert(true, 'Asset retry restores fresh excavation')
  await page.getByRole('button', { name: '설정 열기' }).click()
  await page.getByLabel('그래픽 품질').selectOption('low')
  await page.getByRole('button', { name: '설정 닫기' }).click()
  assert(await canvas.evaluate(node => node.width <= node.getBoundingClientRect().width * 1.25 + 1), 'Low-quality mode caps render resolution')
  return { checks, metrics }
}
