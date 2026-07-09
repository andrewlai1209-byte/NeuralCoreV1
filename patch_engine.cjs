const fs = require('fs');
let code = fs.readFileSync('src/engine.ts', 'utf8');
code = code.replace(/public evaluateNNUE\(chess: Chess\): number \{\n    return evaluateNNUE\(chess\);\n  \}/g, "public evaluateNNUE(chess: Chess): number {\n    const board = new BitboardEngine();\n    board.parseFen(chess.fen());\n    return evaluateNNUE(board);\n  }");
fs.writeFileSync('src/engine.ts', code);
