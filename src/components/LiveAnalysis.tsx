/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { ChessEngine, PERSONALITIES } from '../engine';
import { EngineConfig, LiveAnalysisData, EnginePersonalityId } from '../types';
import { Search, RefreshCw, Cpu, BrainCircuit, Play, Sparkles, Send, FileText, Check, BookOpen, Download } from 'lucide-react';
import { findBookMove } from '../openingBook';

export const LiveAnalysis: React.FC = () => {
  const [chess, setChess] = useState<Chess>(new Chess());
  const [fenInput, setFenInput] = useState<string>(chess.fen());
  const [config, setConfig] = useState<EngineConfig>({
    maxDepth: 5, // Higher depth for dedicated analysis
    personality: 'positional',
    evalMode: 'leeza_mcts' // Default to our ultimate Leeza Chess Zero MCTS engine
  });

  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showPolicy, setShowPolicy] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Leeza Chess Zero neural metrics
  const [leezaMctsNodes, setLeezaMctsNodes] = useState<any[]>([]);
  const [leezaValueHead, setLeezaValueHead] = useState<{ whiteWin: number; draw: number; blackWin: number } | null>({ whiteWin: 35, draw: 30, blackWin: 35 });
  const [policyMap, setPolicyMap] = useState<Record<string, number>>({});

  const [analysis, setAnalysis] = useState<LiveAnalysisData>({
    depth: 4,
    selDepth: 4,
    nodes: 0,
    nps: 0,
    score: 0,
    pv: [],
    isAnalyzing: false
  });

  // Run engine analysis on the position
  const runAnalysis = (currentChess: Chess) => {
    setAnalysis(prev => ({ ...prev, isAnalyzing: true }));
    
    // Defer to prevent lockups
    setTimeout(() => {
      try {
        const engineInstance = new ChessEngine(config);
        const res = engineInstance.search(currentChess.fen(), 0.85, currentChess.history());
        
        setAnalysis({
          depth: res.depth,
          selDepth: res.depth + 1,
          nodes: res.nodes,
          nps: res.nps,
          score: res.score,
          pv: res.pv,
          isAnalyzing: false,
          commentary: analysis.commentary // Preserve commentary until next requested
        });

        // Store Leeza MCTS Specific outputs
        if (res.leezaMctsNodes) {
          setLeezaMctsNodes(res.leezaMctsNodes);
        } else {
          setLeezaMctsNodes([]);
        }

        if (res.leezaValueHead) {
          setLeezaValueHead(res.leezaValueHead);
        } else {
          setLeezaValueHead(null);
        }

        if (res.policyMap) {
          setPolicyMap(res.policyMap);
        } else {
          setPolicyMap({});
        }
      } catch (e) {
        console.error('Analysis error:', e);
        setAnalysis(prev => ({ ...prev, isAnalyzing: false }));
      }
    }, 100);
  };

  // Run initial analysis on load
  useEffect(() => {
    runAnalysis(chess);
  }, [config.personality, config.evalMode, config.maxDepth]);

  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    try {
      const copy = new Chess(chess.fen());
      const res = copy.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });

      if (res) {
        setChess(copy);
        setFenInput(copy.fen());
        runAnalysis(copy);
      }
    } catch (e) {
      console.error('Invalid move in analysis:', e);
    }
  };

  const handleFenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = new Chess(fenInput);
      setChess(parsed);
      runAnalysis(parsed);
    } catch (e) {
      alert('Invalid FEN string. Please verify standard chess FEN formats.');
    }
  };

  const handleReset = () => {
    const fresh = new Chess();
    setChess(fresh);
    setFenInput(fresh.fen());
    setAnalysis(prev => ({ ...prev, commentary: undefined }));
    runAnalysis(fresh);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(chess.fen());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPgn = () => {
    const pgnChess = new Chess();
    const history = chess.history();
    history.forEach(move => pgnChess.move(move));
    
    pgnChess.header(
      'Event', 'Aetheris Chess Live Analysis Lab',
      'Site', window.location.origin,
      'Date', new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      'Round', '1',
      'White', 'Analysis Player White',
      'Black', 'Analysis Player Black',
      'Result', '*'
    );

    const pgnText = pgnChess.pgn({ maxWidth: 65 });

    const blob = new Blob([pgnText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aetheris_analysis_${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger Gemini Positional Commentary via backend Express proxy
  const requestGeminiCommentary = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: chess.fen(),
          moveHistory: chess.history(),
          evalScore: analysis.score,
          personality: config.personality,
          depth: analysis.depth
        })
      });

      const result = await response.json();
      setAnalysis(prev => ({
        ...prev,
        commentary: result.commentary
      }));
    } catch (e) {
      console.error('Error generating AI commentary:', e);
      setAnalysis(prev => ({
        ...prev,
        commentary: 'Failed to connect with Gemini AI model. Please verify server connectivity.'
      }));
    } finally {
      setAiLoading(false);
    }
  };

  const currentPersonality = PERSONALITIES[config.personality];
  const evalScoreDisplay = analysis.score > 0 ? `+${(analysis.score / 100).toFixed(2)}` : `${(analysis.score / 100).toFixed(2)}`;
  const matchedBook = findBookMove(chess.history());

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6" id="live_analysis_panel">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-emerald-400" />
              Chess Engine Analysis Lab
            </h2>
            <p className="text-xs text-slate-400">Make moves freely on either side or paste FEN positions. Request Gemini Grandmaster feedback in real-time.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPgn}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export PGN
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Board
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Interactive Board with integrated vertical centipawn evaluation bar */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="flex gap-4 w-full justify-center">
            
            {/* Vertical Centipawn Bar */}
            <div className="w-5 bg-slate-800 rounded-full relative flex flex-col justify-between overflow-hidden shadow-inner border border-slate-700">
              <div 
                className="bg-slate-950 transition-all duration-300 w-full" 
                style={{ height: `${Math.max(5, Math.min(95, 50 - (analysis.score / 20)))}%` }} 
              />
              <div className="w-full h-1 bg-amber-400 absolute top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
              <div className="flex-1 bg-white transition-all duration-300 w-full" />
            </div>

            {/* Chessboard component */}
            <Chessboard
              fen={chess.fen()}
              onMove={handleMove}
              interactive={true}
              flipped={false}
              highlightSquares={analysis.pv.length > 0 ? [chess.history({ verbose: true }).slice(-1)[0]?.to || ''] : []}
              policyMap={policyMap}
              showPolicy={showPolicy}
              heatmapFocus={policyMap}
              showHeatmap={showHeatmap}
            />
          </div>

          {/* FEN String Loader Form */}
          <form onSubmit={handleFenSubmit} className="w-full max-w-[536px] mt-6 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Paste standard FEN position string..."
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-[11px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition-all shrink-0"
            >
              Load
            </button>
            <button
              type="button"
              onClick={handleCopyFen}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition-all shrink-0 flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'FEN'}
            </button>
          </form>

          {/* Leeza Chess Zero Neural Core Monitor (Phase C & Leeza Chess Zero) */}
          <div className="w-full max-w-[536px] mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-400 tracking-wider uppercase font-mono">
                <BrainCircuit className="w-4 h-4 text-indigo-400 animate-pulse" />
                Leeza Zero Value Head Projections
              </div>
              <span className="text-[10px] text-indigo-300 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                ACTIVE
              </span>
            </div>

            {/* Value Head Win/Draw/Loss Bar */}
            {leezaValueHead ? (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-bold">White Win: {leezaValueHead.whiteWin}%</span>
                  <span className="text-slate-300 font-bold">Draw: {leezaValueHead.draw}%</span>
                  <span className="text-blue-400 font-bold">Black Win: {leezaValueHead.blackWin}%</span>
                </div>
                <div className="h-4 w-full rounded-lg bg-slate-950 overflow-hidden flex border border-slate-800 p-0.5 shadow-inner">
                  <div 
                    className="bg-emerald-500/90 h-full rounded-l transition-all duration-500 flex items-center justify-center text-[8px] font-extrabold text-slate-950" 
                    style={{ width: `${leezaValueHead.whiteWin}%` }}
                  >
                    {leezaValueHead.whiteWin >= 10 ? 'W' : ''}
                  </div>
                  <div 
                    className="bg-slate-400 h-full transition-all duration-500 flex items-center justify-center text-[8px] font-extrabold text-slate-900" 
                    style={{ width: `${leezaValueHead.draw}%` }}
                  >
                    {leezaValueHead.draw >= 10 ? 'D' : ''}
                  </div>
                  <div 
                    className="bg-blue-500/95 h-full rounded-r transition-all duration-500 flex items-center justify-center text-[8px] font-extrabold text-slate-950" 
                    style={{ width: `${leezaValueHead.blackWin}%` }}
                  >
                    {leezaValueHead.blackWin >= 10 ? 'B' : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-1 font-mono">Loading Neural Head Projections...</div>
            )}

            {/* Neural Overlay Selectors */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowPolicy(!showPolicy)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold font-mono transition-all flex items-center justify-between cursor-pointer ${
                  showPolicy 
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/20' 
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                <span>Policy Map P(a|s)</span>
                <span className={`w-2 h-2 rounded-full ${showPolicy ? 'bg-indigo-400 shadow-sm shadow-indigo-400' : 'bg-slate-800'}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold font-mono transition-all flex items-center justify-between cursor-pointer ${
                  showHeatmap 
                    ? 'bg-rose-600/15 border-rose-500 text-rose-300 ring-1 ring-rose-500/20' 
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                <span>Neural Heatmap</span>
                <span className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-rose-400 shadow-sm shadow-rose-400' : 'bg-slate-800'}`} />
              </button>
            </div>
          </div>

          {/* MCTS Playouts Search Tree Thread Viewer (Phase A) */}
          {(['leeza_mcts', 'stockfish_nnue', 'komodo_mcts', 'patricia_neural', 'nova_chess', 'pantheon_fusion', 'neuralcore_rl_selfplay'].includes(config.evalMode)) && leezaMctsNodes.length > 0 && (
            <div className="w-full max-w-[536px] mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
                <span className="text-xs font-extrabold text-amber-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  {config.evalMode === 'leeza_mcts' && 'NeuralCore MCTS Search Tree Playouts'}
                  {config.evalMode === 'stockfish_nnue' && 'NeuralCore + Stockfish Distilled Alpha-Beta Paths'}
                  {config.evalMode === 'komodo_mcts' && 'NeuralCore + Komodo Distilled MCTS Tree'}
                  {config.evalMode === 'patricia_neural' && 'NeuralCore + Patricia Distilled Tactical Branches'}
                  {config.evalMode === 'nova_chess' && 'NeuralCore + Nova Chess Distilled Elegant Tree'}
                  {config.evalMode === 'pantheon_fusion' && 'NeuralCore Pantheon Grand Fusion Votes'}
                  {config.evalMode === 'neuralcore_rl_selfplay' && 'NeuralCore Autonomous Self-Play Live Learning Tree'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {leezaMctsNodes.length} paths
                </span>
              </div>
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-850 pb-1">
                      <th className="pb-1 font-bold">MOVE</th>
                      <th className="pb-1 text-right font-bold">
                        {config.evalMode === 'neuralcore_rl_selfplay' ? 'EPISODES' : config.evalMode === 'pantheon_fusion' ? 'VOTES' : ['stockfish_nnue', 'patricia_neural', 'nova_chess'].includes(config.evalMode) ? 'DEPTH (PLY)' : 'VISITS (N)'}
                      </th>
                      <th className="pb-1 text-right font-bold">
                        {config.evalMode === 'neuralcore_rl_selfplay' ? 'REWARD' : config.evalMode === 'pantheon_fusion' ? 'COMPOSITE VAL' : 'Q-VALUE / EVAL'}
                      </th>
                      <th className="pb-1 text-right font-bold">CONFIDENCE</th>
                      <th className="pb-1 text-right font-bold text-amber-400">
                        {config.evalMode === 'neuralcore_rl_selfplay' ? 'LEARNED UCT' : config.evalMode === 'pantheon_fusion' ? 'CONSENSUS / VOTERS' : ['stockfish_nnue', 'patricia_neural', 'nova_chess'].includes(config.evalMode) ? 'BOUND' : 'PUCT'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leezaMctsNodes.slice(0, 8).map((node, i) => (
                      <tr 
                        key={i} 
                        className={`border-b border-slate-950/40 hover:bg-slate-850/35 transition-colors ${
                          i === 0 ? 'text-amber-300 font-extrabold bg-amber-500/5' : 'text-slate-300'
                        }`}
                      >
                        <td className="py-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 w-4">{i + 1}.</span>
                          <span className="font-bold">{node.move}</span>
                          {i === 0 && <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1 rounded uppercase font-bold tracking-tighter">Best</span>}
                          {node.voters && (
                            <span className="text-[8px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1 py-0.5 rounded ml-2 font-sans truncate max-w-[120px]" title={node.voters}>
                              {node.voters}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right text-white">{node.visits}</td>
                        <td className="py-1.5 text-right">{node.qValue > 0 ? `+${node.qValue}` : node.qValue}</td>
                        <td className="py-1.5 text-right text-indigo-400">{(node.prior * 100).toFixed(0)}%</td>
                        <td className="py-1.5 text-right font-extrabold text-amber-400">{node.uct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Engine evaluation panel and Gemini AI interpretation */}
        <div className="lg:col-span-5 space-y-6">

          {/* Opening Book Oracle */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Opening Book Oracle (開局庫)
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                FOSS STATS
              </span>
            </div>

            {matchedBook ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{matchedBook.name}</h4>
                    <p className="text-[10px] text-emerald-400 font-medium font-mono mt-0.5">{matchedBook.nameZh}</p>
                  </div>
                  {matchedBook.priority <= 2 && (
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono shrink-0 uppercase font-bold">
                      Priority {matchedBook.priority}
                    </span>
                  )}
                </div>

                {/* Win/Loss ratios */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>White Wins: {matchedBook.winRateWhite}%</span>
                    <span>Draws: {matchedBook.drawRate}%</span>
                    <span>Black Wins: {matchedBook.winRateBlack}%</span>
                  </div>
                  {/* Progress Bar representation */}
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                    <div className="bg-emerald-400 h-full" style={{ width: `${matchedBook.winRateWhite}%` }} />
                    <div className="bg-slate-500 h-full" style={{ width: `${matchedBook.drawRate}%` }} />
                    <div className="bg-blue-400 h-full" style={{ width: `${matchedBook.winRateBlack}%` }} />
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-850/50">
                  <p>{matchedBook.description}</p>
                  <p className="text-slate-400 text-[11px] border-t border-slate-850 pt-1.5 italic">{matchedBook.descriptionZh}</p>
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono bg-slate-950 p-2 rounded-lg border border-slate-850">
                  <span className="text-slate-500">Book recommendation:</span>
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                    {matchedBook.nextBookMove}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-850/50">
                No standard opening book detected. Play e4, c5 or c4 to activate Priority Opening lines.
              </div>
            )}
          </div>
          
          {/* Engine Realtime Stats panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Real-Time Search Analysis
              </h3>
              {analysis.isAnalyzing && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <span className="text-[10px] text-slate-500 block mb-0.5 uppercase">Centipawn Eval</span>
                <span className={`text-lg font-bold ${analysis.score >= 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {evalScoreDisplay}
                </span>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  {analysis.score > 150 ? 'Strong White' : analysis.score < -150 ? 'Strong Black' : 'Equilibrium'}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <span className="text-[10px] text-slate-500 block mb-0.5 uppercase">Depth (Plies)</span>
                <span className="text-lg font-bold text-white">
                  D {analysis.depth} / {analysis.selDepth}
                </span>
                <span className="text-[10px] text-slate-600 block mt-0.5">Iterative search</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-500 uppercase">Search Stats</span>
                  <span className="text-[10px] text-emerald-400">{(analysis.nps / 1000).toFixed(1)}k NPS</span>
                </div>
                <div className="text-xs text-slate-300 font-bold">
                  {analysis.nodes.toLocaleString()} nodes searched
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 col-span-2 space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase">Principal Variation Line</span>
                <div className="text-xs text-amber-400 font-bold flex flex-wrap gap-1.5 leading-relaxed">
                  {analysis.pv.length === 0 ? (
                    <span className="text-slate-600 italic">No nodes searched yet...</span>
                  ) : (
                    analysis.pv.map((move, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-slate-600 font-normal">{i + 1}.</span>
                        <span>{move}</span>
                        {i < analysis.pv.length - 1 && <span className="text-slate-700">→</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Analysis configuration controls */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Evaluation Core Architecture</span>
                <select
                  value={config.evalMode}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setConfig(prev => ({ ...prev, evalMode: val }));
                  }}
                  className="bg-slate-950 text-indigo-400 font-mono text-xs rounded border border-slate-800 px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="pantheon_fusion">🔥 NeuralCore Grand Fusion (5-in-1 Ensemble)</option>
                  <option value="neuralcore_rl_selfplay">🤖 NeuralCore RL Self-Play (Self-Learning Engine)</option>
                  <option value="leeza_mcts">🧠 NeuralCore MCTS (Leeza MCTS)</option>
                  <option value="stockfish_nnue">🐟 NeuralCore + Stockfish Distilled (Ultra Deep)</option>
                  <option value="komodo_mcts">🦎 NeuralCore + Komodo Distilled (Positional MCTS)</option>
                  <option value="patricia_neural">🦅 NeuralCore + Patricia Distilled (Sharp Neural)</option>
                  <option value="nova_chess">🌟 NeuralCore + Nova Chess Distilled (Elegant Tactical)</option>
                  <option value="hybrid">✨ NeuralCore Hybrid (Core + Minimax)</option>
                  <option value="neural">🦾 NeuralCore Neural (Standard Policy Head)</option>
                  <option value="traditional">📟 NeuralCore Traditional (Legacy Minimax)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Analysis Persona Multipliers</span>
                <select
                  value={config.personality}
                  onChange={(e) => {
                    const val = e.target.value as EnginePersonalityId;
                    setConfig(prev => ({ ...prev, personality: val }));
                  }}
                  className="bg-slate-950 text-slate-300 font-mono text-xs rounded border border-slate-800 px-2 py-1 focus:outline-none focus:border-emerald-500"
                >
                  <option value="positional">🏛️ Positional GM</option>
                  <option value="tactical">🎯 Tactical Attacker</option>
                  <option value="gambiter">⚔️ Aggressive Gambiter</option>
                  <option value="defensive">🛡️ Cautious Defender</option>
                </select>
              </div>
            </div>
          </div>

          {/* Gemini AI Commentary Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Coach Interpretation</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-850 px-2.5 py-0.5 rounded-full border border-slate-800">
                Gemini 3.5 Flash
              </span>
            </div>

            {analysis.commentary ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs text-slate-300 leading-relaxed font-sans space-y-2">
                <p className="whitespace-pre-line">{analysis.commentary}</p>
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900 font-mono flex justify-between">
                  <span>Persona Mode: {currentPersonality.name}</span>
                  <span>Eval: {evalScoreDisplay}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-850/65 text-center text-slate-500 text-xs">
                Ask Gemini to interpret the board from the perspective of our selected evaluation personality.
              </div>
            )}

            <button
              onClick={requestGeminiCommentary}
              disabled={aiLoading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-emerald-500/10 flex items-center justify-center gap-2 disabled:pointer-events-none"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating Grandmaster Commentary...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Request AI Grandmaster Commentary
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
