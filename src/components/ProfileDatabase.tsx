import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Chess } from 'chess.js';
import { 
  User, Shield, Award, Trash2, Play, ChevronRight, ChevronLeft, 
  RotateCcw, Brain, Activity, Target, HelpCircle, Save, 
  Download, LogIn, LogOut, Sun, Moon, Laptop, Eye, CheckCircle2,
  FilePlus, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
import { Chessboard } from './Chessboard';
import { 
  SavedGame, UserProfile, WeaknessAnalysis, getSessionUser, 
  saveSessionUser, loginUser, logoutUser, getSavedGames, 
  saveGame, deleteGame, analyzeWeaknesses 
} from '../lib/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const ProfileDatabase: React.FC = () => {
  // Session states
  const [profile, setProfile] = useState<UserProfile>(getSessionUser());
  const [usernameInput, setUsernameInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');

  // Game list & analysis states
  const [savedGames, setSavedGames] = useState<SavedGame[]>(getSavedGames());
  const [analysis, setAnalysis] = useState<WeaknessAnalysis>(analyzeWeaknesses([], profile));
  const [activeFilter, setActiveFilter] = useState<'all' | 'ai' | 'human' | 'import'>('all');

  const getChartData = () => {
    // Take last 10 games in chronological order (oldest to newest)
    const last10 = [...savedGames]
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-10);

    let currentRating = profile.rating - 100; // start slightly below the current rating to show progress
    if (last10.length === 0) {
      // Historical fallback if there are no games yet
      return [
        { name: 'Game 1', ELO: 1460, Result: 'Loss' },
        { name: 'Game 2', ELO: 1475, Result: 'Win' },
        { name: 'Game 3', ELO: 1472, Result: 'Loss' },
        { name: 'Game 4', ELO: 1488, Result: 'Win' },
        { name: 'Game 5', ELO: 1500, Result: 'Win' },
      ];
    }

    return last10.map((game, idx) => {
      let change = 0;
      let outcome = 'Draw';
      if (game.result === '1-0') {
        change = 16;
        outcome = 'Win';
      } else if (game.result === '0-1') {
        change = -12;
        outcome = 'Loss';
      } else if (game.result === '1/2-1/2') {
        change = 2;
        outcome = 'Draw';
      }
      currentRating += change;
      return {
        name: `G${idx + 1}`,
        ELO: currentRating,
        Result: outcome,
        opponent: game.opponent,
        date: game.date
      };
    });
  };

  // Importer states
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importOpponent, setImportOpponent] = useState('NeuralMate Platform');
  const [importResult, setImportResult] = useState<'1-0' | '0-1' | '1/2-1/2'>('1-0');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Interactive Replayer states
  const [activeReplayGame, setActiveReplayGame] = useState<SavedGame | null>(null);
  const [replayMoveIndex, setReplayMoveIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Theme state
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('AETHERIS_THEME') as 'light' | 'dark' | 'system') || 'dark';
    }
    return 'dark';
  });

  // Load games and run weakness analysis
  useEffect(() => {
    const games = getSavedGames();
    setSavedGames(games);
    setAnalysis(analyzeWeaknesses(games, profile));
  }, [profile]);

  // Handle local user account sign-in
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      setLoginMsg('Please enter a username.');
      return;
    }
    const loggedIn = loginUser(usernameInput, 'password123');
    setProfile(loggedIn);
    setUsernameInput('');
    setIsLoggingIn(false);
    setLoginMsg('');
  };

  const handleLogout = () => {
    logoutUser();
    setProfile(getSessionUser());
  };

  // Replay interval for Autoplay
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && activeReplayGame) {
      interval = setInterval(() => {
        setReplayMoveIndex((prev) => {
          const limit = activeReplayGame.fenHistory 
            ? activeReplayGame.fenHistory.length - 1 
            : activeReplayGame.moves.length - 1;
          if (prev >= limit) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, activeReplayGame]);

  // Load a game into the Replay Engine
  const startReplaying = (game: SavedGame) => {
    setActiveReplayGame(game);
    setReplayMoveIndex(0);
    setIsPlaying(false);
  };

  const nextMove = () => {
    if (activeReplayGame) {
      const limit = activeReplayGame.fenHistory 
        ? activeReplayGame.fenHistory.length - 1 
        : activeReplayGame.moves.length - 1;
      if (replayMoveIndex < limit) {
        setReplayMoveIndex(prev => prev + 1);
      }
    }
  };

  const prevMove = () => {
    if (replayMoveIndex > 0) {
      setReplayMoveIndex(prev => prev - 1);
    }
  };

  const firstMove = () => {
    setReplayMoveIndex(0);
  };

  const lastMove = () => {
    if (activeReplayGame) {
      const limit = activeReplayGame.fenHistory 
        ? activeReplayGame.fenHistory.length - 1 
        : activeReplayGame.moves.length - 1;
      setReplayMoveIndex(limit);
    }
  };

  // Handle game deletion with confirmation
  const handleDelete = (gameId: string) => {
    if (window.confirm('Are you sure you want to delete this game record? This action cannot be undone.')) {
      deleteGame(gameId);
      const updated = getSavedGames();
      setSavedGames(updated);
      setAnalysis(analyzeWeaknesses(updated, profile));
      if (activeReplayGame?.id === gameId) {
        setActiveReplayGame(null);
      }
    }
  };

  // Handle NeuralMate / External Game Imports
  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess('');

    if (!importText.trim()) {
      setImportError('Please paste some Chess moves, a PGN file, or a FEN string.');
      return;
    }

    try {
      const tempChess = new Chess();
      
      // Attempt clean PGN-like tags & moves
      let cleanedText = importText
        .replace(/\[.*?\]/g, '') // remove PGN header tags
        .replace(/\{.*?\}/g, '') // remove comments
        .replace(/\d+\.+\s*/g, ' ') // remove move indicators e.g. "1."
        .replace(/\s+/g, ' ') // normalize whitespace
        .trim();

      const rawMoves = cleanedText.split(' ').filter(m => m.trim().length > 0 && !m.includes('-') && !m.includes('/') && m !== '*');

      if (rawMoves.length === 0) {
        // Detect FEN string
        if (importText.split('/').length >= 5) {
          const parsed = new Chess(importText.trim());
          saveGame({
            date: new Date().toLocaleDateString(),
            opponent: importOpponent.trim() || 'NeuralMate Platform',
            opponentType: 'import',
            timeControl: 'Imported FEN',
            result: '1-0',
            moves: ['Start FEN'],
            fenHistory: [parsed.fen(), parsed.fen()]
          });
          setSavedGames(getSavedGames());
          setImportSuccess('Successfully imported static FEN board layout!');
          setImportText('');
          return;
        }
        throw new Error('Unable to identify valid chess moves or FEN components.');
      }

      const processedFens: string[] = [tempChess.fen()];
      const sanList: string[] = ['Start'];

      for (const move of rawMoves) {
        try {
          const result = tempChess.move(move);
          processedFens.push(tempChess.fen());
          sanList.push(result.san);
        } catch (moveErr) {
          // Keep processing, some might be invalid meta characters or outcome markers (1-0, etc.)
          console.warn(`Ignored raw move: ${move}`);
        }
      }

      if (processedFens.length <= 1) {
        throw new Error('No valid legal chess moves could be played in sequence.');
      }

      saveGame({
        date: new Date().toLocaleDateString(),
        opponent: importOpponent.trim() || 'NeuralMate Platform',
        opponentType: 'import',
        timeControl: 'NeuralMate Match',
        result: importResult,
        moves: sanList,
        fenHistory: processedFens
      });

      setSavedGames(getSavedGames());
      setImportSuccess(`Successfully parsed and saved match with ${sanList.length - 1} moves!`);
      setImportText('');
    } catch (err: any) {
      setImportError(err.message || 'Invalid chess syntax. Please check the move order notation.');
    }
  };

  // Handle Theme Toggling
  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    setActiveTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('AETHERIS_THEME', theme);
      
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
      } else if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      }
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  // Filter games based on selection
  const filteredGames = savedGames.filter(g => {
    if (activeFilter === 'all') return true;
    return g.opponentType === activeFilter;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6" id="profile_database_view">
      
      {/* Dynamic Header & Theme Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl dark:bg-slate-900 dark:border-slate-800 light:bg-white light:border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white light:text-slate-900 flex items-center gap-2">
            <User className="w-6 h-6 text-emerald-400" />
            Personal Profile & Game Vault (個人檔案與複盤庫)
          </h1>
          <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
            Analyze saved PGN games, view training weak points, and customize your visual interface.
          </p>
        </div>

        {/* Theme control center */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850 light:bg-slate-100 light:border-slate-300">
          <button
            onClick={() => applyTheme('light')}
            className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              activeTheme === 'light' 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-400 hover:text-slate-200 light:text-slate-500'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            onClick={() => applyTheme('dark')}
            className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              activeTheme === 'dark' 
                ? 'bg-slate-800 text-emerald-400 shadow-md' 
                : 'text-slate-400 hover:text-slate-200 light:text-slate-500'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            onClick={() => applyTheme('system')}
            className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              activeTheme === 'system' 
                ? 'bg-slate-800 text-slate-100 light:bg-white light:text-slate-900 shadow-md' 
                : 'text-slate-400 hover:text-slate-200 light:text-slate-500'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">System</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Identity & Weaknesses */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Profile Session Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 light:bg-white light:border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                Active Session
              </span>
              {profile.username !== 'Grandmaster Guest' ? (
                <button 
                  onClick={handleLogout}
                  className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              ) : (
                <button 
                  onClick={() => setIsLoggingIn(true)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 animate-pulse" /> Log In
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-3xl shadow-lg border border-emerald-400/20">
                {profile.avatar}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white light:text-slate-900 truncate">{profile.username}</h2>
                <div className="flex items-center gap-1 text-xs text-slate-400 light:text-slate-500 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{profile.title}</span>
                </div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
                  {profile.rating} <span className="text-[11px] font-medium text-slate-500">ELO</span>
                </div>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850 light:bg-slate-50 light:border-slate-200">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 font-mono font-medium">Wins (勝)</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">{profile.wins}</div>
              </div>
              <div className="text-center border-x border-slate-800/80 light:border-slate-200">
                <div className="text-[10px] text-slate-500 font-mono font-medium">Losses (負)</div>
                <div className="text-sm font-bold text-red-400 font-mono">{profile.losses}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 font-mono font-medium">Draws (和)</div>
                <div className="text-sm font-bold text-blue-400 font-mono">{profile.draws}</div>
              </div>
            </div>

            {/* Custom Sign In form */}
            <AnimatePresence>
              {isLoggingIn && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAuth}
                  className="space-y-3 pt-3 border-t border-slate-800 light:border-slate-200 overflow-hidden"
                >
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Sign Up or Login with Username
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Garry_Kasparov"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500 light:bg-white light:border-slate-300 light:text-slate-900"
                    />
                    <button 
                      type="submit" 
                      className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-slate-950 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Submit
                    </button>
                  </div>
                  {loginMsg && <p className="text-[10px] text-red-400 font-mono">{loginMsg}</p>}
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* ELO Trend Line Chart Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 light:bg-white light:border-slate-200">
            <h3 className="text-xs font-bold text-white light:text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              Rating Evolution (積分演變趨勢)
            </h3>
            <p className="text-[11px] text-slate-400 light:text-slate-500">
              Visualizing ELO performance and match trends over the last 10 games using Recharts.
            </p>
            <div className="h-[180px] w-full font-mono text-[9px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ELO" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 3, stroke: '#10b981', strokeWidth: 1.5, fill: '#0f172a' }}
                    activeDot={{ r: 5 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weakness & Strength Analyzer Board */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 light:bg-white light:border-slate-200">
            <h3 className="text-xs font-bold text-white light:text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-emerald-400" />
              Dynamic Weakness Analysis (弱點分析與訓練建議)
            </h3>

            {/* Tactical stats bars */}
            <div className="space-y-3 bg-slate-950/20 p-3 rounded-xl border border-slate-850 light:bg-slate-50 light:border-slate-200">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Tactics Precision (戰術精準度)</span>
                  <span className="font-bold text-emerald-400">{analysis.overallTactics}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analysis.overallTactics}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Positional Defense (陣型防守度)</span>
                  <span className="font-bold text-teal-400">{analysis.overallDefenses}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-400 rounded-full" style={{ width: `${analysis.overallDefenses}%` }} />
                </div>
              </div>
            </div>

            {/* Analysis details cards */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Target className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white light:text-slate-900">Opening Weakness (開局弱點)</h4>
                  <p className="text-[11px] text-slate-400 light:text-slate-500 mt-0.5 leading-relaxed">{analysis.openingsWeakness}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white light:text-slate-900">Endgame technicals (殘局能力)</h4>
                  <p className="text-[11px] text-slate-400 light:text-slate-500 mt-0.5 leading-relaxed">{analysis.endgameWeakness}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white light:text-slate-900">Time Pacing & Speed (時間支配力)</h4>
                  <p className="text-[11px] text-slate-400 light:text-slate-500 mt-0.5 leading-relaxed">{analysis.timeWeakness}</p>
                </div>
              </div>
            </div>

            {/* Bullet suggestions */}
            <div className="space-y-2 pt-3 border-t border-slate-800 light:border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suggested Training (推薦訓練建議)</h4>
              <ul className="space-y-1.5 text-[11px] text-slate-300 light:text-slate-600">
                {analysis.suggestions.map((item, index) => (
                  <li key={index} className="flex gap-1.5 items-start leading-relaxed">
                    <span className="text-emerald-400 font-bold shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Database, Importer, & Replay Board */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Quick NeuralMate Gateway & Match Importer */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 light:bg-white light:border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 light:border-slate-200">
              <h3 className="text-xs font-bold text-white light:text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FilePlus className="w-4 h-4 text-emerald-400" />
                NeuralMate Platform Integration (平台整合及資料匯入)
              </h3>
              <button
                onClick={() => setImportOpen(!importOpen)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${importOpen ? 'rotate-180' : ''} transition-transform`} />
                {importOpen ? 'Hide Importer' : 'Import NeuralMate Game'}
              </button>
            </div>

            {/* Prominent link as requested */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 light:bg-emerald-50 light:border-emerald-200/80">
              <div>
                <h4 className="text-xs font-bold text-white light:text-slate-900">NeuralMate Official Platform</h4>
                <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">
                  Play deep chess, complete chess puzzles, and copy match histories.
                </p>
              </div>
              <a
                href="https://neural-mate-bfbf7301.base44.app/"
                target="_blank"
                referrerPolicy="no-referrer"
                className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-slate-950 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                Go to NeuralMate <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Importer Panel */}
            <AnimatePresence>
              {importOpen && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleImport}
                  className="space-y-4 pt-2 border-t border-slate-850 light:border-slate-200 overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Opponent Name (對手名稱)
                      </label>
                      <input
                        type="text"
                        value={importOpponent}
                        onChange={(e) => setImportOpponent(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500 light:bg-white light:border-slate-300 light:text-slate-900"
                        placeholder="e.g. NeuralMate AI level 5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Match Result (比賽勝負)
                      </label>
                      <select
                        value={importResult}
                        onChange={(e: any) => setImportResult(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-emerald-500 light:bg-white light:border-slate-300 light:text-slate-900 cursor-pointer"
                      >
                        <option value="1-0">White Wins (1-0)</option>
                        <option value="0-1">Black Wins (0-1)</option>
                        <option value="1/2-1/2">Draw (1/2-1/2)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Chess Data - Paste moves, PGN, or FEN (棋局資料)
                    </label>
                    <textarea
                      rows={3}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Paste SAN move sequence (e.g. 'e4 e5 Nf3 Nc6 Bc4 Nf6') or paste PGN or paste board FEN."
                      className="w-full bg-slate-950 border border-slate-850 text-xs p-3 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 light:bg-white light:border-slate-300 light:text-slate-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setImportText(''); setImportError(''); setImportSuccess(''); }}
                      className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs cursor-pointer light:bg-slate-100 light:text-slate-600"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Parse & Save to Vault (匯入儲存)
                    </button>
                  </div>

                  {importError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg flex items-center gap-2 text-xs text-red-400 font-mono">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {importSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center gap-2 text-xs text-emerald-400 font-mono">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{importSuccess}</span>
                    </div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Main Vault Database Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 light:bg-white light:border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Save className="w-4 h-4 text-emerald-400" />
                  Your Saved Game Database (個人棋局資料庫)
                </h3>
                <p className="text-[11px] text-slate-400 light:text-slate-500">
                  Filter, delete, or load historical games to step through moves.
                </p>
              </div>

              {/* Filters */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] light:bg-slate-100 light:border-slate-200">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${activeFilter === 'all' ? 'bg-slate-800 text-emerald-400 light:bg-white light:text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  All ({savedGames.length})
                </button>
                <button
                  onClick={() => setActiveFilter('ai')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${activeFilter === 'ai' ? 'bg-slate-800 text-emerald-400 light:bg-white light:text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Vs AI
                </button>
                <button
                  onClick={() => setActiveFilter('human')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${activeFilter === 'human' ? 'bg-slate-800 text-emerald-400 light:bg-white light:text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Vs Human
                </button>
                <button
                  onClick={() => setActiveFilter('import')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${activeFilter === 'import' ? 'bg-slate-800 text-emerald-400 light:bg-white light:text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Import
                </button>
              </div>
            </div>

            {/* List box */}
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {filteredGames.length === 0 ? (
                <div className="text-center text-slate-500 py-12 font-mono text-xs">
                  No matches in this category. Play chess matches or import some above!
                </div>
              ) : (
                filteredGames.map((game) => {
                  let badge = 'bg-slate-800 text-slate-400';
                  if (game.result === '1-0') badge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                  if (game.result === '0-1') badge = 'bg-red-500/10 text-red-400 border border-red-500/20';
                  if (game.result === '1/2-1/2') badge = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';

                  const isActive = activeReplayGame?.id === game.id;

                  return (
                    <div 
                      key={game.id} 
                      className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                        isActive 
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5' 
                          : 'bg-slate-950/40 border-slate-850 hover:border-slate-800 light:bg-slate-50 light:border-slate-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-4 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white light:text-slate-900 truncate">
                            vs {game.opponent}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${badge}`}>
                            {game.result}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
                          <span>⏱️ {game.timeControl}</span>
                          <span>•</span>
                          <span>♟️ {game.moves.length} plies</span>
                          <span>•</span>
                          <span>📅 {game.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startReplaying(game)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                            isActive 
                              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' 
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white light:bg-slate-200 light:text-slate-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" /> 
                          {isActive ? 'Reviewing' : 'Replay'}
                        </button>
                        <button
                          onClick={() => handleDelete(game.id)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 text-red-400 hover:text-red-300 hover:bg-red-500/5 hover:border-red-500/20 light:bg-white light:border-slate-200 cursor-pointer"
                          title="Delete game record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* INTERACTIVE MOVE-BY-MOVE REPLAYER PANEL */}
          {activeReplayGame ? (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-emerald-500/20 p-5 rounded-2xl shadow-xl space-y-4 light:bg-white light:border-emerald-500/30 text-left"
              id="game_replay_lab"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 light:border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    Move-by-Move Replay Lab (棋局複盤實驗室)
                  </h3>
                  <p className="text-xs font-bold text-white light:text-slate-900 mt-1">
                    vs {activeReplayGame.opponent} ({activeReplayGame.result})
                  </p>
                </div>
                <button
                  onClick={() => setActiveReplayGame(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Close Replayer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Board Box */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[280px]">
                    <Chessboard 
                      fen={activeReplayGame.fenHistory ? activeReplayGame.fenHistory[replayMoveIndex] : activeReplayGame.moves[replayMoveIndex]} 
                      interactive={false} 
                      flipped={false}
                      highlightSquares={[]}
                    />
                  </div>
                </div>

                {/* Controls & Move index panel */}
                <div className="md:col-span-7 space-y-4 flex flex-col justify-between h-full">
                  
                  {/* Status Index */}
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 font-mono text-xs space-y-2 light:bg-slate-50 light:border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Ply:</span>
                      <strong className="text-white light:text-slate-900">
                        {replayMoveIndex} / {(activeReplayGame.fenHistory ? activeReplayGame.fenHistory.length - 1 : activeReplayGame.moves.length - 1)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Move played:</span>
                      <strong className="text-emerald-400">
                        {replayMoveIndex === 0 ? 'Starting Position' : `Move ${Math.ceil(replayMoveIndex / 2)}: ${activeReplayGame.moves[replayMoveIndex] || '---'}`}
                      </strong>
                    </div>
                  </div>

                  {/* Playback Buttons */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={firstMove}
                      disabled={replayMoveIndex === 0}
                      className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none light:bg-slate-200 light:text-slate-700 cursor-pointer"
                      title="First move"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={prevMove}
                      disabled={replayMoveIndex === 0}
                      className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none light:bg-slate-200 light:text-slate-700 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`px-5 py-2.5 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                        isPlaying 
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/10' 
                          : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/10'
                      }`}
                    >
                      <Play className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
                      {isPlaying ? 'Pause Auto' : 'Auto Play'}
                    </button>

                    <button
                      onClick={nextMove}
                      disabled={replayMoveIndex === (activeReplayGame.fenHistory ? activeReplayGame.fenHistory.length - 1 : activeReplayGame.moves.length - 1)}
                      className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none light:bg-slate-200 light:text-slate-700 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={lastMove}
                      disabled={replayMoveIndex === (activeReplayGame.fenHistory ? activeReplayGame.fenHistory.length - 1 : activeReplayGame.moves.length - 1)}
                      className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none light:bg-slate-200 light:text-slate-700 cursor-pointer"
                      title="Final outcome"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Moves Scroller */}
                  <div className="bg-slate-950 p-3 rounded-lg max-h-[85px] overflow-y-auto flex flex-wrap gap-1.5 scrollbar-thin scrollbar-thumb-slate-800 border border-slate-900 light:bg-slate-100 light:border-slate-200">
                    {activeReplayGame.moves.map((move, idx) => {
                      if (idx === 0) return null;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setReplayMoveIndex(idx);
                            setIsPlaying(false);
                          }}
                          className={`px-2 py-1 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                            idx === replayMoveIndex 
                              ? 'bg-emerald-500 text-slate-950 font-bold' 
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 light:bg-white light:text-slate-700'
                          }`}
                        >
                          {idx % 2 !== 0 ? `${Math.ceil(idx / 2)}.W ` : '.B '} 
                          {move}
                        </button>
                      );
                    })}
                  </div>

                </div>

              </div>
            </motion.div>
          ) : (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs light:bg-slate-50/20 light:border-slate-300">
              Select any game in your database history list above to load the interactive Move-by-Move Replay Lab.
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
