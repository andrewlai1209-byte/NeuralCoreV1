const fs = require('fs');
let code = fs.readFileSync('src/components/GameArena.tsx', 'utf8');

code = code.replace(/const result = engine.search\(copy.fen\(\), trainingProgress, history\);/g, "const result = await engine.search(copy.fen(), trainingProgress, history);");
code = code.replace(/const result = engine.search\(fen, trainingProgress\);/g, "const result = await engine.search(fen, trainingProgress);");

// Need to make sure the containing function is async!
// If it is inside setTimeout, we can make the callback async.
code = code.replace(/setTimeout\(\(\) => \{(\s+)const engine = new ChessEngine\(config\);(\s+)const result = await engine/g, "setTimeout(async () => {$1const engine = new ChessEngine(config);$2const result = await engine");

fs.writeFileSync('src/components/GameArena.tsx', code);

code = fs.readFileSync('src/components/LiveAnalysis.tsx', 'utf8');
code = code.replace(/const result = engine.search\(fen, 0.5\);/g, "const result = await engine.search(fen, 0.5);");
code = code.replace(/useEffect\(\(\) => \{(\s+)if \(!fen\) return;(\s+)const engine = new ChessEngine/g, "useEffect(() => {$1if (!fen) return;$2const analyze = async () => {\n      const engine = new ChessEngine");
// Need to close the async function
code = code.replace(/setLastResult\(result\);(\s+)\}, \[fen, config\]\);/g, "setLastResult(result);\n    };\n    analyze();$1}, [fen, config]);");

fs.writeFileSync('src/components/LiveAnalysis.tsx', code);
