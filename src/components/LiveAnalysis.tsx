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
    maxDepth: 4, // Higher depth for dedicated analysis
    personality: 'positional',
    evalMode: 'hybrid'
  });

  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
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
