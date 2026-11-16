/* 抽獎輪盤動畫引擎 — 純函數,無 React 依賴 */

/*
  幾何約定(同 LuckyWheel.jsx 一致):
  - 畫面扇形一律「均分」:slice i 佔 [i*seg, (i+1)*seg),seg = 360/n(隱藏機率大細)
  - a-座標 → 螢幕角度 = a - 90,即 a=0 正正係指針所在嘅頂部
  - 輪盤用 CSS rotate() 旋轉(順時針為正),目標中點要停喺指針度:
      (mid - 90) + rot ≡ -90  (mod 360)   =>   rot ≡ -mid  (mod 360)
  - 機率隱藏喺「格內落點 jitter」:中獎結果已由 App 按真實權重抽好,
    輪盤只係將指針帶去該格;格內停邊個位置加入隨機同權重偏置,
    令大獎嘅停點傾向格中線,細機率反而偏側 — 視覺更自然又唔穿幫。
*/

export function spinOne({ targetIdx, slices, weights, startRot, onDone, setRot, onTick }) {
  const T = 4200
  const turns = 5
  const n = slices.length
  const seg = 360 / n

  const s = slices[targetIdx]
  const mid = (s.a0 + s.a1) / 2

  /* 格內落點:jitter 按真實權重分佈(上限 ±0.36 扇形闊度,指針一定留喺格內) */
  const weightsArr = Array.isArray(weights) && weights.length === n ? weights : slices.map(() => 1)
  const totalW = weightsArr.reduce((a, b) => a + b, 0) || 1
  const wPct = (weightsArr[targetIdx] ?? 1) / totalW
  const evenPct = 1 / n

  /* 權重高過平均 → 落點集中近中線(bias 細);低過平均 → 偏離中線多啲 */
  const bias = Math.min(0.9, Math.max(0.25, evenPct / Math.max(wPct, 0.02)))
  const jitter = (Math.random() - 0.5) * seg * 0.72 * bias

  /* 指針喺頂部(a=0):rot ≡ -mid + jitter (mod 360) */
  const landing = (((-mid + jitter) % 360) + 360) % 360

  const final = startRot + turns * 360 + (((landing - (startRot % 360)) % 360) + 360) % 360
  const delta = final - startRot

  let t0 = null
  let lastTickDeg = 0
  let raf = 0
  let stopped = false
  const damping = 3.2 /* easeOutQuart-ish */

  const frame = (ts) => {
    if (stopped) return
    if (!t0) t0 = ts
    const t = Math.min(1, (ts - t0) / T)
    const ease = 1 - Math.pow(1 - t, damping)
    const deg = startRot + delta * ease
    setRot(deg)

    if (onTick && Math.abs(deg - lastTickDeg) > seg / 2) {
      lastTickDeg = deg
      onTick()
    }

    if (t < 1) raf = requestAnimationFrame(frame)
    else onDone?.()
  }
  raf = requestAnimationFrame(frame)
  return () => { stopped = true; cancelAnimationFrame(raf) }
}

/* 慣性甩尾:由指針放開時嘅速度出發,按指數摩擦減速至停(唔派獎,純物理) */
export function inertialSpin({ startRot, velocity, n = 6, setRot, onTick, onDone }) {
  const FRICTION = 0.97  /* 每 16.7ms 幀保留嘅速度比例 */
  const STOP_V = 0.02    /* deg/ms,慢過即停 */
  const MAX_V = 8        /* deg/ms 上限,防手抖出離譜速度 */
  let v = Math.max(-MAX_V, Math.min(MAX_V, velocity))
  let rot = startRot
  let raf = 0
  let stopped = false
  let last = performance.now()
  const seg = 360 / n
  let lastTickIdx = Math.floor((((startRot % 360) + 360) % 360) / seg)

  const frame = (ts) => {
    if (stopped) return
    const dt = Math.min(50, ts - last)
    last = ts
    v *= Math.pow(FRICTION, dt / 16.67)
    rot += v * dt
    setRot(rot)
    const idx = Math.floor((((rot % 360) + 360) % 360) / seg)
    if (onTick && idx !== lastTickIdx) {
      lastTickIdx = idx
      onTick()
    }
    if (Math.abs(v) < STOP_V) { stopped = true; onDone?.(); return }
    raf = requestAnimationFrame(frame)
  }
  if (Math.abs(v) < STOP_V) { onDone?.(); return () => {} }
  raf = requestAnimationFrame(frame)
  return () => { stopped = true; cancelAnimationFrame(raf) }
}

/* 按真實權重抽一次,返回 index(全零權重 = 平均分) */
export function drawByWeight(weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return Math.floor(Math.random() * weights.length)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) return i
  }
  return weights.length - 1
}

/*
  甩尾抽獎:中獎結果先按真實權重抽好(flingTo 嘅 targetIdx),
  輪盤再按甩尾速度決定轉幾多圈,最終精確減速停喺中獎格內(指針 = 中獎格)。
  甩得越快 → 多轉幾圈 + 轉耐啲。
*/
export function flingTo({ startRot, velocity, targetIdx, slices, weights, setRot, onTick, onDone }) {
  const n = slices.length
  const seg = 360 / n

  const s = slices[targetIdx]
  const mid = (s.a0 + s.a1) / 2

  /* 格內落點 jitter:同 spinOne 一致,大獎傾向格中線 */
  const weightsArr = Array.isArray(weights) && weights.length === n ? weights : slices.map(() => 1)
  const totalW = weightsArr.reduce((a, b) => a + b, 0) || 1
  const wPct = (weightsArr[targetIdx] ?? 1) / totalW
  const evenPct = 1 / n
  const bias = Math.min(0.9, Math.max(0.25, evenPct / Math.max(wPct, 0.02)))
  const jitter = (Math.random() - 0.5) * seg * 0.72 * bias

  /* 甩尾速度 → 圈數(2~8 圈)+ 時長(3.2~5.6s) */
  const v0 = Math.abs(velocity)
  const turns = Math.max(2, Math.min(8, Math.round(v0 / 0.15)))
  const T = Math.max(3200, Math.min(5600, 2800 + v0 * 1600))

  /* 指針喺頂部(a=0):rot ≡ -mid + jitter (mod 360) */
  const landing = (((-mid + jitter) % 360) + 360) % 360
  const D = turns * 360 + (((landing - (startRot % 360)) % 360) + 360) % 360

  let t0 = null
  let lastTickDeg = 0
  let raf = 0
  let stopped = false
  const damping = 3.2

  const frame = (ts) => {
    if (stopped) return
    if (!t0) t0 = ts
    const t = Math.min(1, (ts - t0) / T)
    const ease = 1 - Math.pow(1 - t, damping)
    const deg = startRot + D * ease
    setRot(deg)
    if (onTick && Math.abs(deg - lastTickDeg) > seg / 2) {
      lastTickDeg = deg
      onTick()
    }
    if (t < 1) raf = requestAnimationFrame(frame)
    else onDone?.()
  }
  raf = requestAnimationFrame(frame)
  return () => { stopped = true; cancelAnimationFrame(raf) }
}
