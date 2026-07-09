const fs = require('fs');
let code = fs.readFileSync('src/components/GameArena.tsx', 'utf8');

code = code.replace(/setTimeout\(\(\) => \{(\s+)try \{(\s+)const engineInstance = new ChessEngine\(config\);(\s+)const searchResult = engineInstance.search\(currentChess.fen\(\), 0.7, currentChess.history\(\)\);/g, "setTimeout(async () => {$1try {$2const engineInstance = new ChessEngine(config);$3const searchResult = await engineInstance.search(currentChess.fen(), 0.7, currentChess.history());");

fs.writeFileSync('src/components/GameArena.tsx', code);
