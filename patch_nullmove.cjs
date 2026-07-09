const fs = require('fs');
let code = fs.readFileSync('src/chessEngine/search.ts', 'utf8');

const target = `    // Null Move Pruning
    if (allowNull && depth >= 3 && !board.inCheck(board.sideToMove)) {
       const fenTokens = []; // null move hack
       fenTokens[1] = fenTokens[1] === 'w' ? 'b' : 'w';
       fenTokens[3] = '-'; // remove en passant
       
       try {
           const tempBoard = new BitboardEngine(); tempBoard.parseFen(''); // TODO Fix null move logic properly
           const R = depth > 6 ? 3 : 2;
           const ev = this.alphaBeta(tempBoard, depth - 1 - R, alpha, beta, !isMaximizing, evalFunc, false).score;
           if (isMaximizing && ev >= beta) return { score: beta, move: null };
           if (!isMaximizing && ev <= alpha) return { score: alpha, move: null };
       } catch (e) {
           // ignore invalid FEN parsing issues for null move
       }
    }`;

const replace = `    // Null Move Pruning
    if (allowNull && depth >= 3 && !board.inCheck(board.sideToMove)) {
       board.sideToMove ^= 1;
       const oldEp = board.epSquare;
       board.epSquare = -1;
       
       const R = depth > 6 ? 3 : 2;
       const ev = this.alphaBeta(board, depth - 1 - R, alpha, beta, !isMaximizing, evalFunc, false).score;
       
       board.sideToMove ^= 1;
       board.epSquare = oldEp;
       
       if (isMaximizing && ev >= beta) return { score: beta, move: null };
       if (!isMaximizing && ev <= alpha) return { score: alpha, move: null };
    }`;

code = code.replace(target, replace);
fs.writeFileSync('src/chessEngine/search.ts', code);
