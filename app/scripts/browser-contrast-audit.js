// eslint-disable-next-line no-unused-expressions -- Playwright CLI consumes this function expression.
async (page) => {
  const results = []
  for (const name of ['홈', '발굴', '도감']) {
    await page.getByRole('button', { name, exact: true }).click()
    const values = await page.evaluate(() => {
      const lum = rgb => {
        const v = rgb.map(n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4 })
        return v[0] * .2126 + v[1] * .7152 + v[2] * .0722
      }
      const rgb = text => text.match(/[\d.]+/g)?.map(Number)
      const failures = []
      for (const node of document.querySelectorAll('main *, header *, nav *')) {
        const ownText = Array.from(node.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()
        if (!ownText || !node.getBoundingClientRect().width || node.closest('[aria-hidden=true]')) continue
        const style = getComputedStyle(node), color = rgb(style.color)
        let bg = [246, 241, 231]
        const chain = []
        for (let parent = node; parent; parent = parent.parentElement) chain.unshift(parent)
        for (const parent of chain) {
          const current = rgb(getComputedStyle(parent).backgroundColor)
          if (current && current.length >= 3) {
            const alpha = current[3] ?? 1
            bg = current.slice(0, 3).map((n, i) => n * alpha + bg[i] * (1 - alpha))
          }
        }
        const a = lum(color.slice(0, 3)), b = lum(bg)
        const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
        const size = parseFloat(style.fontSize), bold = Number(style.fontWeight) >= 700
        const threshold = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5
        if (ratio < threshold) failures.push({ text: ownText.slice(0, 60), class: node.className, color: style.color, bg, ratio: Math.round(ratio * 100) / 100, size })
      }
      return failures
    })
    results.push({ name, failures: values })
  }
  return results
}
