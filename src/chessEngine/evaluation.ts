import { Chess } from 'chess.js';
import { EngineConfig } from '../types';
import { 
  convertToBitboards, 
  popCount, 
  FILE_MASKS, 
  CENTER_CORE_MASK, 
  CENTER_EXTENDED_MASK, 
  PASSED_PAWN_WHITE_MASKS, 
  PASSED_PAWN_BLACK_MASKS, 
  KING_SHIELD_WHITE_MASKS, 
  KING_SHIELD_BLACK_MASKS 
} from '../lib/bitboard';
import { 
  BASE_VALUES, 
  PERSONALITIES, 
  PST_PAWN, 
  PST_KNIGHT, 
  PST_BISHOP, 
  PST_ROOK, 
  PST_QUEEN, 
  PST_KING_MIDDLE, 
  PST_KING_ENDGAME 
} from './personalities';

function getStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const popLSB = (bb: bigint): { sq: number; bb: bigint } => {
  if (bb === 0n) return { sq: -1, bb: 0n };
  const lsb = bb & -bb;
  const sq = lsb.toString(2).length - 1;
  return { sq, bb: bb & (bb - 1n) };
};

/**
 * High-performance NNUE-like evaluator relying solely on bitboards
 */
export function evaluateNNUE(chess: Chess): number {
  const bb = convertToBitboards(chess);
  let score = 0;
  
  // Weights (mimicking a single-layer neural network / linear model)
  const W_MATERIAL = { p: 100, n: 320, b: 330, r: 500, q: 900 };
  const W_PST_CENTER = 15;
  const W_PST_EXTENDED = 5;
  const W_KING_SHELTER = 20;
  const W_PASSED_PAWN = 25;
  const W_ROOK_OPEN_FILE = 18;

  // 1. Material
  score += popCount(bb.wp) * W_MATERIAL.p;
  score += popCount(bb.wn) * W_MATERIAL.n;
  score += popCount(bb.wb) * W_MATERIAL.b;
  score += popCount(bb.wr) * W_MATERIAL.r;
  score += popCount(bb.wq) * W_MATERIAL.q;

  score -= popCount(bb.bp) * W_MATERIAL.p;
  score -= popCount(bb.bn) * W_MATERIAL.n;
  score -= popCount(bb.bb) * W_MATERIAL.b;
  score -= popCount(bb.br) * W_MATERIAL.r;
  score -= popCount(bb.bq) * W_MATERIAL.q;

  // 2. Center Control
  const whiteCenter = popCount(bb.whitePieces & CENTER_CORE_MASK);
  const blackCenter = popCount(bb.blackPieces & CENTER_CORE_MASK);
  score += (whiteCenter - blackCenter) * W_PST_CENTER;

  const whiteExtCenter = popCount(bb.whitePieces & CENTER_EXTENDED_MASK);
  const blackExtCenter = popCount(bb.blackPieces & CENTER_EXTENDED_MASK);
  score += (whiteExtCenter - blackExtCenter) * W_PST_EXTENDED;

  // 3. Passed Pawns
  let wp = bb.wp;
  while (wp !== 0n) {
    const { sq, bb: nextWp } = popLSB(wp);
    wp = nextWp;
    if ((bb.bp & PASSED_PAWN_WHITE_MASKS[sq]) === 0n) {
      const rank = Math.floor(sq / 8);
      score += W_PASSED_PAWN + (7 - rank) * 10;
    }
  }

  let bp = bb.bp;
  while (bp !== 0n) {
    const { sq, bb: nextBp } = popLSB(bp);
    bp = nextBp;
    if ((bb.wp & PASSED_PAWN_BLACK_MASKS[sq]) === 0n) {
      const rank = Math.floor(sq / 8);
      score -= W_PASSED_PAWN + rank * 10;
    }
  }

  // 4. King Safety (Shelter)
  const wkSq = popLSB(bb.wk).sq;
  if (wkSq !== -1) {
    const wkShield = KING_SHIELD_WHITE_MASKS[wkSq];
    const shieldPawns = popCount(bb.wp & wkShield);
    score += shieldPawns * W_KING_SHELTER;
  }

  const bkSq = popLSB(bb.bk).sq;
  if (bkSq !== -1) {
    const bkShield = KING_SHIELD_BLACK_MASKS[bkSq];
    const shieldPawns = popCount(bb.bp & bkShield);
    score -= shieldPawns * W_KING_SHELTER;
  }

  // 5. Rooks on open files
  let wr = bb.wr;
  while (wr !== 0n) {
    const { sq, bb: nextWr } = popLSB(wr);
    wr = nextWr;
    const file = sq % 8;
    if ((bb.wp & FILE_MASKS[file]) === 0n) {
      score += W_ROOK_OPEN_FILE;
      if ((bb.bp & FILE_MASKS[file]) === 0n) score += 10; // fully open
    }
  }

  let br = bb.br;
  while (br !== 0n) {
    const { sq, bb: nextBr } = popLSB(br);
    br = nextBr;
    const file = sq % 8;
    if ((bb.bp & FILE_MASKS[file]) === 0n) {
      score -= W_ROOK_OPEN_FILE;
      if ((bb.wp & FILE_MASKS[file]) === 0n) score -= 10;
    }
  }

  return score;
}

/**
 * Evaluates a position from White's perspective
 */
export function evaluate(chess: Chess, config: EngineConfig, trainingProgress: number = 0.5): number {
  if (config.evalMode === 'stockfish_nnue') {
    return evaluateNNUE(chess);
  }
  
  if (config.evalMode === 'pantheon_fusion') {
    const nnueVal = evaluateNNUE(chess);
    const prevMode = config.evalMode;
    config.evalMode = 'hybrid'; 
    const hybridVal = evaluate(chess, config, trainingProgress);
    config.evalMode = prevMode; 
    return Math.round(0.4 * nnueVal + 0.6 * hybridVal);
  }

  const bb = convertToBitboards(chess);

  const whiteQueens = popCount(bb.wq);
  const blackQueens = popCount(bb.bq);
  const whiteRooks = popCount(bb.wr);
  const blackRooks = popCount(bb.br);
  const whiteBishops = popCount(bb.wb);
  const blackBishops = popCount(bb.bb);
  const whiteKnights = popCount(bb.wn);
  const blackKnights = popCount(bb.bn);

  const nonPawnMaterial = 
    (whiteQueens + blackQueens) * 900 + 
    (whiteRooks + blackRooks) * 500 + 
    (whiteBishops + blackBishops) * 330 + 
    (whiteKnights + blackKnights) * 320;

  const phase = Math.min(1.0, nonPawnMaterial / 6400);
  const personality = PERSONALITIES[config.personality] || PERSONALITIES.positional;
  let score = 0;

  let trainedAdjustments: any = null;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('AETHERIS_TRAINED_WEIGHTS');
      if (stored) trainedAdjustments = JSON.parse(stored);
    } catch (e) {}
  }

  const getMaterialValue = (type: string): number => {
    let matVal = personality.materialWeights[type as keyof typeof personality.materialWeights] || BASE_VALUES[type as keyof typeof BASE_VALUES];
    if (config.customWeights && config.customWeights[type as 'p' | 'n' | 'b' | 'r' | 'q' | 'k'] !== undefined) {
      matVal = config.customWeights[type as 'p' | 'n' | 'b' | 'r' | 'q' | 'k']!;
    }
    if (trainedAdjustments && trainedAdjustments.materialWeights && trainedAdjustments.materialWeights[type] !== undefined) {
      matVal = matVal * (1 + trainedAdjustments.materialWeights[type]);
    }
    return matVal;
  };

  let pstWeight = personality.pstWeights;
  if (config.customWeights && config.customWeights.pstWeights !== undefined) pstWeight = config.customWeights.pstWeights;
  if (trainedAdjustments && trainedAdjustments.pstMultiplier !== undefined) pstWeight *= trainedAdjustments.pstMultiplier;
  if (config.difficulty === 'beginner') pstWeight = 0.1;
  else if (config.difficulty === 'intermediate') pstWeight *= 0.5;

  const getPstAndMaterialScore = (pieceBb: bigint, pst: number[][], type: string, sign: number): number => {
    let bbScore = 0;
    let temp = pieceBb;
    const baseValue = getMaterialValue(type);
    while (temp > 0n) {
      const lsb = temp & -temp;
      const idx = lsb.toString(2).length - 1;
      const file = idx & 7;
      const rank = idx >> 3;
      const rIdx = sign === 1 ? 7 - rank : rank;
      const cIdx = sign === 1 ? file : 7 - file;
      bbScore += sign * (baseValue + pst[rIdx][cIdx] * pstWeight);
      temp &= temp - 1n;
    }
    return bbScore;
  };

  score += getPstAndMaterialScore(bb.wp, PST_PAWN, 'p', 1);
  score += getPstAndMaterialScore(bb.wn, PST_KNIGHT, 'n', 1);
  score += getPstAndMaterialScore(bb.wb, PST_BISHOP, 'b', 1);
  score += getPstAndMaterialScore(bb.wr, PST_ROOK, 'r', 1);
  score += getPstAndMaterialScore(bb.wq, PST_QUEEN, 'q', 1);

  let wkTemp = bb.wk;
  while (wkTemp > 0n) {
    const idx = (wkTemp & -wkTemp).toString(2).length - 1;
    const file = idx % 8;
    const rank = Math.floor(idx / 8);
    const rIdx = 7 - rank;
    const cIdx = file;
    const pstVal = phase * PST_KING_MIDDLE[rIdx][cIdx] + (1 - phase) * PST_KING_ENDGAME[rIdx][cIdx];
    score += getMaterialValue('k') + pstVal * pstWeight;
    wkTemp &= wkTemp - 1n;
  }

  score += getPstAndMaterialScore(bb.bp, PST_PAWN, 'p', -1);
  score += getPstAndMaterialScore(bb.bn, PST_KNIGHT, 'n', -1);
  score += getPstAndMaterialScore(bb.bb, PST_BISHOP, 'b', -1);
  score += getPstAndMaterialScore(bb.br, PST_ROOK, 'r', -1);
  score += getPstAndMaterialScore(bb.bq, PST_QUEEN, 'q', -1);

  let bkTemp = bb.bk;
  while (bkTemp > 0n) {
    const idx = (bkTemp & -bkTemp).toString(2).length - 1;
    const file = idx % 8;
    const rank = Math.floor(idx / 8);
    const rIdx = rank;
    const cIdx = 7 - file;
    const pstVal = phase * PST_KING_MIDDLE[rIdx][cIdx] + (1 - phase) * PST_KING_ENDGAME[rIdx][cIdx];
    score -= getMaterialValue('k') + pstVal * pstWeight;
    bkTemp &= bkTemp - 1n;
  }

  const turn = chess.turn();
  const activeMoves = chess.moves().length;
  let mobilityW = personality.mobilityWeight;
  if (trainedAdjustments && trainedAdjustments.mobilityMultiplier !== undefined) mobilityW *= trainedAdjustments.mobilityMultiplier;
  if (trainedAdjustments && trainedAdjustments.styleWeights && trainedAdjustments.styleWeights.mobility !== undefined) {
    mobilityW *= (trainedAdjustments.styleWeights.mobility / 0.5);
  }
  if (config.difficulty === 'beginner') mobilityW = 0;
  else if (config.difficulty === 'intermediate') mobilityW *= 0.5;
  
  score += (turn === 'w' ? 1 : -1) * activeMoves * 1.5 * mobilityW;

  if (config.evalMode === 'neural' || config.evalMode === 'hybrid') {
    const coreControl = popCount(bb.whitePieces & CENTER_CORE_MASK) - popCount(bb.blackPieces & CENTER_CORE_MASK);
    const extendedControl = popCount(bb.whitePieces & CENTER_EXTENDED_MASK) - popCount(bb.blackPieces & CENTER_EXTENDED_MASK);
    let neuralBonus = (coreControl * 20 + extendedControl * 8) * trainingProgress * 15;
    if (trainedAdjustments && trainedAdjustments.neuralMultiplier !== undefined) neuralBonus *= trainedAdjustments.neuralMultiplier;
    score += (turn === 'w' ? 1 : -1) * neuralBonus;
  }

  let positionalExtras = 0;
  let positionalMult = 1.0;
  if (trainedAdjustments && trainedAdjustments.styleWeights && trainedAdjustments.styleWeights.positional !== undefined) {
    positionalMult = trainedAdjustments.styleWeights.positional / 0.5;
  }
  const whitePawnsInFile = new Array(8).fill(0);
  const blackPawnsInFile = new Array(8).fill(0);
  for (let c = 0; c < 8; c++) {
    whitePawnsInFile[c] = popCount(bb.wp & FILE_MASKS[c]);
    blackPawnsInFile[c] = popCount(bb.bp & FILE_MASKS[c]);
  }

  if (config.difficulty !== 'beginner') {
    for (let c = 0; c < 8; c++) {
      if (whitePawnsInFile[c] > 1) positionalExtras -= 15 * (whitePawnsInFile[c] - 1);
      if (blackPawnsInFile[c] > 1) positionalExtras += 15 * (blackPawnsInFile[c] - 1);
      const whiteAdjacent = (c > 0 && whitePawnsInFile[c - 1] > 0) || (c < 7 && whitePawnsInFile[c + 1] > 0);
      if (whitePawnsInFile[c] > 0 && !whiteAdjacent) positionalExtras -= 12 * whitePawnsInFile[c];
      const blackAdjacent = (c > 0 && blackPawnsInFile[c - 1] > 0) || (c < 7 && blackPawnsInFile[c + 1] > 0);
      if (blackPawnsInFile[c] > 0 && !blackAdjacent) positionalExtras += 12 * blackPawnsInFile[c];
    }
    const bpBonus = config.customWeights?.bishopPairBonus !== undefined ? config.customWeights.bishopPairBonus : 30;
    if (whiteBishops >= 2) positionalExtras += bpBonus;
    if (blackBishops >= 2) positionalExtras -= bpBonus;
  }

  score += positionalExtras * positionalMult;

  let kingSafetyExtras = 0;
  if (config.difficulty !== 'beginner' && phase > 0.3) {
    let ksWeight = personality.kingSafetyWeight || 0.5;
    if (trainedAdjustments && trainedAdjustments.styleWeights && trainedAdjustments.styleWeights.kingSafety !== undefined) {
      ksWeight *= (trainedAdjustments.styleWeights.kingSafety / 0.5);
    }
    const wkIdx = popLSB(bb.wk).sq;
    if (wkIdx !== -1) {
      const wkShield = KING_SHIELD_WHITE_MASKS[wkIdx];
      let ownShieldPenalty = (3 - popCount(bb.wp & wkShield)) * 28 * ksWeight;
      if (trainedAdjustments?.styleWeights?.aggression !== undefined) ownShieldPenalty *= Math.max(0.3, 1.5 - trainedAdjustments.styleWeights.aggression);
      kingSafetyExtras -= ownShieldPenalty;
    }

    const bkIdx = popLSB(bb.bk).sq;
    if (bkIdx !== -1) {
      const bkShield = KING_SHIELD_BLACK_MASKS[bkIdx];
      let enemyShieldPenalty = (3 - popCount(bb.bp & bkShield)) * 28 * ksWeight;
      if (trainedAdjustments?.styleWeights?.aggression !== undefined) enemyShieldPenalty *= Math.min(2.0, 0.5 + trainedAdjustments.styleWeights.aggression);
      kingSafetyExtras += enemyShieldPenalty;
    }
  }
  if (config.difficulty === 'intermediate') kingSafetyExtras *= 0.5;
  score += kingSafetyExtras;

  let dynamicPositionalExtras = 0;
  if (config.difficulty !== 'beginner') {
    let wpTemp = bb.wp;
    while (wpTemp > 0n) {
      const { sq: idx, bb: nextWp } = popLSB(wpTemp);
      wpTemp = nextWp;
      const rank = Math.floor(idx / 8);
      if ((bb.bp & PASSED_PAWN_WHITE_MASKS[idx]) === 0n) {
        dynamicPositionalExtras += phase * ((7 - rank) * 15) + (1 - phase) * ((7 - rank) * 30);
      }
    }

    let bpTemp = bb.bp;
    while (bpTemp > 0n) {
      const { sq: idx, bb: nextBp } = popLSB(bpTemp);
      bpTemp = nextBp;
      const rank = Math.floor(idx / 8);
      if ((bb.wp & PASSED_PAWN_BLACK_MASKS[idx]) === 0n) {
        dynamicPositionalExtras -= phase * (rank * 15) + (1 - phase) * (rank * 30);
      }
    }

    let wrTemp = bb.wr;
    while (wrTemp > 0n) {
      const { sq: idx, bb: nextWr } = popLSB(wrTemp);
      wrTemp = nextWr;
      const file = idx % 8;
      const rank = Math.floor(idx / 8);
      const friendlyPawns = bb.wp & FILE_MASKS[file];
      const enemyPawns = bb.bp & FILE_MASKS[file];
      if (friendlyPawns === 0n && enemyPawns === 0n) dynamicPositionalExtras += 35;
      else if (friendlyPawns === 0n) dynamicPositionalExtras += 20;
      if (rank === 6) dynamicPositionalExtras += 25;
    }

    let brTemp = bb.br;
    while (brTemp > 0n) {
      const { sq: idx, bb: nextBr } = popLSB(brTemp);
      brTemp = nextBr;
      const file = idx % 8;
      const rank = Math.floor(idx / 8);
      const friendlyPawns = bb.bp & FILE_MASKS[file];
      const enemyPawns = bb.wp & FILE_MASKS[file];
      if (friendlyPawns === 0n && enemyPawns === 0n) dynamicPositionalExtras -= 35;
      else if (friendlyPawns === 0n) dynamicPositionalExtras -= 20;
      if (rank === 1) dynamicPositionalExtras -= 25;
    }
  }
  if (config.difficulty === 'intermediate') dynamicPositionalExtras *= 0.5;
  score += dynamicPositionalExtras * positionalMult;

  if (config.evalMode === 'komodo_mcts') score += ((whiteBishops >= 2 ? 30 : 0) - (blackBishops >= 2 ? 30 : 0)) * 1.5;
  else if (config.evalMode === 'patricia_neural') score += (kingSafetyExtras * 1.6);
  else if (config.evalMode === 'nova_chess') score += (dynamicPositionalExtras * 0.4);
  else if (config.evalMode === 'lc0_neural') {
    const centerFactor = (whitePawnsInFile[3] + whitePawnsInFile[4]) - (blackPawnsInFile[3] + blackPawnsInFile[4]);
    score += centerFactor * 25 + (whiteBishops >= 2 ? 40 : 0) - (blackBishops >= 2 ? 40 : 0) + dynamicPositionalExtras * 0.6;
  } else if (config.evalMode === 'torch_hybrid') score += kingSafetyExtras * 1.2 + dynamicPositionalExtras * 0.5 + ((turn === 'w' ? 1 : -1) * activeMoves * 3.0);

  if (config.difficulty === 'beginner') score += ((getStringHash(chess.fen()) % 240) - 120);
  else if (config.difficulty === 'intermediate') score += ((getStringHash(chess.fen()) % 80) - 40);

  return score;
}
