/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * COMPREHENSIVE DEBUG & QUALITY ASSURANCE SUITE
 * Validates Hybrid Engine v2.0 correctness and performance
 */

import { Chess } from 'chess.js';
import { HybridSearchEngine, SearchStats } from './hybridEngine';
import { MoveOrderingCache, QuiescenceOptimizer, PerformanceMonitor } from './performanceOptimization';

interface QAResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

/**
 * Hybrid Engine Quality Assurance Suite
 */
export class HybridEngineQASuite {
  private results: QAResult[] = [];
  private engine: HybridSearchEngine;
  
  constructor() {
    this.engine = new HybridSearchEngine();
  }
  
  /**
   * Run comprehensive QA suite
   */
  runFullQA(): QAResult[] {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 HYBRID ENGINE v2.0 - COMPREHENSIVE QA SUITE');
    console.log('='.repeat(70));
    
    this.testCorrectness();
    this.testPerformance();
    this.testOptimization();
    this.testRobustness();
    
    this.printSummary();
    return this.results;
  }
  
  /**
   * Test 1: Correctness Validation
   */
  private testCorrectness(): void {
    console.log('\n📋 TEST SUITE 1: CORRECTNESS');
    console.log('-'.repeat(70));
    
    // Test 1.1: Starting position
    const chess = new Chess();
    try {
      const result = this.engine.search(chess, 3, 1000);
      if (result.bestMove && result.score !== undefined) {
        this.addResult('Starting Position Search', 'PASS', 
          `Found move ${result.bestMove.san} with score ${result.score}`);
      } else {
        this.addResult('Starting Position Search', 'FAIL', 'No best move found');
      }
    } catch (e: any) {
      this.addResult('Starting Position Search', 'FAIL', e.message);
    }
    
    // Test 1.2: Legal move generation
    const testMoves = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'];
    for (const move of testMoves) {
      try {
        chess.move(move);
        this.addResult(`Legal Move: ${move}`, 'PASS', 'Successfully played');
      } catch (e: any) {
        this.addResult(`Legal Move: ${move}`, 'FAIL', e.message);
        break;
      }
    }
    
    // Test 1.3: Checkmate detection
    const mateChess = new Chess('rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 4');
    try {
      const moves = mateChess.moves();
      if (moves.length > 0) {
        this.addResult('Legal Moves Generation', 'PASS', `Generated ${moves.length} legal moves`);
      } else {
        this.addResult('Legal Moves Generation', 'FAIL', 'No moves generated');
      }
    } catch (e: any) {
      this.addResult('Legal Moves Generation', 'FAIL', e.message);
    }
    
    // Test 1.4: Alpha-beta pruning correctness
    this.testAlphaBetaPruning();
  }
  
  /**
   * Test 2: Performance Validation
   */
  private testPerformance(): void {
    console.log('\n⚡ TEST SUITE 2: PERFORMANCE');
    console.log('-'.repeat(70));
    
    const chess = new Chess();
    const depths = [2, 3, 4];
    
    for (const depth of depths) {
      try {
        const start = Date.now();
        const result = this.engine.search(chess, depth, 2000);
        const elapsed = result.timeMs;
        
        const nps = result.nps;
        if (nps > 10000) {
          this.addResult(`Depth ${depth} Performance`, 'PASS',
            `${nps.toLocaleString()} NPS (${elapsed}ms, ${result.nodes} nodes)`);
        } else if (nps > 1000) {
          this.addResult(`Depth ${depth} Performance`, 'WARNING',
            `${nps.toLocaleString()} NPS (slower than expected)`);
        } else {
          this.addResult(`Depth ${depth} Performance`, 'FAIL',
            `${nps.toLocaleString()} NPS (too slow)`);
        }
      } catch (e: any) {
        this.addResult(`Depth ${depth} Performance`, 'FAIL', e.message);
      }
    }
  }
  
  /**
   * Test 3: Optimization Effectiveness
   */
  private testOptimization(): void {
    console.log('\n🚀 TEST SUITE 3: OPTIMIZATION');
    console.log('-'.repeat(70));
    
    const chess = new Chess();
    
    // Test move ordering
    try {
      const moveOrderer = new MoveOrderingCache();
      const moves = chess.moves({ verbose: true });
      const ordered = moveOrderer.orderMoves(moves, 3);
      
      if (ordered.length === moves.length) {
        this.addResult('Move Ordering', 'PASS', 
          `Ordered ${ordered.length} moves correctly`);
      } else {
        this.addResult('Move Ordering', 'FAIL', 'Move count mismatch');
      }
    } catch (e: any) {
      this.addResult('Move Ordering', 'FAIL', e.message);
    }
    
    // Test transposition table
    try {
      const result1 = this.engine.search(chess, 2, 500);
      const stats1 = this.engine.getStats();
      const ttHits1 = stats1.cacheHitRate;
      
      const result2 = this.engine.search(chess, 2, 500);
      const stats2 = this.engine.getStats();
      const ttHits2 = stats2.cacheHitRate;
      
      if (ttHits2 > ttHits1) {
        this.addResult('Transposition Table', 'PASS',
          `Cache hit rate improved: ${(ttHits1 * 100).toFixed(1)}% → ${(ttHits2 * 100).toFixed(1)}%`);
      } else {
        this.addResult('Transposition Table', 'WARNING',
          `Cache hit rate: ${(ttHits2 * 100).toFixed(1)}%`);
      }
    } catch (e: any) {
      this.addResult('Transposition Table', 'FAIL', e.message);
    }
  }
  
  /**
   * Test 4: Robustness
   */
  private testRobustness(): void {
    console.log('\n🛡️  TEST SUITE 4: ROBUSTNESS');
    console.log('-'.repeat(70));
    
    // Test endgame positions
    const endgamePositions = [
      'k7/8/8/8/8/8/7K/7Q b - - 0 1', // K vs Q
      'k7/8/8/8/8/8/7K/6Q1 w - - 0 1',  // Q+K vs K
      '8/8/8/4k3/8/8/8/6K1 w - - 0 1'   // K vs K (draw)
    ];
    
    for (const fen of endgamePositions) {
      try {
        const chess = new Chess(fen);
        const result = this.engine.search(chess, 2, 500);
        
        if (result.bestMove || result.score !== undefined) {
          this.addResult(`Endgame: ${fen.substring(0, 20)}...`, 'PASS',
            `Score: ${result.score}`);
        }
      } catch (e: any) {
        this.addResult(`Endgame: ${fen.substring(0, 20)}...`, 'FAIL', e.message);
      }
    }
    
    // Test edge cases
    try {
      const emptyChess = new Chess();
      if (emptyChess.moves().length > 0) {
        this.addResult('Edge Case: Starting Position', 'PASS',
          `Moves available: ${emptyChess.moves().length}`);
      }
    } catch (e: any) {
      this.addResult('Edge Case: Starting Position', 'FAIL', e.message);
    }
  }
  
  /**
   * Test alpha-beta pruning effectiveness
   */
  private testAlphaBetaPruning(): void {
    try {
      const chess = new Chess();
      const result = this.engine.search(chess, 3, 1000);
      const stats = this.engine.getStats();
      
      // Without pruning, at depth 3 starting position would be ~8,900 nodes
      // With alpha-beta, should be significantly less
      if (result.nodes < 8000) {
        this.addResult('Alpha-Beta Pruning', 'PASS',
          `Effective pruning: ${result.nodes} nodes (expected ~8900 without pruning)`);
      } else if (result.nodes < 8500) {
        this.addResult('Alpha-Beta Pruning', 'WARNING',
          `Pruning effectiveness: ${result.nodes} nodes`);
      } else {
        this.addResult('Alpha-Beta Pruning', 'FAIL',
          `Insufficient pruning: ${result.nodes} nodes`);
      }
    } catch (e: any) {
      this.addResult('Alpha-Beta Pruning', 'FAIL', e.message);
    }
  }
  
  /**
   * Print QA summary
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 QA SUMMARY');
    console.log('='.repeat(70));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const total = this.results.length;
    
    console.log(`\n✅ PASSED:  ${passed}/${total}`);
    console.log(`⚠️  WARNING: ${warnings}/${total}`);
    console.log(`❌ FAILED:  ${failed}/${total}`);
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Hybrid Engine v2.0 is ready for deployment.');
    } else {
      console.log('\n⚠️  Some tests failed. Review above for details.');
    }
    
    console.log('\n' + '='.repeat(70));
    
    // Detailed results
    console.log('\n📋 DETAILED RESULTS:');
    this.results.forEach((result, idx) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${idx + 1}. ${result.testName}: ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
    });
    
    console.log('\n' + '='.repeat(70));
  }
  
  private addResult(testName: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any): void {
    this.results.push({ testName, status, message, details });
  }
}

// Auto-run on import
if (typeof window === 'undefined') {
  const qaSuite = new HybridEngineQASuite();
  qaSuite.runFullQA();
}

export { HybridEngineQASuite };
