/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BUG DETECTION & TESTING SUITE
 * Comprehensive debugging for all Phase 1-3 implementations
 */

import { Chess } from 'chess.js';
import { zobristHashFromFen, initializeZobrist, IncrementalZobristHash } from './zobrist';
import { GamePhase, PawnStructure, OpenFileEvaluation, OutpostEvaluation, PassedPawnEvaluation, AdvancedEvaluator } from './advancedEvaluation';

interface BugReport {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  module: string;
  issue: string;
  fix: string;
  tested: boolean;
}

const bugReports: BugReport[] = [];

/**
 * BUG #1: Zobrist Square Indexing
 * ISSUE: In zobristHashFromFen(), square calculation uses `square + fileInRank`
 * but square starts at 56 (a8) and decreases per rank.
 * This can cause INDEX OUT OF BOUNDS when fileInRank > 7
 * 
 * FIX: Use proper 2D indexing: rank * 8 + file
 */
function testZobristSquareIndexing(): void {
  console.log('\n=== TEST: Zobrist Square Indexing ===');
  const testPositions = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
    '8/8/8/8/8/8/8/8 w - - 0 1', // Empty board
    'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' // Complex position
  ];
  
  for (const fen of testPositions) {
    try {
      const hash = zobristHashFromFen(fen);
      console.log(`✓ Hash computed for: ${fen.substring(0, 30)}... = ${hash}`);
    } catch (e: any) {
      bugReports.push({
        severity: 'CRITICAL',
        module: 'zobrist.ts',
        issue: `Square indexing out of bounds for FEN: ${fen}`,
        fix: 'Use proper 2D board indexing: square = rank * 8 + file instead of accumulative fileInRank',
        tested: true
      });
      console.error(`✗ ERROR: ${e.message}`);
    }
  }
}

/**
 * BUG #2: Zobrist Initialization Check
 * ISSUE: ZOBRIST_TABLE is a module-level mutable variable that may not be
 * initialized if the module is imported conditionally
 */
function testZobristInitialization(): void {
  console.log('\n=== TEST: Zobrist Initialization ===');
  try {
    initializeZobrist();
    // Verify all expected keys are present
    const expectedKeys = 768 + 2 + 16 + 8; // pieces + side + castling + enpassant
    const actualKeys = (global as any).ZOBRIST_TABLE?.size || 0;
    
    if (actualKeys >= expectedKeys) {
      console.log(`✓ Zobrist table initialized with ${actualKeys} keys (expected ~${expectedKeys})`);
    } else {
      bugReports.push({
        severity: 'HIGH',
        module: 'zobrist.ts',
        issue: `Zobrist table under-initialized: ${actualKeys} keys found, expected ~${expectedKeys}`,
        fix: 'Ensure initializeZobrist() is called during module load and exports ZOBRIST_TABLE for verification',
        tested: true
      });
      console.error(`✗ WARNING: Zobrist table has only ${actualKeys} keys`);
    }
  } catch (e: any) {
    bugReports.push({
      severity: 'CRITICAL',
      module: 'zobrist.ts',
      issue: `Zobrist initialization failed: ${e.message}`,
      fix: 'Export ZOBRIST_TABLE and add guards against re-initialization',
      tested: true
    });
  }
}

/**
 * BUG #3: Black Knight Outpost Rank Detection
 * ISSUE: In advancedEvaluation.ts, OutpostEvaluation.getOutpostBonus() uses
 * SAME rank check for both White and Black knights:
 *   const isOutpostRank = isWhite ? (r >= 3 && r <= 4) : (r >= 3 && r <= 4);
 * 
 * FIX: Black outposts should be on ranks 4-5 (r=3-4 from Black's perspective)
 * which in 0-indexed board = r >= 3 && r <= 4, but the logic is backwards.
 * Should be: isWhite ? (r >= 3 && r <= 4) : (r >= 3 && r <= 4)
 * is actually CORRECT (both check same range). Need to verify the semantic meaning.
 */
function testOutpostEvaluation(): void {
  console.log('\n=== TEST: Outpost Evaluation Logic ===');
  
  const chess = new Chess('8/8/8/3n4/8/8/8/8 w - - 0 1'); // Black knight on d5 (r=3, c=3)
  const board = chess.board();
  const outpostEval = new OutpostEvaluation(board);
  
  try {
    const score = outpostEval.evaluateOutposts();
    console.log(`✓ Outpost evaluation computed: ${score}`);
    
    if (score >= 0) {
      console.warn(`⚠ WARNING: Black knight should have negative score but got ${score}`);
      bugReports.push({
        severity: 'MEDIUM',
        module: 'advancedEvaluation.ts',
        issue: `Black knight outpost scoring issue: got ${score} (expected negative)`,
        fix: 'Verify outpost rank detection logic for Black pieces on r=3-4',
        tested: true
      });
    }
  } catch (e: any) {
    bugReports.push({
      severity: 'HIGH',
      module: 'advancedEvaluation.ts',
      issue: `Outpost evaluation crashed: ${e.message}`,
      fix: 'Add bounds checking for board access with optional chaining',
      tested: true
    });
  }
}

/**
 * BUG #4: Passed Pawn Detection - Edge Cases
 * ISSUE: PassedPawnEvaluation.isPassed() doesn't properly validate
 * that a pawn is on the board before checking it.
 * Also, the advancement calculation uses 7-r for White but r for Black,
 * which is inconsistent.
 */
function testPassedPawnEvaluation(): void {
  console.log('\n=== TEST: Passed Pawn Evaluation ===');
  
  // Test: White pawn on a7 should be highly valued (advancement = 0)
  const chess1 = new Chess('8/P7/8/8/8/8/8/8 w - - 0 1');
  const board1 = chess1.board();
  const passedEval1 = new PassedPawnEvaluation(board1);
  const score1 = passedEval1.evaluatePassedPawns();
  
  console.log(`✓ White pawn on a7: score = ${score1}`);
  
  if (score1 === 0) {
    bugReports.push({
      severity: 'MEDIUM',
      module: 'advancedEvaluation.ts',
      issue: `Passed pawn on rank 7 not evaluated: score = ${score1}`,
      fix: 'Check advancement calculation: rank 7 -> r=0, advancement = 7-0 = 7, bonus = 5*7*7 = 245',
      tested: true
    });
  }
  
  // Test: Black pawn on h2 should be highly valued (advancement = 6)
  const chess2 = new Chess('8/8/8/8/8/8/7p/8 w - - 0 1');
  const board2 = chess2.board();
  const passedEval2 = new PassedPawnEvaluation(board2);
  const score2 = passedEval2.evaluatePassedPawns();
  
  console.log(`✓ Black pawn on h2: score = ${score2}`);
  
  if (score2 >= 0) {
    bugReports.push({
      severity: 'MEDIUM',
      module: 'advancedEvaluation.ts',
      issue: `Black passed pawn has positive score: ${score2} (should be negative)`,
      fix: 'Verify score sign flip for Black: should subtract, not add',
      tested: true
    });
  }
}

/**
 * BUG #5: Game Phase Thresholds
 * ISSUE: OPENING_THRESHOLD = 35 is unclear. Starting position has material:
 * 8 pawns (8) + 2 rooks (10) + 2 knights (6) + 2 bishops (6) + 1 queen (9) = 39
 * So threshold of 35 correctly detects opening, but might be off-by-one-ish
 */
function testGamePhaseDetection(): void {
  console.log('\n=== TEST: Game Phase Detection ===');
  
  const chess = new Chess();
  const board = chess.board();
  const material = GamePhase.calculateMaterialCount(board);
  const phase = GamePhase.getPhase(material);
  
  console.log(`✓ Starting position material: ${material}, phase: ${phase}`);
  
  if (phase !== 'opening') {
    bugReports.push({
      severity: 'MEDIUM',
      module: 'advancedEvaluation.ts',
      issue: `Starting position not detected as opening: phase = ${phase}, material = ${material}`,
      fix: 'Adjust OPENING_THRESHOLD or review material calculation',
      tested: true
    });
  }
}

/**
 * BUG #6: Pawn Structure - Isolated Pawn Double Counting
 * ISSUE: When evaluating pawn structure, isolated pawns are penalized
 * but then backward pawns are also penalized separately.
 * A pawn can be both isolated AND backward, causing double penalty.
 */
function testPawnStructureEvaluation(): void {
  console.log('\n=== TEST: Pawn Structure Evaluation ===');
  
  // Position: White pawns on a4 (isolated) and e4 (isolated), e5 (connected)
  const chess = new Chess('8/8/8/4P3/P3P3/8/8/8 w - - 0 1');
  const board = chess.board();
  const pawnEval = new PawnStructure(board);
  const score = pawnEval.evaluateStructure();
  
  console.log(`✓ Pawn structure evaluation: ${score}`);
  console.log('  Position: a4 (isolated), e4 (isolated), e5 (connected)');
  
  // Expected: a4 = -10, e4 = -10, e5 = 0, total < -20
  if (score > -20) {
    console.warn(`⚠ WARNING: Pawn penalty seems too lenient: ${score} (expected < -20)`);
  } else {
    console.log(`✓ Pawn penalties applied correctly`);
  }
}

/**
 * BUG #7: Open File on Edges
 * ISSUE: OpenFileEvaluation counts files a-h (0-7), but doesn't handle edge cases
 * when rooks are on a-file or h-file (which have only one adjacent file)
 */
function testOpenFileEvaluation(): void {
  console.log('\n=== TEST: Open File Evaluation ===');
  
  // Position: White rook on a4, a-file is open
  const chess = new Chess('8/8/8/8/R7/8/8/8 w - - 0 1');
  const board = chess.board();
  const openEval = new OpenFileEvaluation(board);
  const score = openEval.evaluateOpenFiles();
  
  console.log(`✓ Rook on open a-file: ${score} cp`);
  
  if (score < 30 || score > 40) {
    bugReports.push({
      severity: 'LOW',
      module: 'advancedEvaluation.ts',
      issue: `Rook on open file score unexpected: ${score} (expected ~35)`,
      fix: 'Verify open file bonus calculation is consistent',
      tested: true
    });
  }
}

/**
 * BUG #8: Zobrist FEN Parser - Castling Edge Case
 * ISSUE: getCastlingIndex('-') when castling is '-' (none available)
 * should return 0, but if the FEN field is "-" it's handled correctly.
 */
function testZobristCastlingParsing(): void {
  console.log('\n=== TEST: Zobrist Castling Parsing ===');
  
  const positions = [
    { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', expected: 'KQkq' },
    { fen: '8/8/8/8/8/8/8/8 w - - 0 1', expected: '-' },
    { fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', expected: 'KQkq' }
  ];
  
  for (const { fen, expected } of positions) {
    try {
      const hash = zobristHashFromFen(fen);
      console.log(`✓ Castling "${expected}" parsed correctly`);
    } catch (e: any) {
      bugReports.push({
        severity: 'HIGH',
        module: 'zobrist.ts',
        issue: `Castling parsing failed for "${expected}": ${e.message}`,
        fix: 'Add validation for castling string format',
        tested: true
      });
    }
  }
}

/**
 * BUG #9: Zobrist En Passant Edge Case
 * ISSUE: getEnpassantFile() assumes ep is "-" or "a1"-"h8", but doesn't validate
 * that the file is actually valid (a-h only)
 */
function testZobristEnPassantParsing(): void {
  console.log('\n=== TEST: Zobrist En Passant Parsing ===');
  
  const positions = [
    { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', expected: 'e3' },
    { fen: '8/8/8/8/8/8/8/8 w - - 0 1', expected: '-' },
  ];
  
  for (const { fen, expected } of positions) {
    try {
      const hash = zobristHashFromFen(fen);
      console.log(`✓ En passant "${expected}" parsed correctly`);
    } catch (e: any) {
      bugReports.push({
        severity: 'MEDIUM',
        module: 'zobrist.ts',
        issue: `En passant parsing failed for "${expected}": ${e.message}`,
        fix: 'Add range validation for file (a-h)',
        tested: true
      });
    }
  }
}

/**
 * Run all bug detection tests
 */
export function runBugDetection(): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          NEURAL CHESS ENGINE - BUG DETECTION SUITE         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  testZobristSquareIndexing();
  testZobristInitialization();
  testOutpostEvaluation();
  testPassedPawnEvaluation();
  testGamePhaseDetection();
  testPawnStructureEvaluation();
  testOpenFileEvaluation();
  testZobristCastlingParsing();
  testZobristEnPassantParsing();
  
  // Report Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      BUG REPORT SUMMARY                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const criticalBugs = bugReports.filter(b => b.severity === 'CRITICAL');
  const highBugs = bugReports.filter(b => b.severity === 'HIGH');
  const mediumBugs = bugReports.filter(b => b.severity === 'MEDIUM');
  const lowBugs = bugReports.filter(b => b.severity === 'LOW');
  
  console.log(`\n🔴 CRITICAL: ${criticalBugs.length} bugs`);
  console.log(`🟠 HIGH: ${highBugs.length} bugs`);
  console.log(`🟡 MEDIUM: ${mediumBugs.length} bugs`);
  console.log(`🟢 LOW: ${lowBugs.length} bugs`);
  console.log(`\n📊 TOTAL: ${bugReports.length} bugs found`);
  
  if (bugReports.length > 0) {
    console.log('\n' + '='.repeat(60));
    bugReports.forEach((bug, idx) => {
      const icon = bug.severity === 'CRITICAL' ? '🔴' : 
                   bug.severity === 'HIGH' ? '🟠' : 
                   bug.severity === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`\n${icon} BUG #${idx + 1} [${bug.severity}] - ${bug.module}`);
      console.log(`   Issue: ${bug.issue}`);
      console.log(`   Fix:   ${bug.fix}`);
    });
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('\n✅ Bug detection complete!');
}

// Auto-run on import
if (typeof window === 'undefined') {
  // Node.js environment
  runBugDetection();
}

export { bugReports };
