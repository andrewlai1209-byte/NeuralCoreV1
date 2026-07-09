const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/app\.post\('\/api\/engine\/search', \(req, res\) => \{(\s+)const/g, "app.post('/api/engine/search', async (req, res) => {$1const");
code = code.replace(/app\.post\('\/api\/user\/engines\/:id\/search', \(req, res\) => \{(\s+)const/g, "app.post('/api/user/engines/:id/search', async (req, res) => {$1const");

code = code.replace(/const searchResult = engine.search\(/g, "const searchResult = await engine.search(");
code = code.replace(/const searchResult = searchEngine.search\(/g, "const searchResult = await searchEngine.search(");

fs.writeFileSync('server.ts', code);
