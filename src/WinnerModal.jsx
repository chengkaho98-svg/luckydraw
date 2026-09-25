import { useEffect } from 'react'

export default function WinnerModal({ open, name, onClose }) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => onClose?.(), 4800)
    return () => clearTimeout(t)
  }, [open, onClose, name])

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={() => onClose?.()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-emote">🏆</div>
        <h2>恭 喜 中 獎</h2>
        <div className="modal-prize">{name}</div>
        <button className="modal-close" onClick={() => onClose?.()}>關閉</button>
      </div>
    </div>
  )
}
