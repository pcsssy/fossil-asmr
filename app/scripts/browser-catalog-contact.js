// eslint-disable-next-line no-unused-expressions -- Playwright CLI consumes this function expression.
async (page) => {
  const items = await (await page.request.get('http://127.0.0.1:5186/src/data/specimens.json')).json()
  await page.setViewportSize({ width: 1600, height: 1480 })
  await page.setContent('<html lang="ko"><head><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#f6f1e7;color:#302820;font-family:Arial,sans-serif}h1{font-size:22px;margin:0 0 8px}p{font-size:13px;margin:0 0 20px;color:#706154}main{display:grid;grid-template-columns:repeat(10,1fr);gap:10px}article{background:#fffcf6;border:1px solid #dfd4c3;border-radius:12px;text-align:center;padding:8px;min-height:230px}img{width:100%;height:165px;object-fit:contain}b{display:block;font-size:12px;line-height:1.5}small{display:block;color:#706154;font-size:11px;margin-bottom:2px}</style></head><body><h1>FOSSIL ATELIER — 50종 에셋 시각 검토</h1><p>검증용 전체 표본 모음 · 실제 플레이에서는 미발견 카드가 ???로 표시됩니다 · AI 생성 시각 재구성</p><main></main></body></html>')
  await page.evaluate(records => {
    document.querySelector('main').innerHTML = records.map(item => `<article><small>${item.id} / ${item.rarity}</small><img src="http://127.0.0.1:5187${item.image}" alt=""><b>${item.name}</b></article>`).join('')
  }, items)
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
  await page.screenshot({ path: 'output/playwright/catalog50-contact.png', fullPage: true })
  return { images: await page.locator('img').count(), screenshot: 'output/playwright/catalog50-contact.png' }
}
