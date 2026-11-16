import { useState, useRef, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react'
import { spinOne, inertialSpin, flingTo, drawByWeight } from './wheel-engine.js'
import { tick, fanfare } from './sfx.js'
import logoUrl from './assets/logo_hp.png'

/* 藍白相隔扇形(參考實物相片):白格配深藍字,藍格配白字 */
const BLUE = '#1E5AA8'
const WHITE = '#F7FAFD'
const sliceFill = (i) => (i % 2 === 0 ? BLUE : WHITE)
const sliceTextFill = (i) => (i % 2 === 0 ? '#FFFFFF' : '#123A73')

const MIN_FLING_V = 0.15  /* deg/ms — 甩尾速度低於呢個 = 抽獎無效,要再甩啲力 */
const FLING_MIN_V = 0.05  /* deg/ms — 慢過呢個就完全唔使甩尾 */
const CLICK_MOVE = 8      /* deg — 拖動唔夠多咁少算 click,唔觸發任何嘢 */

export default forwardRef(function LuckyWheel({ segments, muted, onLanded, onBusyChange }, ref) {
  const [rot, setRot] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [flinging, setFlinging] = useState(false)
  const [hintId, setHintId] = useState(0) // 「細力」提示(key 變 = 動畫重播)
  const [winAt, setWinAt] = useState(null) // winner index (for paint)

  const wrapRef = useRef(null)
  const dragRef = useRef(null)       // { rot, lastAngle, v, lastT, lastTickIdx, totalMove }
  const activeAnimRef = useRef(null) // cancel() 由 spinOne / inertialSpin / flingTo 返回
  const hintTimerRef = useRef(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  /* 上報 busy 狀態(拖轉 / 甩尾中)畀 App 用嚟 disable 按鈕 */
  useEffect(() => {
    onBusyChange?.(dragging || flinging)
  }, [dragging, flinging, onBusyChange])

  /* 提示顯示 2.2 秒後自動熄 */
  const showHint = () => {
    setHintId((k) => k + 1)
    clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => setHintId(0), 2200)
  }
  useEffect(() => () => clearTimeout(hintTimerRef.current), [])

  const cancelActive = () => {
    if (activeAnimRef.current) {
      activeAnimRef.current()
      activeAnimRef.current = null
    }
  }

  /* ---------- 指針拖轉 ---------- */
  const pointerAngle = (e) => {
    const r = wrapRef.current.getBoundingClientRect()
    return Math.atan2(
      e.clientY - (r.top + r.height / 2),
      e.clientX - (r.left + r.width / 2),
    ) * 180 / Math.PI
  }

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return
    const r = wrapRef.current.getBoundingClientRect()
    // 中心 LOGO 座係固定嘅,唔跟手轉
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const dist = Math.hypot(dx, dy)
    if (dist < (hubR / viewBox) * r.width) return
    e.preventDefault()
    cancelActive()          // 抝住 = 立即停低任何動畫
    setSpinning(false)
    const n = Math.max(1, slices.length)
    dragRef.current = {
      rot,
      lastAngle: pointerAngle(e),
      v: 0,
      lastT: performance.now(),
      lastTickIdx: Math.floor((((rot % 360) + 360) % 360) / (360 / n)),
      totalMove: 0,
    }
    wrapRef.current.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const a = pointerAngle(e)
    let delta = a - d.lastAngle
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    d.lastAngle = a
    d.rot += delta
    d.totalMove += Math.abs(delta)
    const now = performance.now()
    const dt = now - d.lastT
    if (dt > 0) {
      /* 指數平滑,避免手抖令速度跳動 */
      d.v = 0.75 * d.v + 0.25 * (delta / dt)
    }
    d.lastT = now
    setRot(d.rot)
    const n = Math.max(1, slices.length)
    const idx = Math.floor((((d.rot % 360) + 360) % 360) / (360 / n))
    if (idx !== d.lastTickIdx) {
      d.lastTickIdx = idx
      if (!mutedRef.current) tick()
    }
  }

  const endDrag = () => {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    setDragging(false)

    const v = d.v
    const av = Math.abs(v)

    /* 幾乎冇郁(純 click) → 唔做咩 */
    if (d.totalMove < CLICK_MOVE) return

    /* 甩得太細力 → 抽獎無效,短促滑低 + 提示再甩啲力 */
    if (av < MIN_FLING_V) {
      showHint()
      if (av > FLING_MIN_V) {
        setFlinging(true)
        activeAnimRef.current = inertialSpin({
          startRot: d.rot,
          velocity: v,
          n: Math.max(1, slices.length),
          setRot,
          onTick: () => { if (!mutedRef.current) tick() },
          onDone: () => { activeAnimRef.current = null; setFlinging(false) },
        })
      }
      return
    }

    /* 甩得夠力 → 正式抽獎:先按真實機率抽中獎格,再減速停低喺該格 */
    const idx = drawByWeight(segments.map((s) => s.weight))
    setFlinging(true)
    activeAnimRef.current = flingTo({
      startRot: d.rot,
      velocity: v,
      targetIdx: idx,
      slices,
      weights: segments.map((s) => s.weight),
      setRot,
      onTick: () => { if (!mutedRef.current) tick() },
      onDone: () => {
        activeAnimRef.current = null
        setFlinging(false)
        setWinAt(idx)
        if (!mutedRef.current) fanfare()
        onLanded?.(idx)
      },
    })
  }

  /* ---------- 按鈕 spin(按真實機率) ---------- */
  const spinTo = (idx) => {
    if (spinning) return
    cancelActive()
    setWinAt(null)
    setSpinning(true)
    activeAnimRef.current = spinOne({
      targetIdx: idx,
      slices,               // 畫面均分幾何（決定一格有幾闊）
      weights: segments.map((s) => s.weight), // 真實機率（決定抽中邊格）
      startRot: rot,
      onTick: () => { if (!mutedRef.current) tick() },
      onDone: () => {
        activeAnimRef.current = null
        setSpinning(false)
        setWinAt(idx)
        if (!mutedRef.current) fanfare()
        onLanded?.(idx)
      },
      setRot,
    })
  }

  useImperativeHandle(ref, () => ({ spinTo: (i) => spinTo(i) }))

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
    <div className="wheel-outer">
      <div
        ref={wrapRef}
        className={dragging ? 'wheel-wrap dragging' : 'wheel-wrap'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className="wheel-svg">
          <defs>
            <linearGradient id="goldRim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f4e2ae" />
              <stop offset="35%" stopColor="#c9a24b" />
              <stop offset="62%" stopColor="#6e5219" />
              <stop offset="100%" stopColor="#e8cf85" />
            </linearGradient>
            <linearGradient id="goldInner" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f0e0b0" />
              <stop offset="50%" stopColor="#c9a24b" />
              <stop offset="100%" stopColor="#8f6d24" />
            </linearGradient>
            <linearGradient id="steelRing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d5f94" />
              <stop offset="50%" stopColor="#1b355c" />
              <stop offset="100%" stopColor="#0d1f3c" />
            </linearGradient>
            <radialGradient id="hubPlate" cx="0.5" cy="0.35" r="0.85">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="72%" stopColor="#f4f8ff" />
              <stop offset="100%" stopColor="#d4def0" />
            </radialGradient>
            <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* ---------- 外框:香檳金屬圈 + 深藍杯托 ---------- */}
          <circle cx={cx} cy={cy} r="317" fill="#0a1930" />
          <circle cx={cx} cy={cy} r="314" fill="url(#steelRing)" />
          <circle cx={cx} cy={cy} r="302" fill="none" stroke="#c9a24b" strokeWidth="2.5" opacity="0.85" />
          <circle cx={cx} cy={cy} r={rimR} fill="#0d1f3c" />

          {/* 杯托內圈嘅小燈泡 */}
          {Array.from({ length: 24 }, (_, i) => {
            const a = i * 15
            const bx = cx + (rimR + 16) * Math.cos(a * Math.PI / 180)
            const by = cy + (rimR + 16) * Math.sin(a * Math.PI / 180)
            return <circle key={i} cx={bx} cy={by} r="4.5" fill="#ffe9ad" stroke="#8f6d24" strokeWidth="1.2" className="bulb" />
          })}

          {/* ---------- 旋轉部分 ---------- */}
          <g style={{ transform: `rotate(${rot}deg)` }} className="wheel-rot">
            {slices.map((s) => (
              <path
                key={s.i}
                d={arc(s.a0, s.a1)}
                fill={sliceFill(s.i)}
                stroke="#0A1930"
                strokeWidth="2.5"
                className={winAt === s.i ? 'slice slice-win' : 'slice'}
              />
            ))}
            {/* 每格邊界小分隔釘 */}
            {slices.map((s) => {
              const px = cx + R * Math.cos((s.a0 - 90) * Math.PI / 180)
              const py = cy + R * Math.sin((s.a0 - 90) * Math.PI / 180)
              return <circle key={`p${s.i}`} cx={px.toFixed(2)} cy={py.toFixed(2)} r="5.5" fill="#c9a24b" stroke="#6e5219" strokeWidth="2" />
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
                  fontWeight="700"
                  fill={sliceTextFill(s.i)}
                  stroke="rgba(10, 25, 48, 0.18)"
                  strokeWidth="0.8"
                  paintOrder="stroke"
                  transform={`rotate(${s.mid + 90}, ${lx}, ${ly})`}
                >{s.name}</text>
              )
            })}
          </g>

          {/* ---------- 中心 LOGO 座(不旋轉) ---------- */}
          <g filter="url(#softShadow)">
            <circle cx={cx} cy={cy} r={hubR} fill="url(#goldInner)" stroke="#6e5219" strokeWidth="2" />
            <circle cx={cx} cy={cy} r={hubR - 11} fill="url(#hubPlate)" stroke="#eef2f9" strokeWidth="1" />
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

      {/* 甩得太細力提示 */}
      {hintId > 0 && (
        <div className="fling-hint" key={hintId}>
          💪 甩得太細力，抽獎無效，請再甩啲力！
        </div>
      )}
    </div>
  )
})
