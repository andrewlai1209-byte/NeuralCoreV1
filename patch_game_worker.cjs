const fs = require('fs');
let code = fs.readFileSync('src/components/GameArena.tsx', 'utf8');

const target = `    // Run engine in a brief timeout to let player move render and prevent frame blocks
    setTimeout(async () => {
      try {
        const engineInstance = new ChessEngine(config);
        // Pass search history to activate the Opening Book database
        const searchResult = await engineInstance.search(currentChess.fen(), 0.7, currentChess.history());
        
        if (searchResult.bestMove) {`;

const replace = `    // Run engine using Web Worker to completely prevent UI blocking
    const searchWorker = new Worker(new URL('../workers/search.worker.ts', import.meta.url));
    searchWorker.postMessage({
      fen: currentChess.fen(),
      config: config,
      trainingProgress: 0.7,
      history: currentChess.history()
    });

    searchWorker.onmessage = (e) => {
      const searchResult = e.data;
      searchWorker.terminate();
      try {
        if (searchResult.bestMove) {`;

code = code.replace(target, replace);
// Close the onmessage block and try-catch
code = code.replace(/        console.error\('Error calculating engine move:', e\);\n      \}\n    \}, 50\);/g, "        console.error('Error calculating engine move:', e);\n      }\n    };\n    searchWorker.onerror = (e) => {\n      console.error('Worker error:', e);\n      searchWorker.terminate();\n      setIsEngineThinking(false);\n    };");

fs.writeFileSync('src/components/GameArena.tsx', code);
