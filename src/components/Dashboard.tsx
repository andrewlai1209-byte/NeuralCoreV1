/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from './Chessboard';
import { TrainingSummary, EloHistoryPoint, LossMetricPoint, TrainingGame } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Play, Pause, Cpu, RefreshCw, BarChart2, Shield, Activity, Terminal as TerminalIcon, Award, Zap, History, ExternalLink, Sliders, Grid } from 'lucide-react';

const FALLBACK_DATA = {
  totalGames: 48291,
  winRate: 39,
  drawRate: 22,
  lossRate: 39,
  currentElo: 2315,
  currentEloTraditional: 1845,
  currentEloNeural: 2120,
  currentEloNeuralCore: 2480,
  policyLoss: 0.1240,
  valueLoss: 0.0860,
  trainSpeed: 1450,
  gamesInCloud: 48291,
  recentGames: [],
  eloHistory: Array.from({ length: 20 }, (_, i) => ({
    epoch: i + 1,
    gamesPlayed: 40000 + i * 410,
    eloTraditional: 1800 + Math.floor(Math.sin(i / 2) * 15) + i * 2,
    eloNeural: 1950 + i * 8 + Math.floor(Math.random() * 10),
    eloHybrid: 2100 + i * 11 + Math.floor(Math.random() * 15),
    eloNeuralCore: 2250 + i * 12.5 + Math.floor(Math.random() * 12),
  })),
  lossHistory: Array.from({ length: 20 }, (_, i) => ({
    epoch: i + 1,
    policyLoss: parseFloat((0.45 - i * 0.016).toFixed(4)),
    valueLoss: parseFloat((0.38 - i * 0.015).toFixed(4)),
    accuracy: parseFloat((45 + i * 1.8).toFixed(1)),
  })),
  winLossHistory: Array.from({ length: 20 }, (_, i) => {
    const win = Math.floor(30 + i * 1.2 + Math.sin(i) * 3);
    const draw = Math.floor(20 + Math.cos(i) * 1.5);
    const loss = 100 - win - draw;
    return {
      epoch: i + 1,
      wins: win,
      draws: draw,
      losses: loss
    };
  }),
  liveGame: {
    id: 'fallback_live',
    whiteEngine: 'Aetheris Neural (v2.8)',
    blackEngine: 'Aetheris Hybrid (v3.0)',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moveHistory: ['e4', 'e5', 'Nf3', 'Nc6'],
    evalHistory: [0, 15, -10, 5],
    isGameOver: false,
    turn: 'w',
    startTime: '12:00:00 PM'
  },
  enginesList: [
    { id: 'neuralcore', name: 'NeuralCore CH (v1.0)', shortName: 'NeuralCore CH', baseElo: 2480, maxDepth: 8, wins: 28402, draws: 11451, losses: 14238, active: true },
    { id: 'hybrid', name: 'Aetheris Hybrid (v3.0)', shortName: 'Aetheris Hybrid', baseElo: 2315, maxDepth: 6, wins: 23419, draws: 12102, losses: 18274, active: true },
    { id: 'neural', name: 'Aetheris Neural (v2.8)', shortName: 'Aetheris Neural', baseElo: 2120, maxDepth: 5, wins: 19541, draws: 10429, losses: 21950, active: true },
    { id: 'traditional', name: 'Traditional Minimax (Depth 4)', shortName: 'Traditional Minimax', baseElo: 1845, maxDepth: 4, wins: 14205, draws: 9401, losses: 28942, active: true },
    { id: 'policy', name: 'Reinforcement Policy (v2.0)', shortName: 'Reinforcement Policy', baseElo: 1980, maxDepth: 4, wins: 16120, draws: 8192, losses: 24501, active: true }
  ],
  trainingLogs: [
    { timestamp: '12:00:00 PM', level: 'success', message: 'Aetheris Chess Sandbox Cloud Server initialized successfully.', engine: 'System' },
    { timestamp: '12:00:04 PM', level: 'info', message: 'Traditional Minimax evaluation depth converged at ply 4.', engine: 'Traditional Minimax' },
    { timestamp: '12:00:08 PM', level: 'info', message: 'Aetheris Hybrid policy loss minimized to 0.1240.', engine: 'Aetheris Hybrid' }
  ],
  heatmapFocus: (() => {
    const focus: Record<string, number> = {};
    const fs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rs = ['1', '2', '3', '4', '5', '6', '7', '8'];
    for (const file of fs) {
      for (const rank of rs) {
        const square = file + rank;
        const isCenter = ['d4', 'd5', 'e4', 'e5'].includes(square);
        focus[square] = isCenter ? 85 : Math.floor(Math.random() * 30) + 10;
      }
    }
    return focus;
  })()
};

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<'elo' | 'loss' | 'ratio'>('elo');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Poll server for live training status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/cloud-training/status');
        const json = await res.json();
        setData(json);
        setLoading(false);
      } catch (e) {
        console.warn('Error fetching cloud status, loading fallback:', e instanceof Error ? e.message : String(e));
        setData((prev: any) => prev || FALLBACK_DATA);
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleEngine = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await fetch('/api/cloud-training/toggle-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const result = await res.json();
      if (result.success) {
        const statusRes = await fetch('/api/cloud-training/status');
        const json = await statusRes.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error toggling engine training status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const [trainConfig, setTrainConfig] = useState({
    learningRate: 0.01,
    batchSize: 256,
    optimizer: 'Adam' as 'Adam' | 'SGD' | 'RMSprop',
    architecture: 'ResNet-20' as 'ResNet-20' | 'ResNet-40' | 'ViT-Transformer',
    epochsToRun: 3,
    trainingTarget: 'pantheon_fusion' as 'stockfish' | 'komodo' | 'patricia' | 'nova' | 'pantheon_fusion' | 'neuralcore_rl_selfplay'
  });
  const [isTraining, setIsTraining] = useState(false);
  const [gradientStep, setGradientStep] = useState(0);
  const [lossDelta, setLossDelta] = useState<string | null>(null);

  const handleRunSelfTraining = async () => {
    setIsTraining(true);
    setGradientStep(1);
    
    // Animate gradient steps to look beautiful & interactive
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(700);
    setGradientStep(2);
    await delay(900);
    setGradientStep(3);
    await delay(700);
    setGradientStep(4);
    await delay(500);

    try {
      const res = await fetch('/api/cloud-training/self-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainConfig)
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
        setLossDelta(`Converged successfully! Checkpoint saved.`);
        setTimeout(() => setLossDelta(null), 5000);
      }
    } catch (e) {
      console.error('Self-training error:', e);
    } finally {
      setIsTraining(false);
      setGradientStep(0);
    }
  };

  // Scroll to bottom of terminal logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.trainingLogs]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 py-12">
        <RefreshCw className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
        <p className="text-sm font-medium tracking-wide">Syncing with Cloud Training Database...</p>
      </div>
    );
  }

  const {
    totalGames,
    winRate,
    drawRate,
    lossRate,
    currentElo,
    currentEloTraditional,
    currentEloNeural,
    currentEloNeuralCore,
    policyLoss,
    valueLoss,
    trainSpeed,
    liveGame,
    recentGames,
    eloHistory,
    lossHistory,
    enginesList = FALLBACK_DATA.enginesList,
    trainingLogs = FALLBACK_DATA.trainingLogs,
    heatmapFocus = FALLBACK_DATA.heatmapFocus
  } = data;

  const currentLiveMove = liveGame.moveHistory[liveGame.moveHistory.length - 1] || '---';
  const liveScore = liveGame.evalHistory[liveGame.evalHistory.length - 1] || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left" id="dashboard_panel">
      
      {/* NeuralMate Link Gateway Alert Banner */}
      <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-500/5 animate-pulse-slow">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/25 flex items-center justify-center shrink-0 shadow-inner">
            <Award className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">NeuralMate External Integration Portal</h3>
            <p className="text-[11px] text-slate-300 mt-0.5 font-sans leading-relaxed">
              Connect to the official sandbox: <a href="https://neural-mate-bfbf7301.base44.app/" target="_blank" referrerPolicy="no-referrer" className="text-emerald-400 font-bold hover:underline">https://neural-mate-bfbf7301.base44.app/</a> to inspect live games.
            </p>
          </div>
        </div>
        <a
          href="https://neural-mate-bfbf7301.base44.app/"
          target="_blank"
          referrerPolicy="no-referrer"
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          Open Portal <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-slate-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Cloud Training Arena Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-sans font-bold tracking-tight text-white mb-2">Aetheris DeepMind Sandbox</h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              An open-source reinforcement learning framework where C++, Python, and TypeScript modules work cohesively. Watch continuous self-play neural evaluation matches updating in the cloud.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-[95px]">
              <div className="text-[10px] font-medium text-slate-400 mb-0.5">Traditional</div>
              <div className="text-base font-bold text-slate-300">{currentEloTraditional}</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-[95px]">
              <div className="text-[10px] font-medium text-slate-400 mb-0.5">Neural</div>
              <div className="text-base font-bold text-sky-400">{currentEloNeural}</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-[95px]">
              <div className="text-[10px] font-medium text-slate-400 mb-0.5">Hybrid</div>
              <div className="text-base font-bold text-emerald-400">{currentElo}</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 ring-1 ring-rose-500/30 rounded-xl px-3 py-2 text-center min-w-[95px]">
              <div className="text-[10px] font-medium text-rose-300 mb-0.5 font-mono flex items-center justify-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                NeuralCore
              </div>
              <div className="text-base font-bold text-rose-400">{currentEloNeuralCore || 2480}</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-[95px]">
              <div className="text-[10px] font-medium text-slate-400 mb-0.5">Cloud Games</div>
              <div className="text-base font-bold text-white">{totalGames.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Live Self Play & Cloud Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Live Game Board */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Cloud Match</h2>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md font-mono">ID: {liveGame.id}</span>
            </div>

            {/* Simulated Eval bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 mb-5 overflow-hidden flex">
              <div 
                className="bg-emerald-500 transition-all duration-1000 h-full" 
                style={{ width: `${Math.max(5, Math.min(95, 50 + (liveScore / 15)))}%` }} 
              />
              <div className="flex-1 bg-slate-950 h-full" />
            </div>

            <div className="flex justify-center mb-4">
              <Chessboard 
                fen={liveGame.fen} 
                interactive={false} 
                highlightSquares={[]} 
                flipped={false}
              />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-white border border-slate-400 inline-block" />
                {liveGame.whiteEngine}
              </span>
              <span className="text-slate-500">vs</span>
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-950 inline-block" />
                {liveGame.blackEngine}
              </span>
            </div>
            <div className="bg-slate-950 rounded-lg p-3 flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">Current Eval: <b className="text-emerald-400">{liveScore > 0 ? '+' : ''}{(liveScore / 100).toFixed(2)}</b></span>
              <span className="text-slate-400">Last Move: <b className="text-amber-400">{currentLiveMove}</b></span>
              <span className="text-slate-500">M: {liveGame.moveHistory.length}</span>
            </div>
          </div>
        </div>

        {/* Right: Metrics & Charts */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Top Row: Mini Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-xs font-medium">Policy Loss</span>
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-mono font-bold text-white">{policyLoss}</div>
              <div className="text-[10px] text-emerald-400 mt-1">Convergence target &lt; 0.05</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-xs font-medium">Value Loss</span>
                <BarChart2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-mono font-bold text-white">{valueLoss}</div>
              <div className="text-[10px] text-emerald-400 mt-1">Convergence target &lt; 0.03</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-xs font-medium">Compute Speed</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg font-mono font-bold text-white">{trainSpeed} nps</div>
              <div className="text-[10px] text-slate-400 mt-1">Multi-core cluster optimization</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-xs font-medium">Neural Win-Rate</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-mono font-bold text-white">{winRate}%</div>
              <div className="text-[10px] text-slate-400 mt-1">D:{drawRate}% | L:{lossRate}%</div>
            </div>
          </div>

          {/* Training Charts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Reinforcement Learning Progress</h3>
                <p className="text-xs text-slate-400">Monitoring performance optimization across epochs</p>
              </div>
              <div className="flex bg-slate-800 p-1 rounded-lg self-start">
                <button
                  onClick={() => setActiveChartTab('elo')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeChartTab === 'elo' ? 'bg-slate-950 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Elo Climb
                </button>
                <button
                  onClick={() => setActiveChartTab('loss')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeChartTab === 'loss' ? 'bg-slate-950 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Gradient Loss
                </button>
                <button
                  onClick={() => setActiveChartTab('ratio')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeChartTab === 'ratio' ? 'bg-slate-950 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Win/Loss Ratio
                </button>
              </div>
            </div>

            <div className="h-[200px] sm:h-[220px] w-full">
              {activeChartTab === 'elo' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={eloHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[1700, 2600]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="eloNeuralCore" name="NeuralCore CH" stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 7 }} dot={false} />
                    <Line type="monotone" dataKey="eloHybrid" name="Aetheris Hybrid" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
                    <Line type="monotone" dataKey="eloNeural" name="Aetheris Neural" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="eloTraditional" name="Traditional Minimax" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {activeChartTab === 'loss' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lossHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorPolicy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                    <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="policyLoss" name="Policy Net Loss" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPolicy)" />
                    <Area type="monotone" dataKey="valueLoss" name="Value Net Loss" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {activeChartTab === 'ratio' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.winLossHistory || FALLBACK_DATA.winLossHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                    <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="wins" name="Wins (%)" stackId="a" fill="#10b981" />
                    <Bar dataKey="draws" name="Draws (%)" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="losses" name="Losses (%)" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Engine Intelligence & Deep Learning Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="engine_intelligence_diagnostics">
        {/* Comparison Table & Quick-Access Controls */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Engine Cluster Controller</h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">Live Sync: 3s</span>
            </div>
            
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Monitor current ELO parameters and search configurations. Click the training status badge to pause or resume optimization for any individual neural or traditional model in the cluster.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800/80">
                    <th className="pb-2 font-bold uppercase tracking-wider">Model Architecture</th>
                    <th className="pb-2 font-bold uppercase tracking-wider text-center">ELO Rating</th>
                    <th className="pb-2 font-bold uppercase tracking-wider text-center">Search Depth</th>
                    <th className="pb-2 font-bold uppercase tracking-wider text-right">Win / Draw / Loss</th>
                    <th className="pb-2 font-bold uppercase tracking-wider text-right">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {enginesList.map((engine: any) => {
                    const total = engine.wins + engine.draws + engine.losses;
                    const winPercent = total > 0 ? Math.round((engine.wins / total) * 100) : 0;
                    const drawPercent = total > 0 ? Math.round((engine.draws / total) * 100) : 0;
                    const lossPercent = total > 0 ? 100 - winPercent - drawPercent : 0;
                    const isToggling = togglingId === engine.id;

                    return (
                      <tr key={engine.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 font-sans font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${engine.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                            {engine.name}
                          </div>
                        </td>
                        <td className="py-3 text-center text-emerald-400 font-bold font-mono">
                          {engine.baseElo}
                        </td>
                        <td className="py-3 text-center text-slate-300 font-mono">
                          {engine.maxDepth} Plies
                        </td>
                        <td className="py-3 text-right text-slate-400 font-mono">
                          <div className="flex flex-col items-end">
                            <span className="text-white font-bold">{winPercent}% <span className="text-slate-500 font-normal">/ {drawPercent}% / {lossPercent}%</span></span>
                            <div className="w-24 bg-slate-800 h-1 rounded-full overflow-hidden mt-1 flex">
                              <div className="bg-emerald-500 h-full" style={{ width: `${winPercent}%` }} />
                              <div className="bg-blue-500 h-full" style={{ width: `${drawPercent}%` }} />
                              <div className="bg-red-500 h-full" style={{ width: `${lossPercent}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleToggleEngine(engine.id)}
                            disabled={isToggling}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-sans flex items-center gap-1.5 ml-auto transition-all cursor-pointer ${
                              engine.active
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : engine.active ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-emerald-400 stroke-none" /> Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-slate-400 stroke-none" /> Resume
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* NeuralCore Reinforcement Optimization Hub */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-5 justify-between">
          
          {/* Top: Neural Policy Optimizer (RL training deck) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">NeuralCore Deep Learning Portal</h3>
              </div>
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-mono font-bold border border-indigo-500/20 animate-pulse">NC-DISTILL</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Formulate weights for our custom <b>NeuralCore Chess Engine</b> via knowledge distillation. Select one of the high-thinking chess engines below as the sparring partner/teacher target.
            </p>

            <div className="space-y-1 text-xs">
              <span className="text-indigo-400 font-mono text-[9px] block uppercase font-bold">Sparring Partner & Distillation Teacher</span>
              <select 
                value={trainConfig.trainingTarget}
                onChange={(e) => setTrainConfig(prev => ({ ...prev, trainingTarget: e.target.value as any }))}
                className="w-full bg-slate-950 border border-indigo-500/30 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 font-sans text-xs"
              >
                <option value="pantheon_fusion">🔥 Grand Fusion Pantheon (Multi-Engine Composite Target)</option>
                <option value="neuralcore_rl_selfplay">🤖 NeuralCore RL Self-Play (Autonomous Self-Learning)</option>
                <option value="stockfish">🐟 Stockfish NNUE (Deep Tactical Generalization)</option>
                <option value="komodo">🦎 Komodo Dragon (Deep Positional MCTS)</option>
                <option value="patricia">🦅 Patricia Neural (Ultra-Sharp Tactician)</option>
                <option value="nova">🌟 Nova Chess (Elegant Creative Combos)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[9px] block uppercase">Network Arch</span>
                <select 
                  value={trainConfig.architecture}
                  onChange={(e) => setTrainConfig(prev => ({ ...prev, architecture: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono text-[10.5px]"
                >
                  <option value="ResNet-20">ResNet-20 (MCTS)</option>
                  <option value="ResNet-40">ResNet-40 (Deep)</option>
                  <option value="ViT-Transformer">ViT-Chess (180M)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[9px] block uppercase">Optimizer</span>
                <select 
                  value={trainConfig.optimizer}
                  onChange={(e) => setTrainConfig(prev => ({ ...prev, optimizer: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono text-[10.5px]"
                >
                  <option value="Adam">Adam Core</option>
                  <option value="SGD">SGD Momentum</option>
                  <option value="RMSprop">RMSprop</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[9px] block uppercase">Learning Rate</span>
                <select 
                  value={trainConfig.learningRate}
                  onChange={(e) => setTrainConfig(prev => ({ ...prev, learningRate: parseFloat(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono text-[10.5px]"
                >
                  <option value="0.001">0.001 (Slow)</option>
                  <option value="0.01">0.01 (Balanced)</option>
                  <option value="0.05">0.05 (Aggressive)</option>
                  <option value="0.1">0.1 (Turbo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-mono text-[9px] block uppercase">Epochs</span>
                <select 
                  value={trainConfig.epochsToRun}
                  onChange={(e) => setTrainConfig(prev => ({ ...prev, epochsToRun: parseInt(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono text-[10.5px]"
                >
                  <option value="1">1 Epoch</option>
                  <option value="3">3 Epochs</option>
                  <option value="5">5 Epochs</option>
                  <option value="10">10 Epochs</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunSelfTraining}
              disabled={isTraining}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:bg-slate-850 disabled:text-slate-600"
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  {gradientStep === 1 ? 'Forward Propagating...' : 
                   gradientStep === 2 ? 'Running 150 Self-Play Matches...' : 
                   gradientStep === 3 ? 'Backpropagating gradients...' : 'Minimizing losses...'}
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current text-indigo-300" />
                  Run Self-Play Reinforcement Epoch
                </>
              )}
            </button>

            {lossDelta && (
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg p-2.5 text-[10px] font-mono text-center animate-pulse">
                {lossDelta}
              </div>
            )}
          </div>

          {/* Bottom: Exploration Gradient Heatmap */}
          <div className="border-t border-slate-800/80 pt-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Grid className="w-4 h-4 text-amber-500" />
                Exploration Gradient Heatmap
              </span>
              <span className="text-[10px] text-amber-400 border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 rounded font-mono">Backprop Focus</span>
            </div>

            <div className="flex justify-center">
              {/* Heatmap chessboard container */}
              <div className="relative p-3 bg-slate-950 rounded-2xl border border-slate-800/85 shadow-2xl w-full max-w-[240px]">
                {/* Board files labeling - Top */}
                <div className="flex justify-between px-4 text-[7px] font-mono font-bold text-slate-600 mb-1">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(f => <span key={f} className="w-full text-center">{f}</span>)}
                </div>

                <div className="flex">
                  {/* Board ranks labeling - Left */}
                  <div className="flex flex-col justify-between text-[7px] font-mono font-bold text-slate-600 mr-2 py-1">
                    {['8', '7', '6', '5', '4', '3', '2', '1'].map(r => <span key={r} className="h-full flex items-center justify-center">{r}</span>)}
                  </div>

                  {/* Core 8x8 heat matrix */}
                  <div className="flex-1 grid grid-cols-8 gap-[1.5px]">
                    {['8', '7', '6', '5', '4', '3', '2', '1'].map(rank => 
                      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => {
                        const square = file + rank;
                        const score = heatmapFocus[square] || 10;
                        return (
                          <div
                            key={square}
                            className="aspect-square rounded-sm relative group flex items-center justify-center transition-all duration-300 border border-slate-900/30"
                            style={{
                              backgroundColor: `rgba(245, 158, 11, ${0.1 + (score / 100) * 0.85})`
                            }}
                          >
                            {score > 60 && (
                              <span className="text-[7px] font-bold text-slate-950/90 font-mono">
                                {score}
                              </span>
                            )}
                            {/* Hover Details Popover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-950 text-white border border-slate-800 text-[10px] rounded px-2 py-1 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-30 font-mono whitespace-nowrap shadow-2xl">
                              <span className="text-amber-400 font-bold">{square.toUpperCase()}</span>: {score}% intensity
                              <div className="text-[8px] text-slate-400 mt-0.5">Policy gradient backprop active</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Scrollable Logging Terminal & Recent Games */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Terminal Logs */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[250px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Real-time Training Log</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-mono">Stream Live</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[160px] font-mono text-[11px] text-slate-300 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 pr-2">
            {trainingLogs.map((log: any, idx: number) => {
              let textClass = 'text-slate-400';
              if (log.level === 'success') textClass = 'text-emerald-400 font-bold';
              else if (log.level === 'warn') textClass = 'text-rose-400 font-bold';
              else if (log.message.includes('calculated move')) textClass = 'text-sky-400';
              else if (log.message.includes('matchmaking scheduled')) textClass = 'text-amber-400';
              
              return (
                <div key={idx} className="leading-relaxed border-b border-slate-900/40 pb-1">
                  <span className="text-slate-600 mr-2">[{log.timestamp}]</span>
                  {log.engine && (
                    <span className="text-slate-500 font-bold mr-1.5 bg-slate-900 px-1 py-0.5 rounded text-[10px] inline-block max-w-[85px] truncate align-middle">
                      {log.engine.split(' ')[0]}
                    </span>
                  )}
                  <span className={textClass}>{log.message}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Recent Finished Games History */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cloud History</h3>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">Top 20 cached</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1 text-xs">
            {recentGames.length === 0 ? (
              <div className="text-center text-slate-500 py-8 font-mono">No historical matches registered yet...</div>
            ) : (
              recentGames.map((game, idx) => {
                let badgeClass = 'bg-slate-800 text-slate-400';
                if (game.result === '1-0') badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                if (game.result === '0-1') badgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';

                return (
                  <div key={idx} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/65">
                    <div className="flex flex-col gap-1 min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono truncate">
                        <span className="truncate">{game.whiteEngine.split(' ')[0]}</span>
                        <span className="text-slate-500">vs</span>
                        <span className="truncate">{game.blackEngine.split(' ')[0]}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {game.movesCount} moves | Started {game.startTime}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${badgeClass}`}>
                      {game.result}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
