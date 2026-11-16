import { useEffect } from 'react'

/* 設定彈窗：禮物清單、人數、機率、紀錄 — 平時隱藏，按齒輪先見 */
export default function SettingsPanel({
  open, onClose,
  giftText, setGiftText,
  players, setPlayers,
  shares, setShares,
  segments, setWeights,
  setStock,
  history,
}) {
  /* ESC 關閉 */
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>⚙️ 抽獎設定</h2>
          <button className="settings-close" onClick={onClose} aria-label="關閉設定">✕</button>
        </div>

        <div className="settings-body">
          {/* 禮物與人數 */}
          <section>
            <h3>🎁 禮物與人數</h3>
            <label className="field">
              <span>禮物清單（以逗號或換行分隔）</span>
              <textarea rows={4} value={giftText} onChange={(e) => setGiftText(e.target.value)} />
            </label>
            <div className="grid-2">
              <label className="field">
                <span>👥 參與人數</span>
                <input type="number" min={1} value={players} onChange={(e) => setPlayers(Math.max(1, +e.target.value || 1))} />
              </label>
              <label className="field">
                <span>🎁 每人中獎上限</span>
                <input type="number" min={1} max={10} value={shares} onChange={(e) => setShares(Math.min(10, Math.max(1, +e.target.value || 1)))} />
              </label>
            </div>
          </section>

          {/* 數量 — 抽中即扣減,數量耗盡自動移出輪盤 */}
          <section>
            <h3>📦 禮物數量 <small className="qty-note">（留空即無限）</small></h3>
            {segments.length === 0 && <p className="hint">請先添加禮物</p>}
            {segments.map((s) => (
              <div key={s.name} className="w-row qty-row">
                <span className="w-name">{s.name}</span>
                <input
                  type="number" min={0} step={1}
                  placeholder="∞"
                  value={s.remaining === Infinity ? '' : s.remaining}
                  onChange={(e) => setStock((st) => ({ ...st, [s.name]: e.target.value === '' ? '' : Math.max(0, Math.floor(+e.target.value || 0)) }))}
                />
                <b className="w-pct qty-left">{s.remaining === Infinity ? '∞' : `餘 ${s.remaining}`}</b>
              </div>
            ))}
            <p className="hint">💡 每次抽中即扣減一份；數量耗盡的獎品將自動移出輪盤，其餘獎品依原機率重新分配。</p>
          </section>

          {/* 機率（對外隱藏,僅於設定內顯示） */}
          <section>
            <h3>🎚 中獎機率</h3>
            {segments.length === 0 && <p className="hint">請先添加禮物</p>}
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

          {/* 中獎紀錄 */}
          <section>
            <h3>🏆 中獎記錄</h3>
            {history.length === 0
              ? <p className="empty-hint">尚無中獎記錄</p>
              : (
                <ol className="history-list">
                  {history.slice(0, 15).map((h, i) => (
                    <li key={i}><b>{h.name}</b><span className="hist-time">{h.at}</span></li>
                  ))}
                </ol>
              )}
          </section>
        </div>

        <p className="hint settings-note">💡 輪盤各格均等顯示，實際中獎機率依上方設定計算</p>
      </div>
    </div>
  )
}
