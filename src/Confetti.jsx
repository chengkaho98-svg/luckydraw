import { useEffect, useRef, useState } from 'react'

const COLORS = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#00C2A8', '#FF7B54']

/* 簡易 canvas 彩帶 — winner 出現時灑一次 */
export default function Confetti({ seed = Date.now(), count = 140 }) {
  const ref = useRef(null)
  const [go, setGo] = useState(0)

  useEffect(() => { setGo(seed) }, [seed])

  useEffect(() => {
    if (!go || !ref.current) return
    const cvs = ref.current
    const ctx = cvs.getContext('2d')
    let raf = null
    let alive = true

    const W = (cvs.width = cvs.offsetWidth * window.devicePixelRatio)
    const H = (cvs.height = cvs.offsetHeight * window.devicePixelRatio)

    const parts = Array.from({ length: count }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.5,
      y: H * 0.35 + (Math.random() - 0.5) * H * 0.2,
      vx: (Math.random() - 0.5) * W * 0.005,
      vy: (Math.random() - 0.7) * H * 0.008,
      w: (4 + Math.random() * 8) * window.devicePixelRatio,
      h: (8 + Math.random() * 10) * window.devicePixelRatio,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.35,
      color: COLORS[i % COLORS.length],
      life: 0,
    }))

    const step = () => {
      if (!alive) return
      ctx.clearRect(0, 0, W, H)
      let anyAlive = false
      for (const p of parts) {
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.vy += H * 0.00025
        p.a += p.va
        if (p.y < H + 40) anyAlive = true
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.a)
        ctx.globalAlpha = Math.max(0, 1 - p.life / 220)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (anyAlive && parts[0].life < 260) raf = requestAnimationFrame(step)
    }
    requestAnimationFrame(step)

    return () => { alive = false; if (raf) cancelAnimationFrame(raf) }
  }, [go, count])

  return <canvas ref={ref} className="confetti-layer" key={seed} />
}
