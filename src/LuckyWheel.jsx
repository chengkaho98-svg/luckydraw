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
      slices, // 累積 pct 幾何 [a0,a1) — 同畫圖完全一致
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
  const viewBox = 300
  const cx = viewBox / 2
  const cy = viewBox / 2
  const R = 138
  const hubR = 34

  /* 切扇形 */
  const slices = useMemo(() => {
    let acc = 0
    return segments.map((s, i) => {
      const a0 = acc * 360
      acc += s.pct
      const a1 = acc * 360
      return { ...s, i, a0, a1 }
    })
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
      <svg viewBox="0 0 300 300" className="wheel-svg">
        <g style={{ transform: `rotate(${rot}deg)` }} className="wheel-rot">
          {slices.map((s) => (
            <path
              key={s.i}
              d={arc(s.a0, s.a1)}
              fill={PALETTE[s.i % PALETTE.length]}
              stroke="#2b1608"
              strokeWidth="2"
            />
          ))}
          {slices.map((s) => {
            const mid = (s.a0 + s.a1) / 2
            const lx = cx + 92 * Math.cos((mid - 90) * Math.PI / 180)
            const ly = cy + 92 * Math.sin((mid - 90) * Math.PI / 180)
            const rot = mid + 90
            return (
              <text
                key={s.i}
                x={lx}
                y={ly}
                textAnchor="middle"
                fontSize="14"
                fontWeight="700"
                fill="#fff"
                transform={`rotate(${rot}, ${lx}, ${ly})`}
              >{s.name}</text>
            )
          })}
        </g>
        <circle cx={cx} cy={cy} r={hubR} fill="#3a2415" stroke="#d9a441" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={hubR - 9} fill="#f6d44d" />
      </svg>

      {/* 指針 */}
      <div className="pointer" />

      {winAt != null && (
        <div className="win-glow" key={winAt} />
      )}
    </div>
  )
})
