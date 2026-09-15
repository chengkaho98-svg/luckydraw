/* 抽獎輪盤動畫引擎 — 純函數,無 React 依賴 */

export function spinOne({ targetIdx, n, startRot, onDone, setRot, onTick }) {
  const T = 4200
  const turns = 5
  const seg = 360 / n

  /* 隨機喺目標扇形入面揀一個落點（避免次次都停喺同一個角度） */
  const jitter = (Math.random() - 0.5) * seg * 0.72
  const targetSliceMid = targetIdx * seg + seg / 2

  /* 指針喺頂部（-90°=270°）。倒轉諗:輪盤要轉幾多度先令 target 位於 270°? */
  const landingDeg = 270 - targetSliceMid + jitter
  const final = startRot + turns * 360 + (landingDeg - (startRot % 360))
  const delta = final - startRot

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
