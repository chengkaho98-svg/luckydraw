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
