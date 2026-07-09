const fs = require('fs');
let code = fs.readFileSync('src/workers/search.worker.ts', 'utf8');

code = code.replace(/const result = engine\.search\(fen, trainingProgress\);/g, "const result = await engine.search(fen, trainingProgress);");

fs.writeFileSync('src/workers/search.worker.ts', code);
