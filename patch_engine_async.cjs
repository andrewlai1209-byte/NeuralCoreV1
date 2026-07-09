const fs = require('fs');
let code = fs.readFileSync('src/engine.ts', 'utf8');

code = code.replace(/public search\(/, "public async search(");

// Add syzygy check right after opening book check
const syzygyBlock = `    // 2. Syzygy Tablebase Integration (7-piece or fewer)
    const pieceCount = fen.split(' ')[0].replace(/[\\/1-8]/g, '').length;
    if (pieceCount <= 7) {
      try {
        const res = await fetch(\`/api/syzygy?fen=\${encodeURIComponent(fen)}\`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.moves && data.moves.length > 0) {
            // Pick best move from tablebase (first move is usually optimal in Lichess API)
            const tbMove = data.moves[0].uci;
            const tempChess = new Chess(fen);
            const parsedMove = tempChess.move(tbMove, { sloppy: true });
            if (parsedMove) {
              return {
                bestMove: {
                  san: parsedMove.san,
                  from: parsedMove.from,
                  to: parsedMove.to,
                  piece: parsedMove.piece,
                  color: parsedMove.color,
                  promotion: parsedMove.promotion || undefined,
                  lan: tbMove
                },
                score: data.category === 'win' ? 20000 : (data.category === 'loss' ? -20000 : 0),
                depth: data.dtz || 0,
                nodes: 1,
                nps: 1,
                pv: [parsedMove.san],
                bookOpeningName: "Syzygy Endgame Tablebase"
              };
            }
          }
        }
      } catch (err) {
        console.error("Syzygy lookup failed, falling back to search", err);
      }
    }

`;

// Insert it right after the bookMove block
code = code.replace(/    if \(bookMove\) \{\n      return \{\n        bestMove: bookMove.nextBookMove,\n        score: 0,\n        depth: 0,\n        nodes: 1,\n        nps: 1,\n        pv: \[bookMove.nextBookMove\],\n        bookOpeningName: bookMove.nameZh\n      \};\n    \}\n/g, "    if (bookMove) {\n      return {\n        bestMove: bookMove.nextBookMove,\n        score: 0,\n        depth: 0,\n        nodes: 1,\n        nps: 1,\n        pv: [bookMove.nextBookMove],\n        bookOpeningName: bookMove.nameZh\n      };\n    }\n" + syzygyBlock);

fs.writeFileSync('src/engine.ts', code);
