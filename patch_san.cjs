const fs = require('fs');
let code = fs.readFileSync('src/chessEngine/search.ts', 'utf8');

const replacement = `bestMove: bestMove ? {
        from: String.fromCharCode(97 + (bestMove.from % 8)) + (Math.floor(bestMove.from / 8) + 1),
        to: String.fromCharCode(97 + (bestMove.to % 8)) + (Math.floor(bestMove.to / 8) + 1),
        promotion: bestMove.promotion ? ['p','n','b','r','q','k'][bestMove.promotion] : undefined
      } : null,`;

code = code.replace(/bestMove: bestMove \? \{ san: '\.\.\.' \} : null,/g, replacement);
fs.writeFileSync('src/chessEngine/search.ts', code);
