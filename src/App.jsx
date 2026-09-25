import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import LuckyWheel from './LuckyWheel.jsx'
import WinnerModal from './WinnerModal.jsx'
import Confetti from './Confetti.jsx'
import SettingsPanel from './SettingsPanel.jsx'
import './index.css'

export default function App() {
  /* ---------- 禮物設定 ---------- */
  const [giftText, setGiftText] = useState('iPhone 17,玩具車,頭獎,圖書券,現金,神秘禮盒')
  const [players, setPlayers] = useState(30)
  const [shares, setShares] = useState(3)

  /* ---------- 數量(庫存):未填 = 無限 ---------- */
  const [stock, setStock] = useState({}) // { 名: 數量 }
  const stockOf = (n) => {
    const v = stock[n]
    return (v == null || v === '' || isNaN(v)) ? Infinity : Math.max(0, Math.floor(v))
  }

  const [weights, setWeights] = useState({})
  const weightOf = (n) => weights[n] ?? 1

  const giftList = useMemo(
    () => giftText.split(/[\n,，、]+/).map((s) => s.trim()).filter(Boolean),
    [giftText],
  )

  /* ---------- 抽獎輪盤:有存貨先上去 ----------
     剩 0 份嘅禮物會自動踢出輪盤,機率按返剩低嗰啲重新分配;
     個別機率(weight slider)照用,除非全線清零。 */
  const segments = useMemo(() => {
    const usable = giftList.filter((g) => stockOf(g) > 0)
    const t = usable.reduce((s, g) => s + weightOf(g), 0)
    if (t === 0) return usable.map((g) => ({ name: g, weight: 1, pct: 1 / usable.length }))
    return usable.map((g) => ({
      name: g,
      weight: weightOf(g),
      pct: weightOf(g) / t,
      remaining: stockOf(g),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftList, weights, stock])

  /* ---------- 抽獎 ---------- */
  const [spinning, setSpinning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [winner, setWinner] = useState(null) // { name, ... }
  const [history, setHistory] = useState([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const wheelSpinRef = useRef(null)

  const spin = useCallback(() => {
    if (spinning || segments.length === 0) return
    // 先抽 result,再叫輪盤轉去對應格(輪盤畫面均分,落點按真實機率)
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
      // 扣庫存:有數量先扣,扣到 0 輪盤會自動少一格 + 機率重計
      setStock((st) => {
        const cur = st[seg.name]
        if (cur == null || cur === '' || isNaN(cur)) return st // 無限數量唔扣
        return { ...st, [seg.name]: Math.max(0, Math.floor(cur) - 1) }
      })
      setWinner({ ...seg, at: Date.now() })
      setHistory((h) => [
        { name: seg.name, at: new Date().toLocaleTimeString('zh-HK') },
        ...h,
      ])
    }
  }, [segments])

  const noStockLeft = segments.length === 0

  /* 禮物清單一改,過期嘅庫存記錄無效,但保留返相關名稱避免重設 */
  useEffect(() => { /* 保持 stock 同 giftText 同步由用家自行處理 */ }, [giftText])

  /* ---------- 畫面:全屏輪盤為主,設定收埋入齒輪 ---------- */
  return (
    <div className="stage fullscreen-mode">
      <div className="bg-blobs" aria-hidden>
        <span /><span /><span />
      </div>

      <LuckyWheel
        ref={wheelSpinRef}
        segments={segments}
        muted={muted}
        onLanded={onLanded}
      />

      <div className="actions floating-actions">
        <button
          className="spin-btn"
          disabled={spinning || noStockLeft}
          onClick={spin}
        >
          {spinning ? '旋轉中…' : noStockLeft ? '禮物已全部送出' : '開 始 抽 獎'}
        </button>
        <button className="ghost-btn sound-btn" onClick={() => setMuted((m) => !m)}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* 右下角齒輪設定 icon */}
      <button
        className="gear-btn"
        onClick={() => setSettingsOpen(true)}
        title="抽獎設定"
        aria-label="開啟抽獎設定"
      >
        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden>
          <path d="M19.14 12.94a7.07 7.07 0 0 0 .05-.94 7.07 7.07 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.65 8.83a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.62-.05.94 0 .32.02.63.05.94L2.77 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.33.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l-.36-2.54a6.9 6.9 0 0 0 1.62-.94l2.39.96c.24.1.47 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
        </svg>
      </button>

      {/* 設定彈窗 */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        giftText={giftText}
        setGiftText={setGiftText}
        players={players}
        setPlayers={setPlayers}
        shares={shares}
        setShares={setShares}
        segments={segments}
        setWeights={setWeights}
        setStock={setStock}
        history={history}
      />

      <WinnerModal
        open={!!winner}
        name={winner?.name}
        onClose={() => setWinner(null)}
      />
      {winner && <Confetti seed={winner.at} />}
    </div>
  )
}
