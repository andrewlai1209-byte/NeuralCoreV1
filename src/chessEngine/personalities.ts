import { EnginePersonality, EnginePersonalityId } from '../types';

// Standard material values
export const BASE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece Square Tables from White's perspective (mirrored for Black)
export const PST_PAWN = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

export const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

export const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

export const PST_ROOK = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

export const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

export const PST_KING_MIDDLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

export const PST_KING_ENDGAME = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

export const PERSONALITIES: Record<EnginePersonalityId, EnginePersonality> = {
  tactical: {
    id: 'tactical',
    name: 'Tactical Attacker',
    avatar: '🎯',
    description: 'An aggressive engine that prioritizes sharp, complex tactics. It loves sacrificing pieces to launch direct attacks on the enemy king.',
    quote: 'Tactics are 99% of chess. Prepare for an immediate storm!',
    materialWeights: { p: 100, n: 340, b: 350, r: 500, q: 950, k: 20000 },
    pstWeights: 1.5,
    mobilityWeight: 0.35,
    kingSafetyWeight: 0.1,
    pawnStructureWeight: 0.1
  },
  positional: {
    id: 'positional',
    name: 'Positional Grandmaster',
    avatar: '🏛️',
    description: 'A deep, strategic engine that focuses on long-term structural superiority, pawn structure, space control, and slow accumulation of small advantages.',
    quote: 'The style is positional. I construct fortresses and win through squeezing squeeze plays.',
    materialWeights: { p: 100, n: 320, b: 335, r: 510, q: 900, k: 20000 },
    pstWeights: 1.0,
    mobilityWeight: 0.45,
    kingSafetyWeight: 0.6,
    pawnStructureWeight: 0.7
  },
  gambiter: {
    id: 'gambiter',
    name: 'Aggressive Gambiter',
    avatar: '⚔️',
    description: 'Loves open games with rapid piece development. Values piece mobility and rapid attack over material, often sacrificing pawns for initiative.',
    quote: 'Material is an illusion. Tempo is reality! Care to accept my gambit?',
    materialWeights: { p: 85, n: 330, b: 340, r: 500, q: 920, k: 20000 },
    pstWeights: 1.4,
    mobilityWeight: 0.65,
    kingSafetyWeight: 0.25,
    pawnStructureWeight: 0.1
  },
  defensive: {
    id: 'defensive',
    name: 'Cautious Defender',
    avatar: '🛡️',
    description: 'A solid, ultra-resilient engine that emphasizes rock-solid pawn structures, king safety, and prophylaxis. It aims to blunt attacks and capitalize on mistakes.',
    quote: 'Safety first. Once your attack burns out, your structure will collapse.',
    materialWeights: { p: 115, n: 310, b: 320, r: 520, q: 880, k: 20000 },
    pstWeights: 0.8,
    mobilityWeight: 0.2,
    kingSafetyWeight: 0.85,
    pawnStructureWeight: 0.75
  }
};

export const TRAINING_PROFILES: Record<string, { aggression: number; positional: number; mobility: number; kingSafety: number }> = {
  asmfish: { aggression: 0.8, positional: 0.4, mobility: 0.7, kingSafety: 0.6 },
  bootchess: { aggression: 0.5, positional: 0.2, mobility: 0.3, kingSafety: 0.3 },
  critter: { aggression: 0.85, positional: 0.3, mobility: 0.6, kingSafety: 0.4 },
  caissa: { aggression: 0.3, positional: 0.9, mobility: 0.4, kingSafety: 0.7 },
  etherreal: { aggression: 0.5, positional: 0.7, mobility: 0.5, kingSafety: 0.6 },
  fatfriz2: { aggression: 0.9, positional: 0.2, mobility: 0.7, kingSafety: 0.3 },
  igel: { aggression: 0.5, positional: 0.6, mobility: 0.5, kingSafety: 0.6 },
  houdini: { aggression: 0.95, positional: 0.2, mobility: 0.8, kingSafety: 0.3 },
  koivisto: { aggression: 0.6, positional: 0.8, mobility: 0.6, kingSafety: 0.5 },
  minic: { aggression: 0.4, positional: 0.7, mobility: 0.4, kingSafety: 0.6 },
  rubichess: { aggression: 0.3, positional: 0.8, mobility: 0.4, kingSafety: 0.8 },
  seer: { aggression: 0.5, positional: 0.7, mobility: 0.5, kingSafety: 0.5 },
  slowchess: { aggression: 0.2, positional: 0.9, mobility: 0.3, kingSafety: 0.7 },
  xiphos: { aggression: 0.85, positional: 0.3, mobility: 0.7, kingSafety: 0.4 },
  sugar: { aggression: 0.7, positional: 0.5, mobility: 0.6, kingSafety: 0.5 },
};
