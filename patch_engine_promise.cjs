const fs = require('fs');
let code = fs.readFileSync('src/engine.ts', 'utf8');
code = code.replace(/public async search\(fen: string, trainingProgress: number = 0\.5, moveHistory\?: string\[\]\): \{/, "public async search(fen: string, trainingProgress: number = 0.5, moveHistory?: string[]): Promise<{");
code = code.replace(/policyMap\?: Record<string, number>;\n  \} \{/, "policyMap?: Record<string, number>;\n  }> {");
fs.writeFileSync('src/engine.ts', code);
