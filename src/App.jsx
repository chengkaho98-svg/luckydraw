import { useState, useCallback, useMemo, useRef } from 'react'
import LuckyWheel from './LuckyWheel.jsx'
import WinnerModal from './WinnerModal.jsx'
import Confetti from './Confetti.jsx'
import './index.css'

const SEG_COLORS = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#FF7B54', '#00C2A8', '#D64D9A']

export default function App() {
  /* ---------- 禮物設定 ---------- */
  const [giftText, setGiftText] = useState('iPhone 17,玩具車,頭獎,圖書券,現金,神秘禮盒')
  const [players, setPlayers] = useState(30)
  const [shares, setShares] = useState(3)
  const giftList = useMemo(
    () => giftText.split(/[\n,，、]+/).map((s) => s.trim()).filter(Boolean),
    [giftText],
  )

  /* ---------- 權重 ---------- */
  const [weights, setWeights] = useState({})
  const weightOf = (n) => weights[n] ?? 1
  const segments = useMemo(() => {
    const usable = giftList.filter((g) => weightOf(g) > 0)
    const t = usable.reduce((s, g) => s + weightOf(g), 0)
    return usable.map((g) => ({
      name: g,
      weight: weightOf(g),
      pct: t > 0 ? weightOf(g) / t : 0,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftList, weights])

  /* ---------- 抽獎 ---------- */
  const [spinning, setSpinning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [winner, setWinner] = useState(null) // { name, pct }
  const [history, setHistory] = useState([])
  const wheelSpinRef = useRef(null)

  const spin = useCallback(() => {
    if (spinning || segments.length === 0) return
    // 先抽 result，再叫輪盤轉去對應格
    let r = Math.random() * segments.reduce((s, x) => s + x.weight, 0)
    let idx = 0
    for (let i = 0; i < segments.length; i++) { r -= segments[i].weight; if (r < 0) { idx = i; break } }
    setSpinning(true)
    wheelSpinRef.current?.spinTo(idx)
  }, [spinning, segments])

  const onLanded = useCallback((idx) => {
    setSpinning(false)
    const seg = segments[idx]
    if (seg) {
      setWinner({ ...seg, at: Date.now() })
      setHistory((h) => [
        { name: seg.name, at: new Date().toLocaleTimeString('zh-HK') },
        ...h,
      ])
    }
  }, [segments])

  /* ---------- 畫面 ---------- */
  return (
    <div className="stage">
      <div className="bg-blobs" aria-hidden>
        <span /><span /><span />
      </div>
      <header className="hero">
        <h1>🎡 Lucky Spin</h1>
        <p>設定禮物同機率，撳掣一齊迴轉抽大獎！</p>
      </header>

      <main className="layout">
        <section className="card config-card">
          <h2>⚙️ 禮物與人數</h2>
          <label className="field">
            <span>🎁 禮物清單</span>
            <textarea rows={5} value={giftText} onChange={(e) => setGiftText(e.target.value)} />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>👥 在場人數</span>
              <input type="number" min={1} value={players} onChange={(e) => setPlayers(Math.max(1, +e.target.value || 1))} />
            </label>
            <label className="field">
              <span>🎁 每人可中上限</span>
              <input type="number" min={1} max={10} value={shares} onChange={(e) => setShares(Math.min(10, Math.max(1, +e.target.value || 1)))} />
            </label>
          </div>

          <h2>🎚 機率</h2>
          {segments.length === 0 && <p className="hint">加返啲禮物先～</p>}
          {segments.map((s) => (
            <div key={s.name} className="w-row">
              <span className="w-name">{s.name}</span>
              <input
                type="range" min={0} max={10} step={0.5}
                value={s.weight}
                onChange={(e) => setWeights((w) => ({ ...w, [s.name]: +e.target.value }))}
              />
              <b className="w-pct">{(s.pct * 100).toFixed(1)}%</b>
            </div>
          ))}
          <button className="ghost-btn" onClick={() => setWeights({})}>🎲 一鍵平均</button>
        </section>

        <section className="card wheel-card">
          <LuckyWheel
            ref={wheelSpinRef}
            segments={segments}
            muted={muted}
            onLanded={onLanded}
          />
          <div className="actions">
            <button className="spin-btn" disabled={spinning || segments.length < 2} onClick={spin}>
              {spinning ? '🌀 轉緊…' : '🎯 開始抽獎'}
            </button>
            <button className="ghost-btn" onClick={() => setMuted((m) => !m)}>
              {muted ? '🔇 靜音' : '🔊 音效'}
            </button>
          </div>
        </section>
      </main>

      <WinnerModal
        open={!!winner}
        name={winner?.name}
        pct={winner?.pct != null ? (winner.pct * 100).toFixed(1) : null}
        onClose={() => setWinner(null)}
      />
      {winner && <Confetti seed={winner.at} />}
    </div>
  )
}
