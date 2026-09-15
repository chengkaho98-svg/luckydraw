# 🎡 Lucky Spin — 3D 輪盤抽獎

用 React + Vite 寫嘅互動輪盤抽獎小程式。介面繽紛，自帶 3D 傾斜輪盤、彩帶特效同中獎公布 modal。

## 快速開始

```bash
npm install
npm run dev      # 開發模式，預設 http://localhost:5173
npm run build    # 生產打包（輸出到 dist/）
npm run preview  # 本地預覽生產包
```

## 玩法

1. **禮物設定** — 輸入禮物名（用逗號或每行一個），設定每份禮物嘅數量。
2. **機率分配** — 右邊面板有滑桿 + 數字欄，可以逐份禮物調整相對機率；「🎲 平均分配」一鍵重設為平均，俯視圖即時顯示每格實際佔比同角度。
3. **抽獎** — 撳「🎯 開始抽獎」，輪盤會加速再減速，指針停嗰格就係中獎禮物；禮物送晒會自動由輪盤剔除。
4. **公布** — 中獎後彈出彩色 modal，連彩帶特效；紀錄簿會列出每次中獎時間、禮物同剩餘份數。

## 特性

| 功能 | 說明 |
| --- | --- |
| 每份獨立機率 | 以權重計算，同格內多份同禮物會合併成同一扇形 |
| 彩虹扇形配色 | HSL 色環均勻取色，指針係金色指針同暗黑輪轂 |
| 事件時序 | 抽獎 → 快轉（每格叮一聲）→ 減速 → 最後一格 special 音效 → 公布 |
| Web Audio 音效 | 純前端合成，毋需任何音檔；可以靜音 |
| 拖拽 3D 傾斜 | 拖曳輪盤可以改變傾斜角度，模擬立體透視；有重置掣 |
| 撤銷 | 最新一筆中獎可以回復 |
| 鍵盤操作 | 空白鍵抽獎、`m` 靜音、`Esc` 關閉彈窗（輸入框聚焦時忽略） |

## 技術棧

- **React 18** + Vite 5
- 純 CSS（`index.css`），無額外 UI 庫
- SVG 輪盤（以圓弧扇形片計算幾何）、CSS `preserve-3d` 做傾斜
- Web Audio API 做音效；Canvas confetti 彩帶

## 檔案結構

```
luckydraw/
├── index.html         # Vite 入口 HTML
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx       # app 進入點
│   ├── App.jsx        # 主頁面: 禮物設定 + 機率滑桿 + 抽獎按鈕
│   ├── LuckyWheel.jsx # SVG 輪盤幾何 + 旋轉
│   ├── wheel-engine.js# 動畫 easing + 落點計算
│   ├── sfx.js         # Web Audio 叮叮聲同 fanfare
│   ├── Confetti.jsx   # canvas 彩帶特效
│   ├── WinnerModal.jsx# 中獎彈窗
│   └── index.css      # 3D 繽紛主題樣式
└── README.md
```

## 小 crippled notes

- 輪盤以「權重總額分格」渲染：禮物 i 嘅角度 = `weight_i / totalWeight * 360°`。
- 抽獎結果由 JS 權重隨機決定，動畫只係將輪盤轉到預選格 —— 保證同顯示機率一致。
- 若禮物數量全部歸零，抽獎掣會禁用，並提示加返啲禮物。
