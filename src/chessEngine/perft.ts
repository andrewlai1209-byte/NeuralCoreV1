import { BitboardEngine } from './board';
import { generateMoves } from './movegen';
import { Chess } from 'chess.js';

/**
 * Recursive Perft (Performance Test) for our custom Bitboard move generator
 */
export function perft(board: BitboardEngine, depth: number): number {
  if (depth === 0) return 1;

  const moves = generateMoves(board);
  if (depth === 1) return moves.length;

  let nodes = 0;
  for (const m of moves) {
    board.makeMove(m);
    nodes += perft(board, depth - 1);
    board.undoMove(m);
  }
  return nodes;
}

/**
 * Recursive Perft for chess.js to act as our oracle
 */
export function perftChessJS(chess: Chess, depth: number): number {
  if (depth === 0) return 1;

  const moves = chess.moves({ verbose: true });
  if (depth === 1) return moves.length;

  let nodes = 0;
  for (const m of moves) {
    chess.move(m.san);
    nodes += perftChessJS(chess, depth - 1);
    chess.undo();
  }
  return nodes;
}

export interface PerftResult {
  depth: number;
  customNodes: number;
  oracleNodes: number;
  matched: boolean;
  timeCustomMs: number;
  timeOracleMs: number;
  npsCustom: number;
  npsOracle: number;
}

/**
 * Validates the Bitboard Engine's move generator against chess.js
 */
export function verifyMoveGen(fen: string, depth: number): PerftResult {
  const board = new BitboardEngine();
  board.parseFen(fen);

  const chess = new Chess(fen);

  // Measure Custom Engine
  const startCustom = performance.now();
  const customNodes = perft(board, depth);
  const endCustom = performance.now();
  const timeCustomMs = Math.max(1, endCustom - startCustom);

  // Measure Oracle Engine (chess.js)
  const startOracle = performance.now();
  const oracleNodes = perftChessJS(chess, depth);
  const endOracle = performance.now();
  const timeOracleMs = Math.max(1, endOracle - startOracle);

  const npsCustom = Math.round(customNodes / (timeCustomMs / 1000));
  const npsOracle = Math.round(oracleNodes / (timeOracleMs / 1000));

  return {
    depth,
    customNodes,
    oracleNodes,
    matched: customNodes === oracleNodes,
    timeCustomMs,
    timeOracleMs,
    npsCustom,
    npsOracle,
  };
}
