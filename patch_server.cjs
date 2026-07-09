const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `// Syzygy Endgame Tablebase Lookup
app.get("/api/syzygy", async (req, res) => {
  const { fen } = req.query;
  if (!fen) return res.status(400).json({ error: "Missing FEN" });
  
  // Simulated lookup logic for 3-4 piece endgames
  const fenStr = decodeURIComponent(fen as string);
  const pieceCount = fenStr.split(' ')[0].replace(/[\/1-8]/g, '').length;
  
  if (pieceCount <= 4) {
    return res.json({ 
      tablebase_score: "draw", // Placeholder score
      best_move: null
    });
  }
  
  return res.json({ error: "No tablebase hit" });
});`;

const replace = `// Syzygy Endgame Tablebase Lookup
app.get("/api/syzygy", async (req, res) => {
  const { fen } = req.query;
  if (!fen) return res.status(400).json({ error: "Missing FEN" });
  
  try {
    const fenStr = decodeURIComponent(fen as string);
    const pieceCount = fenStr.split(' ')[0].replace(/[\\/1-8]/g, '').length;
    
    // Lichess Syzygy API supports up to 7 pieces.
    if (pieceCount <= 7) {
      const fetch = (await import('node-fetch')).default || globalThis.fetch;
      const response = await fetch(\`https://tablebase.lichess.ovh/standard?fen=\${encodeURIComponent(fenStr)}\`);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Tablebase API failed" });
      }
      const data = await response.json();
      return res.json(data);
    } else {
      return res.status(400).json({ error: "Too many pieces for tablebase" });
    }
  } catch (err) {
    console.error("Syzygy error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});`;

code = code.replace(target, replace);
fs.writeFileSync('server.ts', code);
