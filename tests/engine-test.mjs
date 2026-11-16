/* 引擎物理測試:stub rAF + performance,離線驗證 spinOne / inertialSpin */
import { spinOne, inertialSpin, flingTo, drawByWeight } from '../src/wheel-engine.js'

let now = 0
globalThis.performance = { now: () => now }
let rafQueue = []
globalThis.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length }
globalThis.cancelAnimationFrame = (id) => { if (id >= 1 && id <= rafQueue.length) rafQueue[id - 1] = null }

function pump(ms, step = 16.67) {
  const end = now + ms
  while (now < end) {
    now += step
    const q = rafQueue
    rafQueue = []
    for (const fn of q) if (fn) fn(now)
  }
}

/* 1. spinOne 基本:5 圈 + 落喺 -mid (mod 360) ± jitter */
{
  const n = 6, seg = 360 / n
  const slices = Array.from({ length: n }, (_, i) => ({ a0: i * seg, a1: (i + 1) * seg, mid: i * seg + seg / 2 }))
  let rot = 0
  const target = 3
  const cancel = spinOne({ targetIdx: target, slices, weights: [1, 1, 1, 1, 1, 1], startRot: 0, setRot: (d) => { rot = d }, onTick: () => {}, onDone: () => {} })
  pump(4500)
  const midNorm = ((slices[target].mid % 360) + 360) % 360
  const landed = ((rot % 360) + 360) % 360
  const distToTarget = Math.min(Math.abs(landed - ((360 - midNorm) % 360)), 360 - Math.abs(landed - ((360 - midNorm) % 360)))
  console.log(`spinOne: final=${rot.toFixed(0)}deg, landedAt=${landed.toFixed(1)}°, target=${((360 - midNorm) % 360).toFixed(1)}°, off=${distToTarget.toFixed(1)}° (jitter < 22° 正常)`)
  if (!(rot > 1700 && rot < 2400)) throw new Error('spinOne 圈數唔正常')
  if (distToTarget > 22) throw new Error('spinOne 落點偏差過大')
}

/* 2. spinOne cancel:中途攞走,rot 唔再變 */
{
  const n = 6, seg = 360 / n
  const slices = Array.from({ length: n }, (_, i) => ({ a0: i * seg, a1: (i + 1) * seg }))
  let rot = 0
  const cancel = spinOne({ targetIdx: 1, slices, weights: [1,1,1,1,1,1], startRot: 0, setRot: (d) => { rot = d }, onDone: () => {} })
  pump(1000)
  const mid1 = rot
  cancel()
  pump(3000)
  if (Math.abs(rot - mid1) > 0.01) throw new Error('cancel 後仲轉緊!')
  console.log(`spinOne cancel: OK (攞走後 ${mid1.toFixed(0)}° 唔郁)`)
}

/* 3. inertialSpin:快甩 > 慢甩,方向正確,最終停低 */
function fling(v0) {
  let rot = 0, stopped = false
  const cancel = inertialSpin({ startRot: 0, velocity: v0, n: 6, setRot: (d) => { rot = d }, onDone: () => { stopped = true } })
  pump(15000)
  const final = rot
  pump(1000) // 確認真係停咗
  const after = rot
  return { final, stopped, after, moved: Math.abs(final) }
}
const fast = fling(1.0)   /* 1 deg/ms */
const slow = fling(0.2)   /* 0.2 deg/ms */
const tiny = fling(0.01)  /* 慢過 STOP_V,即刻停 */
console.log(`fling 1.0deg/ms: 行咗 ${fast.moved.toFixed(0)}°, stopped=${fast.stopped}, 停後唔郁=${Math.abs(fast.after - fast.final) < 0.01}`)
console.log(`fling 0.2deg/ms: 行咗 ${slow.moved.toFixed(0)}°, stopped=${slow.stopped}`)
console.log(`fling 0.01deg/ms: 行咗 ${tiny.moved.toFixed(1)}°, stopped=${tiny.stopped}`)
if (fast.moved < slow.moved) throw new Error('快甩應該行得更遠')
if (!fast.stopped || !slow.stopped || !tiny.stopped) throw new Error('有甩尾冇停')
if (tiny.moved > 5) throw new Error('微甩應該幾乎唔郁')

/* 4. inertialSpin cancel */
{
  let rot = 0
  const cancel = inertialSpin({ startRot: 0, velocity: 2, n: 6, setRot: (d) => { rot = d }, onDone: () => {} })
  pump(500)
  const mid2 = rot
  cancel()
  pump(5000)
  if (Math.abs(rot - mid2) > 0.01) throw new Error('inertialSpin cancel 有問題')
  console.log(`inertialSpin cancel: OK`)
}

/* 5. flingTo:停低時指針一定要喺中獎格內(同 spinOne 同一落點公式) */
{
  const n = 6, seg = 360 / n
  const slices = Array.from({ length: n }, (_, i) => ({ a0: i * seg, a1: (i + 1) * seg, mid: i * seg + seg / 2 }))
  let ok = true
  for (let trial = 0; trial < 50; trial++) {
    const target = Math.floor(Math.random() * n)
    let rot = 0
    flingTo({ targetIdx: target, slices, weights: [1,1,1,1,1,1], startRot: 123, velocity: 0.4 + Math.random(), setRot: (d) => { rot = d }, onDone: () => {} })
    pump(6500)
    /* 指針下面嘅扇形 index = floor(((360 - rot) % 360) / seg) */
    const under = Math.floor((((360 - ((rot % 360) + 360) % 360)) % 360) / seg) % n
    if (under !== target) { ok = false; console.log(`  MISS trial=${trial} target=${target} under=${under} rot=${rot.toFixed(1)}`); break }
    if (rot < 123 + 2 * 360) { ok = false; console.log(`  flingTo 圈數太少 rot=${rot.toFixed(0)}`); break }
  }
  if (!ok) throw new Error('flingTo 有 trial 冇停喺中獎格內')
  console.log(`flingTo: 50 次試行全部停喺中獎格 ✓`)
}

/* 6. drawByWeight:權重分佈大致正確 + 全零權重唔會死 */
{
  const counts = new Array(6).fill(0)
  for (let i = 0; i < 6000; i++) counts[drawByWeight([1, 1, 1, 1, 1, 1])]++
  const even = counts.every((c) => c > 800 && c < 1200)
  /* 權重 [0,0,10,0,0,0] 應該 100% 抽中 idx 2 */
  const fixed = new Set()
  for (let i = 0; i < 200; i++) fixed.add(drawByWeight([0, 0, 10, 0, 0, 0]))
  const zeroSafe = drawByWeight([0, 0, 0]) >= 0 && drawByWeight([0, 0, 0]) < 3
  if (!even || fixed.size !== 1 || fixed.has(2) === false || !zeroSafe) throw new Error('drawByWeight 分佈唔啱')
  console.log(`drawByWeight: 均勻分佈 ✓, 純權重鎖定 ✓, 全零安全 ✓`)
}

console.log('ALL ENGINE TESTS PASSED ✓')
