import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { EngineConfig } from '../types';
import { Cpu } from 'lucide-react';

interface EngineDuelArenaProps {
  config1: EngineConfig;
  config2: EngineConfig;
}

export const EngineDuelArena: React.FC<EngineDuelArenaProps> = ({ config1, config2 }) => {
  // Simple duel state
  const [chess, setChess] = useState(new Chess());
  const [history, setHistory] = useState<any[]>([]);
  
  // Placeholder for win probability curves
  const [probs, setProbs] = useState<{turn: number, p1: number, p2: number}[]>([]);

  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      <div className="bg-slate-900 p-4 rounded-xl">
        <h3 className="text-emerald-400 font-bold mb-2">Engine 1 ({config1.evalMode})</h3>
        <Chessboard fen={chess.fen()} interactive={false} />
      </div>
      <div className="bg-slate-900 p-4 rounded-xl">
        <h3 className="text-amber-400 font-bold mb-2">Engine 2 ({config2.evalMode})</h3>
        <Chessboard fen={chess.fen()} interactive={false} />
      </div>
      
      <div className="col-span-2 bg-slate-950 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Cpu className="text-indigo-400"/>
            Real-time Win Probability Duel
        </h3>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={probs}>
                    <XAxis dataKey="turn" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="p1" stroke="#34d399" />
                    <Line type="monotone" dataKey="p2" stroke="#fbbf24" />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
