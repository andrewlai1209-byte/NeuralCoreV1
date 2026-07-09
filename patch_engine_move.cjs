const fs = require('fs');
let code = fs.readFileSync('src/engine.ts', 'utf8');

code = code.replace(/const san = typeof result.bestMove === 'string' \? result.bestMove : result.bestMove.san;/g, "const moveObj = result.bestMove;");
code = code.replace(/if \(san\) \{/g, "if (moveObj) {");
code = code.replace(/const parsedMove = tempChess.move\(san\);/g, "const parsedMove = tempChess.move(moveObj.san || moveObj);");

fs.writeFileSync('src/engine.ts', code);
