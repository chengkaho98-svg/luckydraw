import { useState, useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { spinOne } from './wheel-engine.js'
import { tick, fanfare } from './sfx.js'

const PALETTE = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#FF7B54', '#00C2A8', '#D64D9A']

export default forwardRef(function LuckyWheel({ segments, muted, onLanded }, ref) {
  const [rot, setRot] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winAt, setWinAt] = useState(null) // winner index (for paint)

  useImperativeHandle(ref, () => ({ spinTo: (i) => spinTo(i) }))

  /* ---------- spin ---------- */
  const spinTo = (idx) => {
    if (spinning) return
    setWinAt(null)
    setSpinning(true)
    spinOne({
      targetIdx: idx,
      slices,               // 畫面均分幾何（決定一格有幾闊）
      weights: segments.map((s) => s.weight), // 真實機率（決定抽中邊格）
      startRot: rot,
      onTick: () => { if (!muted) tick() },
      onDone: () => {
        setSpinning(false)
        setWinAt(idx)
        if (!muted) fanfare()
        onLanded?.(idx)
      },
      setRot,
    })
  }

  /* ---------- SVG 幾何 ---------- */
  const viewBox = 600
  const cx = viewBox / 2
  const cy = viewBox / 2
  const R = 288
  const hubR = 64

  /* ---------- 畫面扇形：一律均分（隱藏機率大細），動畫落點先按真實機率 ---------- */
  const slices = useMemo(() => {
    const n = Math.max(1, segments.length)
    const seg = 360 / n
    return segments.map((s, i) => ({
      ...s,
      i,
      a0: i * seg,
      a1: (i + 1) * seg,
      mid: i * seg + seg / 2,
    }))
  }, [segments])

  const arc = (a0, a1, r = R) => {
    const large = a1 - a0 > 180 ? 1 : 0
    const p = (a) => [
      cx + r * Math.cos((a - 90) * Math.PI / 180),
      cy + r * Math.sin((a - 90) * Math.PI / 180),
    ]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
  }

  /* ---------- 渲染 ---------- */
  return (
    <div className="wheel-wrap">
      <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className="wheel-svg">
        <g style={{ transform: `rotate(${rot}deg)` }} className="wheel-rot">
          {slices.map((s) => (
            <path
              key={s.i}
              d={arc(s.a0, s.a1)}
              fill={PALETTE[s.i % PALETTE.length]}
              stroke="#2b1608"
              strokeWidth="3"
              className={winAt === s.i ? 'slice-win' : undefined}
            />
          ))}
          {slices.map((s) => {
            const lx = cx + 185 * Math.cos((s.mid - 90) * Math.PI / 180)
            const ly = cy + 185 * Math.sin((s.mid - 90) * Math.PI / 180)
            return (
              <text
                key={s.i}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="26"
                fontWeight="800"
                fill="#fff"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="1"
                paintOrder="stroke"
                transform={`rotate(${s.mid + 90}, ${lx}, ${ly})`}
              >{s.name}</text>
            )
          })}
        </g>
        <circle cx={cx} cy={cy} r={hubR} fill="#3a2415" stroke="#d9a441" strokeWidth="5" />
        <circle cx={cx} cy={cy} r={hubR - 16} fill="#f6d44d" />
        <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle" fontSize="36">🎡</text>
      </svg>

      {/* 指針 */}
      <div className="pointer" />

      {winAt != null && (
        <div className="win-glow" key={winAt} />
      )}
    </div>
  )
})
