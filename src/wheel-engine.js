/* 抽獎輪盤動畫引擎 — 純函數,無 React 依賴 */

/*
  幾何約定(同 LuckyWheel.jsx 一致):
  - 扇形用「a-座標」畫:slice i 佔 [a0, a1),a0/a1 由累積 pct * 360 得出
  - a-座標 → 螢幕角度 = a - 90,即 a=0 正正係指針所在嘅頂部
  - 輪盤用 CSS rotate(rotdeg) 旋轉(順時針為正),想目標扇形中點停喺指針度:
      (mid - 90) + rot ≡ -90  (mod 360)   =>   rot ≡ -mid + jitter  (mod 360)
*/

export function spinOne({ targetIdx, slices, startRot, onDone, setRot, onTick }) {
  const T = 4200
  const turns = 5

  /* 目標扇形嘅真實幾何(累積 pct,唔係等分!) */
  const s = slices[targetIdx]
  const width = Math.max(0.0001, s.a1 - s.a0)
  const mid = (s.a0 + s.a1) / 2

  /* 隨機喺目標扇形入面揀落點(最多偏移 36% 扇形闊度,指針一定留喺扇形入面) */
  const jitter = (Math.random() - 0.5) * width * 0.72

  /* 指針喺頂部(a=0):rot ≡ -mid + jitter (mod 360) */
  const landing = (((-mid + jitter) % 360) + 360) % 360

  const final = startRot + turns * 360 + (((landing - (startRot % 360)) % 360) + 360) % 360
  const delta = final - startRot

  const seg = 360 / slices.length
  let t0 = null
  let lastTickDeg = 0
  const damping = 3.2 /* easeOutQuart-ish */

  const frame = (ts) => {
    if (!t0) t0 = ts
    const t = Math.min(1, (ts - t0) / T)
    const ease = 1 - Math.pow(1 - t, damping)
    const deg = startRot + delta * ease
    setRot(deg)

    if (onTick && Math.abs(deg - lastTickDeg) > seg / 2) {
      lastTickDeg = deg
      onTick()
    }

    if (t < 1) requestAnimationFrame(frame)
    else onDone?.()
  }
  requestAnimationFrame(frame)
}
