import { useState, useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { spinOne } from './wheel-engine.js'
import { tick, fanfare } from './sfx.js'
import logoUrl from './assets/logo_hp.png'

const PALETTE = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#1982C4', '#FF7B54', '#00C2A8', '#D64D9A']

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
  const viewBox = 640                    // 加闊少少容納厚框
  const cx = viewBox / 2
  const cy = viewBox / 2
  const R = 260          // 扇形外半徑（新設計:出面有金屬杯托邊）
  const rimR = 270       // 杯托內壁
  const hubR = 78        // 中心 LOGO 座

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
    <div className="wheel-stand">   {/* 支架容器:座檯腳 + 底盤 + 輪盤 */}
      <div className="wheel-wrap">
        <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className="wheel-svg">
          <defs>
            <linearGradient id="goldRim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7e08b" />
              <stop offset="35%" stopColor="#d9a441" />
              <stop offset="62%" stopColor="#8a5a16" />
              <stop offset="100%" stopColor="#f2cf6e" />
            </linearGradient>
            <linearGradient id="goldInner" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffe9a8" />
              <stop offset="50%" stopColor="#d9a441" />
              <stop offset="100%" stopColor="#b97f22" />
            </linearGradient>
            <radialGradient id="hubPlate" cx="0.5" cy="0.35" r="0.85">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="72%" stopColor="#f4f6ff" />
              <stop offset="100%" stopColor="#d9def3" />
            </radialGradient>
            <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* ---------- 外框:金屬杯托環(參考圖2) ---------- */}
          <circle cx={cx} cy={cy} r="317" fill="#2b1709" />
          <circle cx={cx} cy={cy} r="314" fill="url(#goldRim)" />
          <circle cx={cx} cy={cy} r={rimR} fill="#1d1006" />

          {/* 杯托內圈嘅小燈泡(像真輪盤) */}
          {Array.from({ length: 24 }, (_, i) => {
            const a = i * 15
            const bx = cx + (rimR + 16) * Math.cos(a * Math.PI / 180)
            const by = cy + (rimR + 16) * Math.sin(a * Math.PI / 180)
            return <circle key={i} cx={bx} cy={by} r="4.5" fill="#fff7d6" stroke="#c98e2a" strokeWidth="1.2" className="bulb" />
          })}

          {/* ---------- 旋轉部分 ---------- */}
          <g style={{ transform: `rotate(${rot}deg)` }} className="wheel-rot">
            {slices.map((s) => (
              <path
                key={s.i}
                d={arc(s.a0, s.a1)}
                fill={PALETTE[s.i % PALETTE.length]}
                stroke="#2b1608"
                strokeWidth="3"
                className={winAt === s.i ? 'slice slice-win' : 'slice'}
              />
            ))}
            {/* 每格邊界小分隔釘(像真輪盤) */}
            {slices.map((s) => {
              const px = cx + R * Math.cos((s.a0 - 90) * Math.PI / 180)
              const py = cy + R * Math.sin((s.a0 - 90) * Math.PI / 180)
              return <circle key={`p${s.i}`} cx={px.toFixed(2)} cy={py.toFixed(2)} r="5.5" fill="#f6d44d" stroke="#7a4d10" strokeWidth="2" />
            })}
            {slices.map((s) => {
              const lx = cx + 170 * Math.cos((s.mid - 90) * Math.PI / 180)
              const ly = cy + 170 * Math.sin((s.mid - 90) * Math.PI / 180)
              return (
                <text
                  key={s.i}
                  x={lx.toFixed(2)}
                  y={ly.toFixed(2)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="27"
                  fontWeight="800"
                  fill="#fff"
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="1"
                  paintOrder="stroke"
                  transform={`rotate(${s.mid + 90}, ${lx}, ${ly})`}
                >{s.name}</text>
              )
            })}
          </g>

          {/* ---------- 中心 LOGO 座(不旋轉) ---------- */}
          <g filter="url(#softShadow)">
            <circle cx={cx} cy={cy} r={hubR} fill="url(#goldInner)" stroke="#7a4d10" strokeWidth="2" />
            <circle cx={cx} cy={cy} r={hubR - 11} fill="url(#hubPlate)" stroke="#eceef8" strokeWidth="1" />
            {/* 公司 LOGO */}
            <image
              href={logoUrl}
              x={cx - 33} y={cy - 33} width="66" height="66"
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        </svg>

        {/* 指針 */}
        <div className="pointer" />

        {winAt != null && (
          <div className="win-glow" key={winAt} />
        )}
      </div>

      {/* 支架:柱 + 底座(喺輪盤後面,純視覺) */}
      <div className="stand-pole" aria-hidden />
      <div className="stand-base" aria-hidden>
        <span className="base-shine" aria-hidden />
      </div>
    </div>
  )
})
