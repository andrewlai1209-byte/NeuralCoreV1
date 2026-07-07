/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chess } from 'chess.js';
import { EngineConfig, EnginePersonality, EnginePersonalityId } from './types';
import { db } from './lib/firebase';
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { saveExperience } from './lib/rlExperience';
import { findBookMove } from './openingBook';

import { PERSONALITIES, TRAINING_PROFILES } from './chessEngine/personalities';
import { evaluate, evaluateNNUE } from './chessEngine/evaluation';
import { TranspositionTable } from './chessEngine/tt';
import { ChessEngineSearch } from './chessEngine/search';

export { PERSONALITIES, TRAINING_PROFILES };

/**
 * High-level Chess Engine orchestration wrapper.
 * Acts as the platform-integration interface for UI and database interactions,
 * keeping the actual search and evaluation logic 100% pure and decoupled.
 */
export class ChessEngine {
  private config: EngineConfig;
  private static globalTransTable = new TranspositionTable(100000);
  private transTable = ChessEngine.globalTransTable;
  private searchRunner: ChessEngineSearch;

  constructor(config: EngineConfig) {
    this.config = config;
    this.searchRunner = new ChessEngineSearch(config, this.transTable);
  }

  /**
   * Update engine configuration dynamically
   */
  public updateConfig(newConfig: EngineConfig) {
    this.config = { ...this.config, ...newConfig };
    this.searchRunner.updateConfig(this.config);
  }

  /**
   * Evaluate a position from White's perspective
   */
  public evaluate(chess: Chess, trainingProgress: number = 0.5): number {
    return evaluate(chess, this.config, trainingProgress);
  }

  /**
   * Fast NNUE-like heuristic evaluator
   */
  public evaluateNNUE(chess: Chess): number {
    return evaluateNNUE(chess);
  }

  /**
   * Search for the absolute best move in the position
   */
  public search(fen: string, trainingProgress: number = 0.5, moveHistory?: string[]): {
    bestMove: any;
    score: number;
    depth: number;
    nodes: number;
    nps: number;
    pv: string[];
    bookOpeningName?: string;
    leezaMctsNodes?: any[];
    leezaValueHead?: { whiteWin: number; draw: number; blackWin: number };
    policyMap?: Record<string, number>;
  } {
    const chess = new Chess(fen);

    // 1. Opening Book Integration
    const history = moveHistory || [];
    const bookMove = findBookMove(history);
    if (bookMove) {
      return {
        bestMove: bookMove.nextBookMove,
        score: 0,
        depth: 0,
        nodes: 0,
        nps: 0,
        pv: [bookMove.nextBookMove],
        bookOpeningName: bookMove.name
      };
    }

    // 2. Check Extension Heuristic: If in check or deep game, extend target search depth
    let modifiedDepth = this.config.maxDepth;
    if (chess.inCheck() || chess.history().length > 10) {
      modifiedDepth = (this.config.maxDepth || 2) + 1;
    }

    // Temporarily apply depth extensions dynamically
    const originalDepth = this.config.maxDepth;
    this.config.maxDepth = modifiedDepth;
    this.searchRunner.updateConfig(this.config);

    let result;

    // 3. Dispatch to specific modular search algorithms
    if (this.config.evalMode === 'leeza_mcts') {
      result = this.searchRunner.searchLEEZAMCTS(chess, trainingProgress);
    } else if (this.config.evalMode === 'stockfish_nnue') {
      result = this.searchRunner.searchStockfishNNUE(chess, trainingProgress);
    } else if (this.config.evalMode === 'komodo_mcts') {
      result = this.searchRunner.searchKomodoDragonMCTS(chess, trainingProgress);
    } else if (this.config.evalMode === 'patricia_neural') {
      result = this.searchRunner.searchPatriciaNeural(chess, trainingProgress);
    } else if (this.config.evalMode === 'nova_chess') {
      result = this.searchRunner.searchNovaChess(chess, trainingProgress);
    } else if (this.config.evalMode === 'lc0_neural') {
      result = this.searchRunner.searchLc0Neural(chess, trainingProgress);
    } else if (this.config.evalMode === 'torch_hybrid') {
      result = this.searchRunner.searchTorchHybrid(chess, trainingProgress);
    } else if (this.config.evalMode === 'pantheon_fusion') {
      result = this.searchRunner.searchPantheonFusion(chess, trainingProgress);
    } else if (this.config.evalMode === 'neuralcore_rl_selfplay') {
      // Fire-and-forget reinforcement learning database telemetry update
      this.updateRlTelemetry();
      result = this.searchRunner.searchDeepThemed(
        chess,
        trainingProgress,
        6,
        165000,
        2200,
        (c) => this.evaluate(c, trainingProgress),
        "TD-RL"
      );
    } else {
      // Default fallback search
      result = this.searchRunner.searchDeepThemed(
        chess,
        trainingProgress,
        this.config.maxDepth || 3,
        100000,
        50000,
        (c) => this.evaluate(c, trainingProgress),
        'default'
      );
    }

    // Restore configuration
    this.config.maxDepth = originalDepth;
    this.searchRunner.updateConfig(this.config);

    // Enrich bestMove with full Chess.js properties (from, to, piece, etc.)
    if (result.bestMove) {
      const tempChess = new Chess(fen);
      const san = typeof result.bestMove === 'string' ? result.bestMove : result.bestMove.san;
      if (san) {
        try {
          const parsedMove = tempChess.move(san);
          if (parsedMove) {
            result.bestMove = {
              san: parsedMove.san,
              from: parsedMove.from,
              to: parsedMove.to,
              piece: parsedMove.piece,
              color: parsedMove.color,
              promotion: parsedMove.promotion || undefined,
              lan: parsedMove.from + parsedMove.to + (parsedMove.promotion || '')
            };
          }
        } catch (e) {
          // Fallback if chess.js move throws (e.g. if the move is invalid for any reason)
          if (typeof result.bestMove === 'string') {
            result.bestMove = { san: result.bestMove };
          }
        }
      }
    }

    // 4. Record experience asynchronously using local-first fail-safe buffers
    const sanMove = result.bestMove ? (result.bestMove.san || result.bestMove.toString()) : 'none';
    saveExperience({ fen, bestMove: sanMove, score: result.score });

    return result;
  }

  /**
   * Save reinforcement learning global telemetry asynchronously
   */
  private async updateRlTelemetry() {
    try {
      const docRef = doc(db, 'rl_experience', 'global');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          totalEpisodes: increment(1),
          rewardsGathered: increment(1.0)
        });
      } else {
        await setDoc(docRef, {
          totalEpisodes: 1,
          rewardsGathered: 1.0
        });
      }
    } catch (e) {
      console.warn("Telemetry update deferred offline:", e);
    }
  }
}
