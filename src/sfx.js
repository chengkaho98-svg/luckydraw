/* Web Audio 特效 — 純前端,毋需任何音檔 */

let ctx = null
function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function tick() {
  const c = ensureCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'square'
  o.frequency.value = 880 + Math.random() * 120
  g.gain.setValueAtTime(0.04, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.06)
  o.connect(g).connect(c.destination)
  o.start()
  o.stop(c.currentTime + 0.07)
}

export function fanfare() {
  const c = ensureCtx()
  if (!c) return
  const notes = [523.25, 659.25, 783.99, 1046.5] /* C5 E5 G5 C6 */
  notes.forEach((f, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'triangle'
    o.frequency.value = f
    const t = c.currentTime + i * 0.12
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.12, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + 0.55)
  })
}
