/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameArena } from './components/GameArena';
import { GlobalArena } from './components/GlobalArena';
import { LiveAnalysis } from './components/LiveAnalysis';
import { EngineDeveloperPortal } from './components/EngineDeveloperPortal';
import { ProfileDatabase } from './components/ProfileDatabase';
import { 
  Cpu, Zap, Activity, BrainCircuit, Code, Terminal, Menu, X, Play, Pause, 
  HelpCircle, Globe, User, Contrast, Volume2, VolumeX, Gauge, Database, 
  AlertTriangle, Download, Copy, Check, TrendingUp, BarChart2, ArrowUp, ArrowDown, Minus, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from './SoundContext';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, LineChart, Line, ReferenceArea
} from 'recharts';

type ViewId = 'dashboard' | 'game' | 'global' | 'analysis' | 'developer' | 'profile';

export default function App() {
  const { soundEnabled, setSoundEnabled, playMoveSound } = useSound();
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'neural-dark' | 'high-contrast'>(() => {
    const saved = localStorage.getItem('AETHERIS_THEME');
    return (saved === 'high-contrast') ? 'high-contrast' : 'neural-dark';
  });
  const [showToast, setShowToast] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [simulateStress, setSimulateStress] = useState(false);
  const [copied, setCopied] = useState(false);

  // Custom alert thresholds
  const [cpuThreshold, setCpuThreshold] = useState<number>(80);
  const [latencyThreshold, setLatencyThreshold] = useState<number>(25);

  // Telemetry chart zoom states
  const [zoomData, setZoomData] = useState<Array<{ time: string; cpu: number; latency: number; nps: number; ram: number }> | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);

  const [perfMetrics, setPerfMetrics] = useState({
    cpu: 62,
    latency: 14,
    nps: 1.48, // Million Nodes Per Second
    ram: 4.2 // GB
  });

  const [metricsHistory, setMetricsHistory] = useState<Array<{ time: string; cpu: number; latency: number; nps: number; ram: number }>>(() => {
    // Generate initial 60 seconds history (30 points, every 2s)
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(Date.now() - (30 - i) * 2000);
      const timeStr = d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return {
        time: timeStr,
        cpu: Math.floor(Math.random() * 20) + 48,
        latency: Math.floor(Math.random() * 6) + 11,
        nps: Number((Math.random() * 0.3 + 1.35).toFixed(2)),
        ram: Number((Math.random() * 0.2 + 4.1).toFixed(2))
      };
    });
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPerfMetrics(prev => {
        let cpuDelta = Math.floor((Math.random() - 0.5) * 10);
        let latDelta = Math.floor((Math.random() - 0.5) * 4);
        
        let targetCpu = prev.cpu + cpuDelta;
        let targetLat = prev.latency + latDelta;
        
        if (simulateStress) {
          // Force dangerous thresholds (CPU >= 80, Latency >= 25)
          targetCpu = Math.max(81, Math.min(97, prev.cpu + Math.floor(Math.random() * 8)));
          targetLat = Math.max(26, Math.min(36, prev.latency + Math.floor(Math.random() * 3)));
        } else {
          targetCpu = Math.max(35, Math.min(78, targetCpu)); // Keep safe during normal mode
          targetLat = Math.max(8, Math.min(23, targetLat));
        }

        const npsDelta = Number(((Math.random() - 0.5) * 0.15).toFixed(2));
        const ramDelta = Number(((Math.random() - 0.5) * 0.05).toFixed(2));

        const nextNps = Number(Math.max(1.10, Math.min(1.95, prev.nps + npsDelta)).toFixed(2));
        const nextRam = Number(Math.max(3.8, Math.min(4.8, prev.ram + ramDelta)).toFixed(2));

        const nextMetric = {
          cpu: targetCpu,
          latency: targetLat,
          nps: nextNps,
          ram: nextRam
        };

        // Append to history
        setMetricsHistory(history => {
          const d = new Date();
          const timeStr = d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const newPoint = {
            time: timeStr,
            cpu: nextMetric.cpu,
            latency: nextMetric.latency,
            nps: nextMetric.nps,
            ram: nextMetric.ram
          };
          const nextHistory = [...history, newPoint];
          if (nextHistory.length > 30) {
            nextHistory.shift();
          }
          return nextHistory;
        });

        return nextMetric;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [simulateStress]);

  const handleCopyTelemetry = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      node: "Cloud Run #1",
      quantization: "FP16-QUANTIZED",
      current: perfMetrics,
      simulated_stress_mode: simulateStress,
      cpu_threshold: cpuThreshold,
      latency_threshold: latencyThreshold,
      recent_60s_history: metricsHistory
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy telemetry payload', err);
      });
  };

  const handleExportTelemetryJSON = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      node: "Cloud Run #1",
      quantization: "FP16-QUANTIZED",
      current: perfMetrics,
      simulated_stress_mode: simulateStress,
      cpu_threshold: cpuThreshold,
      latency_threshold: latencyThreshold,
      recent_60s_history: metricsHistory
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aetheris_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadSessionLogs = () => {
    let logText = `===========================================================\n`;
    logText += `AETHERIS ENGINE NEURAL CLUSTER DIAGNOSTICS LOG\n`;
    logText += `Generated: ${new Date().toLocaleString()}\n`;
    logText += `Node ID: Cloud Run #1\n`;
    logText += `Quantization Profile: FP16-QUANTIZED\n`;
    logText += `Simulated Load Stress: ${simulateStress ? 'ENABLED (⚠️ STRESS TEST)' : 'DISABLED (NORMAL)'}\n`;
    logText += `Current Alerts Config: CPU Threshold: ${cpuThreshold}%, Latency Threshold: ${latencyThreshold}ms\n`;
    logText += `===========================================================\n\n`;
    logText += `[LIVE CURRENT METRICS]\n`;
    logText += `- CPU Utilization: ${perfMetrics.cpu}%  (Status: ${perfMetrics.cpu >= cpuThreshold ? 'WARNING - LIMIT EXCEEDED' : 'OK'})\n`;
    logText += `- System Latency: ${perfMetrics.latency}ms  (Status: ${perfMetrics.latency >= latencyThreshold ? 'WARNING - LIMIT EXCEEDED' : 'OK'})\n`;
    logText += `- Search Speed: ${perfMetrics.nps} M NPS\n`;
    logText += `- Memory RAM: ${perfMetrics.ram} GB\n\n`;
    logText += `[HISTORICAL TIMELINE (LAST 60 SECONDS)]\n`;
    logText += `-----------------------------------------------------------\n`;
    logText += `Timestamp | CPU (%) | Latency (ms) | Speed (M NPS) | RAM (GB) | Status\n`;
    logText += `-----------------------------------------------------------\n`;
    
    metricsHistory.forEach(point => {
      const isCpuWarn = point.cpu >= cpuThreshold;
      const isLatWarn = point.latency >= latencyThreshold;
      let status = 'OPTIMAL';
      if (isCpuWarn && isLatWarn) {
        status = '⚠️ OVERLOAD (CPU & LATENCY)';
      } else if (isCpuWarn) {
        status = '⚠️ CPU HIGH';
      } else if (isLatWarn) {
        status = '⚠️ LATENCY HIGH';
      }
      
      logText += `${point.time}  | ${String(point.cpu).padStart(7)} | ${String(point.latency).padStart(12)} | ${String(point.nps).padStart(13)} | ${String(point.ram).padStart(8)} | ${status}\n`;
    });
    
    logText += `-----------------------------------------------------------\n`;
    logText += `[END OF LOG FILE]\n`;

    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `aetheris_diagnostics_${Date.now()}.log`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const getTrendEvaluation = () => {
    if (metricsHistory.length < 5) return { text: 'STABLE', direction: 'stable' };
    const last5 = metricsHistory.slice(-5);
    
    const firstCpu = last5[0].cpu;
    const lastCpu = last5[4].cpu;
    const firstLat = last5[0].latency;
    const lastLat = last5[4].latency;
    
    const cpuChange = lastCpu - firstCpu;
    const latChange = lastLat - firstLat;
    const weightedChange = cpuChange * 0.5 + latChange * 1.5;
    
    if (weightedChange > 3) {
      return { text: 'SPIKING', direction: 'up' };
    } else if (weightedChange < -3) {
      return { text: 'COOLING', direction: 'down' };
    } else {
      return { text: 'STABLE', direction: 'stable' };
    }
  };

  // Recharts zoom interactions
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
    }
  };

  const handleMouseMove = (e: any) => {
    if (refAreaLeft && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      const leftIndex = metricsHistory.findIndex(d => d.time === refAreaLeft);
      const rightIndex = metricsHistory.findIndex(d => d.time === refAreaRight);
      if (leftIndex !== -1 && rightIndex !== -1) {
        const start = Math.min(leftIndex, rightIndex);
        const end = Math.max(leftIndex, rightIndex);
        if (end - start >= 2) {
          const sliced = metricsHistory.slice(start, end + 1);
          setZoomData(sliced);
        }
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const handleResetZoom = () => {
    setZoomData(null);
  };

  const menuItems = [
    { id: 'dashboard', name: 'Cloud Arena & Dashboard', icon: Activity, desc: 'Live cloud training & selfplay telemetry' },
    { id: 'game', name: 'Vs Engine Arena', icon: Zap, desc: 'Play interactive matches vs AI personalities' },
    { id: 'global', name: 'Global Live Arena', icon: Globe, desc: 'Match with players & train local AI engine' },
    { id: 'analysis', name: 'Live Analysis Lab', icon: BrainCircuit, desc: 'Free play board & Gemini positional commentary' },
    { id: 'profile', name: 'My Profile & Vault DB', icon: User, desc: 'Personal stats, weaknesses, & PGN database' },
    { id: 'developer', name: 'Open-Source Code & Dev Portal', icon: Code, desc: 'Export C++, Python, and Javascript sources' },
  ] as const;

  // Manage theme CSS variables and document classes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'high-contrast') {
      root.classList.add('high-contrast');
      root.style.setProperty('--bg-main', '#000000');
      root.style.setProperty('--bg-card', '#000000');
      root.style.setProperty('--border-color', '#ffffff');
      root.style.setProperty('--text-main', '#ffffff');
      root.style.setProperty('--text-muted', '#f8fafc');
      root.style.setProperty('--accent-color', '#ffff00');
    } else {
      root.classList.remove('high-contrast');
      root.style.setProperty('--bg-main', '#020617');
      root.style.setProperty('--bg-card', '#0f172a');
      root.style.setProperty('--border-color', '#1e293b');
      root.style.setProperty('--text-main', '#f1f5f9');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--accent-color', '#10b981');
    }
    localStorage.setItem('AETHERIS_THEME', theme);
  }, [theme]);

  // Toast notification trigger on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowToast(true);
    }, 1200);

    const autoHide = setTimeout(() => {
      setShowToast(false);
    }, 6200);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHide);
    };
  }, []);

  // Global keyboard navigation shortcuts ('1' - '6')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl instanceof HTMLElement && activeEl.isContentEditable)
        )
      ) {
        return;
      }

      if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0 && index < menuItems.length) {
          e.preventDefault();
          setActiveView(menuItems[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuItems]);

  return (
    <div id="app_root" className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row antialiased">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
        {/* Branding header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Cpu className="w-5 h-5 text-slate-950 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">Aetheris Chess</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-mono font-medium">v3.0.0-neural</span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveView(item.id);
                  playMoveSound('move');
                }}
                className={`
                  w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3.5 group cursor-pointer
                  ${isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 shadow-md shadow-emerald-500/5' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850 border border-transparent'}
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div className="min-w-0">
                  <div className="text-xs">{item.name}</div>
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Theme & Sound Toggle Buttons (Desktop) */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/10 flex flex-col gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setTheme(prev => prev === 'neural-dark' ? 'high-contrast' : 'neural-dark');
              playMoveSound('engine');
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/50 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Contrast className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Theme</span>
            </div>
            <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-emerald-400 font-mono">
              {theme === 'neural-dark' ? 'Neural Dark' : 'High Contrast'}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const nextVal = !soundEnabled;
              setSoundEnabled(nextVal);
              if (nextVal) {
                setTimeout(() => playMoveSound('engine'), 50);
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/50 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>SFX Audio</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${soundEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-950 text-slate-500'}`}>
              {soundEnabled ? 'Enabled' : 'Muted'}
            </span>
          </motion.button>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 font-mono text-[9px] text-slate-500 space-y-1">
          <div className="flex justify-between"><span>Compute Node:</span> <span className="text-slate-400 font-bold">Cloud Run #1</span></div>
          <div className="flex justify-between"><span>UCI Engine Status:</span> <span className="text-emerald-400 font-bold">READY</span></div>
        </div>
      </aside>

      {/* MOBILE HEADER & TABS BAR */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 sticky top-0 z-50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Cpu className="w-4.5 h-4.5 text-slate-950 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white leading-tight">Aetheris Chess</h1>
            <span className="text-[9px] text-slate-400 font-mono">v3.0.0-neural</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-slate-950/95 backdrop-blur-md z-40 p-4 border-b border-slate-800 flex flex-col justify-between">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                    playMoveSound('move');
                  }}
                  className={`
                    w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3.5 cursor-pointer
                    ${isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'}
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-xs">{item.name}</span>
                </motion.button>
              );
            })}
          </nav>

          <div className="space-y-3">
            {/* Mobile Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setTheme(prev => prev === 'neural-dark' ? 'high-contrast' : 'neural-dark');
                playMoveSound('engine');
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 transition-all border border-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Contrast className="w-4 h-4 text-emerald-400" />
                <span>Active Theme</span>
              </div>
              <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-emerald-400 font-mono">
                {theme === 'neural-dark' ? 'Neural Dark' : 'High Contrast'}
              </span>
            </motion.button>

            {/* Mobile Sound Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const nextVal = !soundEnabled;
                setSoundEnabled(nextVal);
                if (nextVal) {
                  setTimeout(() => playMoveSound('engine'), 50);
                }
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 transition-all border border-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <span>SFX Audio</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${soundEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-950 text-slate-500'}`}>
                {soundEnabled ? 'Enabled' : 'Muted'}
              </span>
            </motion.button>
            
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[9px] text-slate-500 space-y-1">
              <div className="flex justify-between"><span>Compute Node:</span> <span className="text-slate-400 font-bold">Cloud Run</span></div>
              <div className="flex justify-between"><span>UCI Engine Status:</span> <span className="text-emerald-400 font-bold">READY</span></div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT CANVAS */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950 min-h-[calc(100vh-65px)] md:min-h-screen">
        <div className="flex-1 pb-12">
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'game' && <GameArena />}
          {activeView === 'global' && <GlobalArena />}
          {activeView === 'analysis' && <LiveAnalysis />}
          {activeView === 'developer' && <EngineDeveloperPortal />}
          {activeView === 'profile' && <ProfileDatabase />}
        </div>

        {/* PERSISTENT PERFORMANCE MONITORING PANEL */}
        <footer className="bg-slate-950/95 backdrop-blur-sm border-t border-slate-900 px-4 py-3 text-[11px] text-slate-400 select-none shrink-0 font-mono">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Engine Status / Mode & Alarm */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="text-slate-300 font-bold tracking-wider text-[10px]">AETHERIS CLOUD TELEMETRY:</span>
              <span className="text-[9px] bg-slate-900 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded uppercase font-bold">
                Active Neural Node
              </span>

              {/* Dynamic Warning Indicator if safe limits exceeded */}
              {(perfMetrics.cpu >= cpuThreshold || perfMetrics.latency >= latencyThreshold) && (
                <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded text-[9px] font-bold animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>LIMIT EXCEEDED: {perfMetrics.cpu >= cpuThreshold ? 'CPU HIGH' : ''} {perfMetrics.cpu >= cpuThreshold && perfMetrics.latency >= latencyThreshold ? '&' : ''} {perfMetrics.latency >= latencyThreshold ? 'LATENCY HIGH' : ''}</span>
                </div>
              )}
            </div>

            {/* Real-time Metrics Grid */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              
              {/* CPU Metric with alert styling */}
              <div className="flex items-center gap-2">
                <Cpu className={`w-3.5 h-3.5 ${perfMetrics.cpu >= cpuThreshold ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-slate-500">CPU:</span>
                <span className={`font-bold min-w-[32px] transition-colors ${perfMetrics.cpu >= cpuThreshold ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>{perfMetrics.cpu}%</span>
                <div className="w-12 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shrink-0">
                  <motion.div 
                    animate={{ width: `${perfMetrics.cpu}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full transition-colors ${perfMetrics.cpu >= cpuThreshold ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500/80'}`}
                  />
                </div>
              </div>

              {/* Latency Metric with alert styling */}
              <div className="flex items-center gap-2">
                <Zap className={`w-3.5 h-3.5 ${perfMetrics.latency >= latencyThreshold ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-slate-500">Latency:</span>
                <span className={`font-bold min-w-[28px] transition-colors ${perfMetrics.latency >= latencyThreshold ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>{perfMetrics.latency}ms</span>
                <span className={`text-[8px] px-1 py-0.2 rounded font-semibold transition-all ${
                  perfMetrics.latency >= latencyThreshold 
                    ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' 
                    : perfMetrics.latency < 15 
                    ? 'text-emerald-400 bg-emerald-500/5' 
                    : 'text-amber-400 bg-amber-500/5'
                }`}>
                  {perfMetrics.latency >= latencyThreshold ? 'LIMIT EXCEEDED' : perfMetrics.latency < 15 ? 'EXCELLENT' : 'OPTIMAL'}
                </span>
              </div>

              {/* Nodes Per Second Metric */}
              <div className="flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Speed:</span>
                <span className="text-slate-200 font-bold">{perfMetrics.nps}M NPS</span>
              </div>

              {/* Memory Allocation */}
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Memory:</span>
                <span className="text-slate-200 font-bold">{perfMetrics.ram} GB</span>
              </div>

            </div>

            {/* Actions Panel (Copy, Export, Telemetry view) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTelemetry}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                title="Copy Telemetry to Clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-bold px-0.5">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline">Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportTelemetryJSON}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                title="Export Telemetry as JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Export</span>
              </button>

              <button
                onClick={handleDownloadSessionLogs}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                title="Download Session Logs (.log)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Download Logs</span>
              </button>

              <button
                onClick={() => {
                  setIsTelemetryOpen(true);
                  playMoveSound('engine');
                }}
                className="p-1.5 px-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer font-bold font-sans text-[10px]"
                title="Open Telemetry Analytics"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Diagnostics</span>
              </button>
            </div>

          </div>
        </footer>
      </main>

      {/* EXPANDABLE TELEMETRY MODAL / SIDE-PANEL */}
      <AnimatePresence>
        {isTelemetryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-6 font-sans relative overflow-hidden"
              id="telemetry_modal_container"
            >
              {/* Top ambient glow decoration */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
              
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      Deep-Learning Cluster Telemetry
                      <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded font-normal">Active Session</span>
                    </h2>
                    <p className="text-xs text-slate-400">Real-time performance diagnostics over the last 60 seconds (sampling rate: 2000ms)</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsTelemetryOpen(false);
                    playMoveSound('move');
                  }}
                  className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Close Console"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status & Simulation Switchers Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 font-mono text-xs">
                {/* Simulated Stress Switch */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-300 font-bold">Simulated Load Stress</span>
                    <span className="text-[10px] text-slate-500">Artificially force overload thresholds</span>
                  </div>
                  <button
                    onClick={() => {
                      setSimulateStress(!simulateStress);
                      playMoveSound('engine');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-sans text-[10px] font-bold transition-all cursor-pointer ${
                      simulateStress 
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {simulateStress ? 'STRESS ON ⚠️' : 'NORMAL'}
                  </button>
                </div>

                {/* Adjust Thresholds Section */}
                <div className="flex flex-col gap-2 border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-4">
                  <span className="text-slate-300 font-bold">Adjust Thresholds</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[10px]">CPU Limit:</span>
                      <input 
                        type="number"
                        min="1"
                        max="100"
                        value={cpuThreshold}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 0));
                          setCpuThreshold(val);
                        }}
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[11px] font-bold font-mono focus:outline-none focus:border-emerald-500 text-center"
                      />
                      <span className="text-slate-500 text-[10px]">%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[10px]">Latency Limit:</span>
                      <input 
                        type="number"
                        min="1"
                        max="200"
                        value={latencyThreshold}
                        onChange={(e) => {
                          const val = Math.min(200, Math.max(1, parseInt(e.target.value) || 0));
                          setLatencyThreshold(val);
                        }}
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[11px] font-bold font-mono focus:outline-none focus:border-emerald-500 text-center"
                      />
                      <span className="text-slate-500 text-[10px]">ms</span>
                    </div>
                  </div>
                </div>

                {/* Live Diagnostic */}
                <div className="flex items-center justify-between border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-4">
                  <div className="flex flex-col">
                    <span className="text-slate-400">Diagnostic Status:</span>
                    <span className="text-slate-400">Trend Evaluation:</span>
                  </div>
                  <div className="text-right font-bold flex flex-col items-end">
                    <span className={(perfMetrics.cpu >= cpuThreshold || perfMetrics.latency >= latencyThreshold) ? 'text-rose-400 animate-pulse font-bold' : 'text-emerald-400 font-bold'}>
                      {(perfMetrics.cpu >= cpuThreshold || perfMetrics.latency >= latencyThreshold) ? 'CRITICAL WARN' : 'SAFE / OPTIMAL'}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[10px] uppercase ${
                        getTrendEvaluation().direction === 'up' ? 'text-rose-400 font-bold' :
                        getTrendEvaluation().direction === 'down' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                      }`}>
                        {getTrendEvaluation().text}
                      </span>
                      {getTrendEvaluation().direction === 'up' && <ArrowUp className="w-3.5 h-3.5 text-rose-400 animate-bounce" />}
                      {getTrendEvaluation().direction === 'down' && <ArrowDown className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />}
                      {getTrendEvaluation().direction === 'stable' && <Minus className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* The Recharts Line Chart Container */}
              <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800/60 min-h-[300px] flex flex-col justify-between select-none">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      Telemetry Analytics Timeline {zoomData ? '(ZOOMED VIEW - DRAG SELECT RANGE)' : '(LIVE STREAM)'}
                    </span>
                    {zoomData && (
                      <button
                        onClick={handleResetZoom}
                        className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold font-sans transition-all cursor-pointer animate-pulse"
                      >
                        Reset Zoom
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> CPU (%)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> Latency (ms)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Speed (M NPS)</span>
                  </div>
                </div>

                <div className="w-full h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={zoomData || metricsHistory} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#475569" 
                        fontSize={9} 
                        tickLine={false} 
                        fontFamily="monospace"
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={9} 
                        tickLine={false} 
                        fontFamily="monospace"
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cpu" 
                        name="CPU %" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="latency" 
                        name="Latency (ms)" 
                        stroke="#f59e0b" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="nps" 
                        name="Speed (M NPS)" 
                        stroke="#38bdf8" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      {refAreaLeft && refAreaRight ? (
                        <ReferenceArea x1={refAreaLeft} x2={refAreaRight} {...({ fill: "#10b981", fillOpacity: 0.15 } as any)} />
                      ) : null}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Modal Action Controls footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono">
                  Quantization Parameter: 16-bit Floating Point Model Core.
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyTelemetry}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all text-xs font-medium font-mono flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Telemetry Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Diagnostics JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportTelemetryJSON}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Telemetry (JSON)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subtle Toast Notification on App Load */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 border border-emerald-500/30 p-4 pb-5 rounded-xl shadow-xl shadow-emerald-500/5 max-w-sm overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Cpu className="w-4.5 h-4.5 text-emerald-400 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white">System Initialized</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">Aetheris Engine v3.0.0-neural</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Progress Bar Visual Countdown Indicator */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-1 bg-emerald-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
