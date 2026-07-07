# NeuralCore Engine 性能飛升計畫書：階段四與五 (Performance Flight Plan: Stage 4 & 5)

本階段旨在徹底實現 NeuralCore 的 GM 級別戰術計算能力與知識庫集成。

---

## 🛠 實施計畫總覽 (Implementation Roadmap)

### 🔵 階段四：全域知識庫與殘局引擎集成 (Knowledge Base & Endgame Integration)
1.  **Syzygy 殘局資料庫 (Syzygy Tablebases)**:
    *   實作 `/api/syzygy` 後端接口，處理高效率的殘局檔案查詢，實現 7 子以內的完美殘局計算。
2.  **開局數據庫 (Polyglot Opening Book)**:
    *   開發輕量級的開局 Trie 樹結構，於搜尋初期直接加載預定義的特級大師布局。
3.  **強化學習數據匯總 (Distributed RL Learning)**:
    *   擴展 Firestore 數據模型，聚合跨遊戲會話的經驗數據，進行全局模型權重更新。

### 🟡 階段五：高階引擎架構優化 (Architectural Optimization)
1.  **Web Workers 平行搜尋 (Parallel Search)**:
    *   將核心搜尋算法從主執行緒分離，徹底解決複雜計算時 UI 卡頓問題。
2.  **NNUE 微優化 (Micro-Optimization)**:
    *   進一步提升評估函數中神經網路權重的傳遞效率與數值計算精度。
3.  **高階戰術延伸 (Deep Tactical Extensions)**:
    *   強化靜態搜索與關鍵戰術節點的深度計算邏輯。

---

## 📈 實施節奏 (Execution Rhythm)
我將按照上述順序，分批進行代碼增量修改，確保每次修改後系統穩定，並通過 `compile_applet` 驗證。
