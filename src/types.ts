/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EnginePersonalityId = 'tactical' | 'positional' | 'gambiter' | 'defensive';

export interface EnginePersonality {
  id: EnginePersonalityId;
  name: string;
  avatar: string;
  description: string;
  quote: string;
  // Weight multipliers for evaluation
  materialWeights: {
    p: number; // Pawn
    n: number; // Knight
    b: number; // Bishop
    r: number; // Rook
    q: number; // Queen
    k: number; // King
  };
  pstWeights: number; // Piece Square Table weight (0-2)
  mobilityWeight: number; // Mobility weight
  kingSafetyWeight: number; // King safety weight
  pawnStructureWeight: number; // Pawn structure weight
}

export type EvaluationMode = 'traditional' | 'neural' | 'hybrid';

export interface EngineConfig {
  maxDepth: number;
  personality: EnginePersonalityId;
  evalMode: EvaluationMode;
  timeLimitMs?: number;         // Time budget for thinking in milliseconds
  quiescenceLimit?: number;     // Quiescence depth limit to prevent horizon effect
  maxCapturesToCheck?: number;  // Max captures to check in quiescence search
  difficulty?: 'beginner' | 'intermediate' | 'expert' | 'grandmaster';
}

export interface TrainingGame {
  id: string;
  whiteEngine: string;
  blackEngine: string;
  result: '1-0' | '0-1' | '1/2-1/2' | 'ongoing';
  movesCount: number;
  currentFen: string;
  moveHistory: string[];
  evalHistory: number[];
  startTime: string;
}

export interface EloHistoryPoint {
  epoch: number;
  gamesPlayed: number;
  eloTraditional: number;
  eloNeural: number;
  eloHybrid: number;
}

export interface LossMetricPoint {
  epoch: number;
  policyLoss: number;
  valueLoss: number;
  accuracy: number;
}

export interface TrainingSummary {
  totalGames: number;
  winRate: number; // percentage
  drawRate: number; // percentage
  lossRate: number; // percentage
  currentElo: number;
  policyLoss: number;
  valueLoss: number;
  trainSpeed: number; // steps/sec
  gamesInCloud: number;
  recentGames: TrainingGame[];
}

export interface LiveAnalysisData {
  depth: number;
  selDepth: number;
  nodes: number;
  nps: number; // nodes per second
  score: number; // centipawns (+ is white, - is black)
  mateIn?: number; // moves to mate if detected
  pv: string[]; // principal variation (best line)
  commentary?: string; // Gemini-generated positional commentary
  isAnalyzing: boolean;
}
