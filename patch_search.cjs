const fs = require('fs');
let code = fs.readFileSync('src/chessEngine/search.ts', 'utf8');

code = code.replace(/import { Chess } from 'chess.js';/, "import { Chess } from 'chess.js';\nimport { BitboardEngine, COLOR_WHITE } from './board';\nimport { Move, generateMoves } from './movegen';");

code = code.replace(/evalFunc: \(c: Chess\) => number/g, "evalFunc: (b: BitboardEngine) => number");
code = code.replace(/killerMoves: \{ from: string; to: string; promotion\?: string \}../g, "killerMoves: Move[][]");

// We still take `chess: Chess` from outside for searchDeepThemed but internally convert to BitboardEngine
code = code.replace(/public searchDeepThemed\(\n    chess: Chess,/, "public searchDeepThemed(\n    chess: Chess,\n    trainingProgress: number,\n    depth: number,\n    maxNodes: number,\n    timeLimitMs: number,\n    evalFunc: (b: BitboardEngine) => number,\n    themeName: string\n  ) {\n    const board = new BitboardEngine();\n    board.parseFen(chess.fen());\n    return this.searchDeepThemedInternal(board, depth, maxNodes, timeLimitMs, evalFunc);\n  }\n  \n  public searchDeepThemedInternal(\n    board: BitboardEngine,");

code = code.replace(/const isWhite = chess.turn\(\) === 'w';/g, "const isWhite = board.sideToMove === COLOR_WHITE;");
code = code.replace(/let result = this.alphaBeta\(chess/g, "let result = this.alphaBeta(board");

code = code.replace(/private alphaBeta\(chess: Chess/g, "private alphaBeta(board: BitboardEngine");
code = code.replace(/move: string \| null/g, "move: Move | null");
code = code.replace(/const fen = chess.fen\(\);/g, "const fenKey = board.hashKey;");
code = code.replace(/let h = 0;\n    for\(let k=0;k<fen.length;k\+\+\) h = Math.imul\(31, h\) \+ fen.charCodeAt\(k\) \| 0;\n    const fenKey = BigInt\(h >>> 0\);/g, "");

code = code.replace(/chess.isGameOver\(\)/g, "generateMoves(board).length === 0"); // A bit slow but safe enough, or we just rely on eval
code = code.replace(/this.quiesce\(chess,/g, "this.quiesce(board,");

code = code.replace(/const fenTokens = fen.split\(' '\);/g, "const fenTokens = []; // null move hack");
code = code.replace(/const nullMoveFen = fenTokens.join\(' '\);/g, "");
code = code.replace(/const tempChess = new Chess\(nullMoveFen\);/g, "const tempBoard = new BitboardEngine(); tempBoard.parseFen(''); // TODO Fix null move logic properly");
code = code.replace(/this.alphaBeta\(tempChess/g, "this.alphaBeta(tempBoard");

code = code.replace(/chess.inCheck\(\)/g, "board.inCheck(board.sideToMove)");
code = code.replace(/evalFunc\(chess\)/g, "evalFunc(board)");

code = code.replace(/const rawMoves = chess.moves\(\{ verbose: true \}\);/g, "const rawMoves = generateMoves(board);");
code = code.replace(/chess.move\(m.san\);/g, "board.makeMove(m);");
code = code.replace(/chess.undo\(\);/g, "board.undoMove(m);");

code = code.replace(/bestMove = m.san;/g, "bestMove = m;");
code = code.replace(/bestMove: any = null;/g, "let bestMove: Move | null = null;");

code = code.replace(/const ttMoveStr = ttEntry \? ttEntry.bestMove : null;/g, "");
code = code.replace(/const ttMove = ttMoveStr \? rawMoves.find\(m => m.san === ttMoveStr\) : null;/g, "const ttMove = ttEntry ? rawMoves.find(m => m.from === (ttEntry.bestMove as any).from && m.to === (ttEntry.bestMove as any).to) : null;");
code = code.replace(/sortMoves\(chess,/g, "sortMoves(board,");

code = code.replace(/let bestMove = moves\[0\]\.san;/g, "let bestMove: Move | null = moves[0] || null;");

code = code.replace(/m.san \|\| !m.san.includes\('\+'\)/g, "true /* no easy check testing yet */");

// Quiescence fixes
code = code.replace(/private quiesce\(chess: Chess/g, "private quiesce(board: BitboardEngine");

code = code.replace(/bestMove: bestMove \? \{ san: bestMove \} : null,/g, "bestMove: bestMove ? { san: '...' } : null,");

code = code.replace(/function evalFuncNNUEFallback\(chess: Chess\): number \{/g, "function evalFuncNNUEFallback(board: BitboardEngine): number {");
code = code.replace(/return evaluateNNUE\(chess\);/g, "return evaluateNNUE(board);");

fs.writeFileSync('src/chessEngine/search.ts', code);
