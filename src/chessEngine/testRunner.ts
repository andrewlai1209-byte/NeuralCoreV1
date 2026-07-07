import { setBit, clearBit, toggleBit, checkBit, popLSB, popCount } from './core';
import { BitboardEngine, COLOR_WHITE, COLOR_BLACK, PIECE_PAWN } from './board';
import { generateMoves } from './movegen';
import { verifyMoveGen } from './perft';
import { nnueEvaluator } from './nnue';

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (error: any) {
    console.error(`[FAIL] ${name}: ${error.message}`);
    process.exit(1);
  }
}

console.log("=== NEURALCORE CORE ENGINE TEST SUITE ===");

// 1. Bitboard Core Operations
runTest("Bitboard Operator Core Math", () => {
  let bb = 0n;
  
  // setBit
  bb = setBit(bb, 0);
  bb = setBit(bb, 63);
  if (!checkBit(bb, 0) || !checkBit(bb, 63)) throw new Error("setBit/checkBit failed");
  if (checkBit(bb, 10)) throw new Error("invalid checkBit positive");

  // popCount
  if (popCount(bb) !== 2) throw new Error("popCount failed");

  // clearBit
  bb = clearBit(bb, 0);
  if (checkBit(bb, 0)) throw new Error("clearBit failed");
  if (popCount(bb) !== 1) throw new Error("popCount after clearBit failed");

  // toggleBit
  bb = toggleBit(bb, 32);
  if (!checkBit(bb, 32)) throw new Error("toggleBit failed to set");
  bb = toggleBit(bb, 32);
  if (checkBit(bb, 32)) throw new Error("toggleBit failed to clear");

  // popLSB
  bb = 0n;
  bb = setBit(bb, 5);
  bb = setBit(bb, 20);
  const { sq: sq1, bb: bb1 } = popLSB(bb);
  if (sq1 !== 5) throw new Error(`popLSB first index failed: expected 5 got ${sq1}`);
  const { sq: sq2, bb: bb2 } = popLSB(bb1);
  if (sq2 !== 20 || bb2 !== 0n) throw new Error("popLSB second index failed");
});

// 2. Attacks precalculation
runTest("Basic Attack Generation Matrices", () => {
  const board = new BitboardEngine();
  // Ensure we can check check states
  const inCheck = board.inCheck(COLOR_WHITE);
  if (inCheck) throw new Error("Standard starting position is in check!");
});

// 3. Move Generator & Perft
runTest("Bitboard MoveGen & Perft Accuracy", () => {
  const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const perftRes = verifyMoveGen(fen, 1);
  if (!perftRes.matched || perftRes.customNodes !== 20) {
    throw new Error(`Perft Depth 1 failed: custom nodes = ${perftRes.customNodes}`);
  }

  const perftRes2 = verifyMoveGen(fen, 2);
  if (!perftRes2.matched || perftRes2.customNodes !== 400) {
    throw new Error(`Perft Depth 2 failed: custom nodes = ${perftRes2.customNodes}`);
  }
  console.log(`  - Perft D1: ${perftRes.customNodes} nodes (matched)`);
  console.log(`  - Perft D2: ${perftRes2.customNodes} nodes (matched)`);
});

// 4. NNUE & Accumulator Updates
runTest("NNUE Incremental Accumulator Flow", () => {
  const board = new BitboardEngine();
  const accum = nnueEvaluator.computeAccumulators(board);
  const val1 = nnueEvaluator.evaluateAccumulators(accum.accumWhite, accum.accumBlack);

  // Apply e2-e4
  const move = { from: 12, to: 28, piece: PIECE_PAWN, captured: -1, promotion: -1, flags: 4 };
  nnueEvaluator.updateAccumulators(accum.accumWhite, accum.accumBlack, move, COLOR_WHITE);
  const val2 = nnueEvaluator.evaluateAccumulators(accum.accumWhite, accum.accumBlack);

  if (typeof val1 !== 'number' || typeof val2 !== 'number') {
    throw new Error("NNUE evaluation values are non-numeric");
  }
  console.log(`  - Standard NNUE position rating: ${val1}`);
  console.log(`  - e2-e4 NNUE position rating: ${val2}`);
});

console.log("\n[SUCCESS] All core chess engine diagnostics passed perfectly!");
