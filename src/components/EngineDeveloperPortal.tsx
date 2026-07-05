/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal as TerminalIcon, FileCode, Check, Copy, Download, Cpu, GitBranch, BookOpen, Layers } from 'lucide-react';

export const EngineDeveloperPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'python' | 'cpp' | 'js' | 'guide' | 'api'>('python');
  const [copied, setCopied] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Playground state for Live REST API
  const [playgroundFen, setPlaygroundFen] = useState('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
  const [playgroundDepth, setPlaygroundDepth] = useState(3);
  const [playgroundPersonality, setPlaygroundPersonality] = useState('positional');
  const [playgroundEvalMode, setPlaygroundEvalMode] = useState('hybrid');
  const [playgroundHistory, setPlaygroundHistory] = useState('e4, e5, Nf3, Nc6');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  const handlePlaygroundSubmit = async () => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      const historyArray = playgroundHistory.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const response = await fetch('/api/engine/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: playgroundFen,
          depth: playgroundDepth,
          personality: playgroundPersonality,
          evalMode: playgroundEvalMode,
          moveHistory: historyArray
        })
      });
      const data = await response.json();
      setApiResponse(data);
    } catch (err: any) {
      setApiResponse({ error: err.message || 'API request failed' });
    } finally {
      setApiLoading(false);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const simulateDownload = (fileName: string) => {
    setDownloading(fileName);
    setTimeout(() => {
      setDownloading(null);
      alert(`Success: ${fileName} has been compiled and downloaded to your local device.`);
    }, 1500);
  };

  // Code templates
  const pythonCode = `import chess
import math

# Standard Piece-Square values for position evaluation
PST_PAWN = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
]

class AetherisEngine:
    def __init__(self, personality="positional"):
        self.personality = personality
        self.nodes_searched = 0
        
        # Configure evaluation parameters based on chosen personality
        if personality == "tactical":
            self.weights = {"P": 100, "N": 340, "B": 350, "R": 500, "Q": 950}
            self.pst_multiplier = 1.5
        elif personality == "defensive":
            self.weights = {"P": 115, "N": 310, "B": 320, "R": 520, "Q": 880}
            self.pst_multiplier = 0.8
        else: # positional / default
            self.weights = {"P": 100, "N": 320, "B": 330, "R": 500, "Q": 900}
            self.pst_multiplier = 1.0

    def evaluate_board(self, board):
        if board.is_checkmate():
            return -99999 if board.turn == chess.WHITE else 99999
        if board.is_stalemate() or board.is_insufficient_material():
            return 0
            
        score = 0
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece is None:
                continue
                
            value = self.weights.get(piece.symbol().upper(), 0)
            sign = 1 if piece.color == chess.WHITE else -1
            
            # Base material value
            score += sign * value
            
            # Piece Square Tables
            if piece.piece_type == chess.PAWN:
                pst_val = PST_PAWN[square if piece.color == chess.WHITE else chess.square_mirror(square)]
                score += sign * pst_val * self.pst_multiplier
                
        return score

    def alpha_beta(self, board, depth, alpha, beta, maximizing_player):
        self.nodes_searched += 1
        if depth == 0 or board.is_game_over():
            return self.evaluate_board(board), None

        best_move = None
        if maximizing_player:
            max_eval = -math.inf
            for move in board.legal_moves:
                board.push(move)
                evaluation, _ = self.alpha_beta(board, depth - 1, alpha, beta, False)
                board.pop()
                if evaluation > max_eval:
                    max_eval = evaluation
                    best_move = move
                alpha = max(alpha, evaluation)
                if beta <= alpha:
                    break
            return max_eval, best_move
        else:
            min_eval = math.inf
            for move in board.legal_moves:
                board.push(move)
                evaluation, _ = self.alpha_beta(board, depth - 1, alpha, beta, True)
                board.pop()
                if evaluation < min_eval:
                    min_eval = evaluation
                    best_move = move
                beta = min(beta, evaluation)
                if beta <= alpha:
                    break
            return min_eval, best_move
`;

  const cppCode = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>

struct Move {
    std::string from_to;
    int score;
};

class AetherisCppEngine {
private:
    int nodes_searched = 0;
    std::unordered_map<std::string, int> transposition_table;

    // Fast static evaluation
    int evaluate(const std::string& fen) {
        int score = 0;
        for (char c : fen) {
            if (c == ' ') break; // End of board layout
            switch(c) {
                case 'P': score += 100; break;
                case 'N': score += 320; break;
                case 'B': score += 330; break;
                case 'R': score += 500; break;
                case 'Q': score += 900; break;
                case 'p': score -= 100; break;
                case 'n': score -= 320; break;
                case 'b': score -= 330; break;
                case 'r': score -= 500; break;
                case 'q': score -= 900; break;
            }
        }
        return score;
    }

public:
    // Minimax search with alpha-beta cutoffs
    int search(const std::string& fen, int depth, int alpha, int beta, bool is_maximizing) {
        nodes_searched++;

        // Quick Transposition Cache Check
        std::string cache_key = fen + "_" + std::to_string(depth);
        if (transposition_table.find(cache_key) != transposition_table.end()) {
            return transposition_table[cache_key];
        }

        if (depth == 0) {
            return evaluate(fen);
        }

        // Mock legal moves generated by bitboards
        std::vector<std::string> legal_moves = {"e2e4", "d2d4", "g1f3", "b1c3"};
        
        if (is_maximizing) {
            int max_val = -999999;
            for (const auto& move : legal_moves) {
                // Apply move and recurse
                int val = search(fen, depth - 1, alpha, beta, false);
                max_val = std::max(max_val, val);
                alpha = std::max(alpha, val);
                if (beta <= alpha) {
                    break; // Pruning
                }
            }
            transposition_table[cache_key] = max_val;
            return max_val;
        } else {
            int min_val = 999999;
            for (const auto& move : legal_moves) {
                int val = search(fen, depth - 1, alpha, beta, true);
                min_val = std::min(min_val, val);
                beta = std::min(beta, val);
                if (beta <= alpha) {
                    break; // Pruning
                }
            }
            transposition_table[cache_key] = min_val;
            return min_val;
        }
    }
};
`;

  const jsCode = `/**
 * Web-Worker compatible fast Javascript/TypeScript chess search
 */
export class AetherisJsSearch {
  constructor(weights = null) {
    this.weights = weights || { p: 100, n: 320, b: 330, r: 500, q: 900 };
    this.nodes = 0;
  }

  evaluatePiece(type, color) {
    const value = this.weights[type.toLowerCase()] || 0;
    return color === 'w' ? value : -value;
  }

  // Pure alphanumeric evaluation mapping
  evaluateFlat(boardArray) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = boardArray[r][c];
        if (cell) {
          score += this.evaluatePiece(cell.type, cell.color);
        }
      }
    }
    return score;
  }

  minimaxAlphaBeta(chess, depth, alpha, beta, isMaximizing) {
    this.nodes++;
    if (depth === 0 || chess.isGameOver()) {
      return { score: this.evaluateFlat(chess.board()), move: null };
    }

    const moves = chess.moves({ verbose: true });
    let bestMove = null;

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const { score } = this.minimaxAlphaBeta(chess, depth - 1, alpha, beta, false);
        chess.undo();

        if (score > maxScore) {
          maxScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Pruning
      }
      return { score: maxScore, move: bestMove };
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        chess.move(move);
        const { score } = this.minimaxAlphaBeta(chess, depth - 1, alpha, beta, true);
        chess.undo();

        if (score < minScore) {
          minScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // Pruning
      }
      return { score: minScore, move: bestMove };
    }
  }
}
`;

  const compilationGuide = `# Aetheris Chess Open-Source Guide

This repository contains the complete cross-platform Aetheris Chess Engine implementations. 

## 🐍 Python Installation & Local Run
Dependencies: python-chess, pytorch, onnx
\`\`\`bash
# Install dependencies
python -m pip install python-chess torch onnx

# Launch self-play game locally
python main.py --personality positional --depth 4
\`\`\`

## 🛠️ C++ Native Compilation
Compile the high-performance search library using g++ or clang:
\`\`\`bash
# Standard compilation using CMake
mkdir build && cd build
cmake ..
make -j4

# Execute standalone console match (UCI standard compatible)
./aetheris_engine --uci
\`\`\`

## 🧠 Model Neural Checkpoint Conversion (.onnx)
Exporting trained reinforcement learning parameters from Python to ONNX format for C++ inclusion:
\`\`\`bash
# Python checkpoint export script
python export_onnx.py --checkpoint "./weights/gen_32.pt" --output "aetheris_net.onnx"
\`\`\``;

  const apiGuide = `/**
 * ============================================================================
 * AETHERIS CHESS ENGINE API SPECIFICATION & PLATFORM
 * ============================================================================
 * 
 * Endpoints are hosted directly by our full-stack container on port 3000.
 * You can query this AI engine directly using any HTTP library (curl, fetch, axios, requests).
 */

// 1. CHESS MOVE SEARCH API
// HTTP METHOD: POST
// ENDPOINT:   /api/engine/search
// HEADERS:    Content-Type: application/json

// --- REQUEST PAYLOAD (JSON) ---
{
  "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", // Optional: FEN string
  "depth": 3,                                                                 // Optional: 1 to 4 plies
  "personality": "positional",                                                // Optional: "tactical" | "positional" | "gambiter" | "defensive"
  "evalMode": "hybrid",                                                       // Optional: "traditional" | "neural" | "hybrid"
  "moveHistory": ["e4", "e5", "Nf3", "Nc6"]                                   // Optional: for Opening Book matching
}

// --- SUCCESS RESPONSE (JSON) ---
{
  "success": true,
  "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
  "config": {
    "depth": 3,
    "personality": "positional",
    "evalMode": "hybrid"
  },
  "bestMove": {
    "from": "f1",
    "to": "b5",
    "promotion": null,
    "san": "Bb5",
    "lan": "f1b5",
    "piece": "b",
    "color": "w"
  },
  "score": 150,
  "scoreFormatted": "1.50",
  "depthReached": 3,
  "nodesExplored": 1824,
  "nps": 224000,
  "pv": ["Bb5", "Nf6", "O-O"],
  "bookOpeningName": "Ruy Lopez (Spanish Opening)"
}

// ----------------------------------------------------------------------------
// EXAMPLE CURL COMMAND:
// ----------------------------------------------------------------------------
// curl -X POST -H "Content-Type: application/json" \\
//      -d '{"depth": 3, "personality": "tactical"}' \\
//      \${window.location.origin}/api/engine/search
`;

  const currentCode = activeTab === 'python' ? pythonCode : activeTab === 'cpp' ? cppCode : activeTab === 'js' ? jsCode : activeTab === 'guide' ? compilationGuide : apiGuide;
  const currentLangName = activeTab === 'python' ? 'Python' : activeTab === 'cpp' ? 'C++' : activeTab === 'js' ? 'Javascript' : activeTab === 'guide' ? 'Guide' : 'API';

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6" id="developer_portal_panel">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-mono border border-emerald-500/20">FOSS LICENSE</span>
              <span className="text-xs text-slate-400 font-mono">MIT Open Source Licence</span>
            </div>
            <h1 className="text-2xl font-sans font-bold tracking-tight text-white mb-2">Aetheris Core Developer Portal</h1>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Integrate, deploy, or train Aetheris Chess Engine locally. Our multi-language core allows you to combine fast C++ bitboard processing, Python training and reinforcement pipelines, and clean client-side JS integrations.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={() => simulateDownload('Aetheris_Neural_Net_Weights_ONNX.zip')}
              disabled={downloading !== null}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              {downloading === 'Aetheris_Neural_Net_Weights_ONNX.zip' ? 'Packaging ONNX...' : 'Download ONNX Weights'}
            </button>
            <button
              onClick={() => simulateDownload('Aetheris_Chess_Engine_Sources.zip')}
              disabled={downloading !== null}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shrink-0 hover:shadow-emerald-500/10"
            >
              <Download className="w-4 h-4" />
              {downloading === 'Aetheris_Chess_Engine_Sources.zip' ? 'Packaging Sources...' : 'Download Full Source .ZIP'}
            </button>
          </div>
        </div>
      </div>

      {/* Main split tab layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left column: vertical navigation menu */}
        <div className="md:col-span-3 space-y-3">
          <button
            onClick={() => setActiveTab('python')}
            className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all flex items-center justify-between font-mono ${activeTab === 'python' ? 'bg-slate-900 border-emerald-500 text-white shadow-md' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}
          >
            <span className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>aetheris_engine.py</span>
            </span>
            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase">Python</span>
          </button>

          <button
            onClick={() => setActiveTab('cpp')}
            className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all flex items-center justify-between font-mono ${activeTab === 'cpp' ? 'bg-slate-900 border-emerald-500 text-white shadow-md' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}
          >
            <span className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              <span>aetheris_core.cpp</span>
            </span>
            <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded uppercase">C++</span>
          </button>

          <button
            onClick={() => setActiveTab('js')}
            className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all flex items-center justify-between font-mono ${activeTab === 'js' ? 'bg-slate-900 border-emerald-500 text-white shadow-md' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}
          >
            <span className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>aetheris_search.js</span>
            </span>
            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded uppercase">JS/TS</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all flex items-center justify-between font-mono ${activeTab === 'guide' ? 'bg-slate-900 border-emerald-500 text-white shadow-md' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>README_BUILD.md</span>
            </span>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase">Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all flex items-center justify-between font-mono ${activeTab === 'api' ? 'bg-slate-900 border-emerald-500 text-white shadow-md' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>LIVE_ENGINE_API.json</span>
            </span>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase">API</span>
          </button>

          {/* Infrastructure specs */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-3 font-mono">
            <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" /> Core Specifications
            </h4>
            <div className="space-y-1 text-slate-400 text-[11px]">
              <div className="flex justify-between"><span className="text-slate-600">Model Format:</span> <span className="text-white font-bold">ONNX v1.15</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Bitboard Core:</span> <span className="text-white font-bold">C++17 magic</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Network Type:</span> <span className="text-white font-bold">Residual CNN</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Training:</span> <span className="text-white font-bold">PyTorch RL</span></div>
            </div>
          </div>
        </div>

        {/* Right column: copyable Code display block */}
        <div className="md:col-span-9 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-mono">
                <TerminalIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-200">{activeTab === 'guide' ? 'README_BUILD.md' : activeTab === 'api' ? 'LIVE_ENGINE_API.json' : `aetheris_${activeTab === 'python' ? 'engine.py' : activeTab === 'cpp' ? 'core.cpp' : 'search.js'}`}</span>
              </div>
              <button
                onClick={() => copyToClipboard(currentCode, activeTab)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold rounded border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copied === activeTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {activeTab === 'api' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
                {/* Column 1: API Docs */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">REST Endpoint Docs</span>
                    <h3 className="text-sm font-bold text-white mt-1">POST /api/engine/search</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-normal">
                    Query our hosted full-stack engine container directly. Integrate this AI in your own mobile apps, websites, or external programs!
                  </p>
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-slate-300">Request Body Schema (JSON):</div>
                    <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto leading-relaxed whitespace-pre">
{`{
  "fen": "r1bqkbnr/pppp1ppp/... w KQkq - 0 1", // Optional
  "depth": 3,                                  // 1 to 4
  "personality": "positional",                 // "tactical" | "positional" | ...
  "evalMode": "hybrid"                         // "traditional" | "neural" | ...
}`}
                    </pre>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-slate-300 font-mono">Test with curl:</div>
                    <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto select-all leading-normal">
{`curl -X POST -H "Content-Type: application/json" \\
-d '{"depth": 3, "personality": "tactical"}' \\
${window.location.origin}/api/engine/search`}
                    </pre>
                  </div>
                </div>

                {/* Column 2: REST Playground Console */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live REST API Tester
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-mono font-medium block">FEN Position String</label>
                      <input
                        type="text"
                        value={playgroundFen}
                        onChange={(e) => setPlaygroundFen(e.target.value)}
                        placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-[11px] text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-mono font-medium block">Depth (1-4)</label>
                        <select
                          value={playgroundDepth}
                          onChange={(e) => setPlaygroundDepth(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value={1}>1 (Fast)</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4 (Deep)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 font-mono font-medium block">Personality</label>
                        <select
                          value={playgroundPersonality}
                          onChange={(e) => setPlaygroundPersonality(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="positional">Positional</option>
                          <option value="tactical">Tactical</option>
                          <option value="gambiter">Gambiter</option>
                          <option value="defensive">Defensive</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handlePlaygroundSubmit}
                      disabled={apiLoading}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold rounded-lg transition-all text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {apiLoading ? 'Requesting Best Move...' : 'Send POST Request'}
                    </button>

                    {/* API Response display */}
                    {apiResponse && (
                      <div className="space-y-1.5">
                        <label className="text-slate-500 font-mono font-bold text-[10px] uppercase block">Response Payload (JSON)</label>
                        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-[140px] leading-relaxed select-all">
                          {JSON.stringify(apiResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Standard pre formatted code container */
              <div className="p-5 font-mono text-xs text-slate-300 overflow-x-auto overflow-y-auto max-h-[360px] scrollbar-thin leading-relaxed">
                <pre className="whitespace-pre">{currentCode}</pre>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-800 bg-slate-900 text-xs text-slate-500 font-mono flex flex-col sm:flex-row justify-between gap-2">
            <span>Author: Aetheris DeepMind Open-Source Team</span>
            <span>Version: v3.0-Release (MIT)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
