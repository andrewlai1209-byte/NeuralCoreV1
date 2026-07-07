import { BitboardEngine, COLOR_WHITE, COLOR_BLACK, PIECE_PAWN, PIECE_KNIGHT, PIECE_BISHOP, PIECE_ROOK, PIECE_QUEEN, PIECE_KING } from './board';
import { Move } from './movegen';

// 12 piece types (White Pawn, Knight, Bishop, Rook, Queen, King, then Black Pawn, etc.)
// 64 squares. Total features = 12 * 64 = 768 features for each side.
const NUM_FEATURES = 768;
const HIDDEN_SIZE = 16;

/**
 * Seeded pseudo-random generator for reproducible neural network weights
 */
class LCG {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  public next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
}

/**
 * Micro-NNUE Evaluator with Incremental Accumulator
 */
export class MicroNNUE {
  // Weights: Input to Hidden (768 features -> 16 hidden neurons)
  private weightsIH: Float32Array;
  private biasesH: Float32Array;
  // Weights: Hidden to Output (32 inputs (16 white, 16 black accumulators) -> 1 output)
  private weightsHO: Float32Array;
  private biasO: number;

  constructor() {
    this.weightsIH = new Float32Array(NUM_FEATURES * HIDDEN_SIZE);
    this.biasesH = new Float32Array(HIDDEN_SIZE);
    this.weightsHO = new Float32Array(HIDDEN_SIZE * 2);
    this.biasO = 0;

    this.initializeWeights();
  }

  /**
   * Seed the neural network with smart weights derived from piece values
   * and spatial importance, plus a random perturbation.
   */
  private initializeWeights() {
    const lcg = new LCG(42); // deterministic seed

    // Base values for pieces: P, N, B, R, Q, K
    const baseValues = [100, 320, 330, 500, 900, 10000];

    for (let f = 0; f < NUM_FEATURES; f++) {
      const piece = Math.floor(f / 64);
      const sq = f % 64;
      const isWhite = piece < 6;
      const pieceType = piece % 6;
      const baseVal = baseValues[pieceType];

      // White material adds positive, Black adds negative
      const sign = isWhite ? 1 : -1;

      for (let h = 0; h < HIDDEN_SIZE; h++) {
        // Initialize weights to combine material value + positional bias + noise
        const noise = (lcg.next() - 0.5) * 15;
        
        // Center control incentive
        const rank = Math.floor(sq / 8);
        const file = sq % 8;
        const centerDist = Math.abs(3.5 - rank) + Math.abs(3.5 - file);
        const centerBonus = (7 - centerDist) * 5;

        const baseFeatureVal = sign * (baseVal + centerBonus);
        
        // Distribute feature values across hidden nodes
        const index = f * HIDDEN_SIZE + h;
        this.weightsIH[index] = (baseFeatureVal / 50) + noise;
      }
    }

    // Hidden biases
    for (let h = 0; h < HIDDEN_SIZE; h++) {
      this.biasesH[h] = (lcg.next() - 0.5) * 5;
    }

    // Output weights (16 for White perspective, 16 for Black perspective)
    for (let i = 0; i < HIDDEN_SIZE * 2; i++) {
      this.weightsHO[i] = i < HIDDEN_SIZE ? 1.5 : -1.5;
    }
    this.biasO = 10;
  }

  /**
   * Get feature index for a piece and square
   */
  public getFeatureIndex(color: number, pieceType: number, sq: number): number {
    const pIdx = color === COLOR_WHITE ? pieceType : pieceType + 6;
    return pIdx * 64 + sq;
  }

  /**
   * Compute full accumulators from board state (re-eval)
   */
  public computeAccumulators(board: BitboardEngine): { accumWhite: Float32Array, accumBlack: Float32Array } {
    const accumWhite = new Float32Array(this.biasesH);
    const accumBlack = new Float32Array(this.biasesH);

    // Scan all squares and accumulate active features
    for (let color = 0; color < 2; color++) {
      for (let pt = 0; pt < 6; pt++) {
        let temp = board.pieceBB[color][pt];
        while (temp > 0n) {
          const lsb = temp & -temp;
          const sq = lsb.toString(2).length - 1;
          
          const fIndex = this.getFeatureIndex(color, pt, sq);
          
          // Accumulate weights into the hidden layer
          for (let h = 0; h < HIDDEN_SIZE; h++) {
            accumWhite[h] += this.weightsIH[fIndex * HIDDEN_SIZE + h];
            // Black perspective mirrors or evaluates directly
            accumBlack[h] += this.weightsIH[fIndex * HIDDEN_SIZE + h];
          }

          temp &= temp - 1n;
        }
      }
    }

    return { accumWhite, accumBlack };
  }

  /**
   * Incremental accumulator update
   * In a real engine search, this is called during makeMove to update accumulators in O(1)
   */
  public updateAccumulators(
    accumWhite: Float32Array,
    accumBlack: Float32Array,
    m: Move,
    sideToMove: number
  ) {
    const opp = sideToMove ^ 1;

    // 1. Remove moving piece from the origin square
    const fromF = this.getFeatureIndex(sideToMove, m.piece, m.from);
    for (let h = 0; h < HIDDEN_SIZE; h++) {
      accumWhite[h] -= this.weightsIH[fromF * HIDDEN_SIZE + h];
      accumBlack[h] -= this.weightsIH[fromF * HIDDEN_SIZE + h];
    }

    // 2. Add moving (or promoted) piece to destination square
    const destPiece = m.promotion !== -1 ? m.promotion : m.piece;
    const toF = this.getFeatureIndex(sideToMove, destPiece, m.to);
    for (let h = 0; h < HIDDEN_SIZE; h++) {
      accumWhite[h] += this.weightsIH[toF * HIDDEN_SIZE + h];
      accumBlack[h] += this.weightsIH[toF * HIDDEN_SIZE + h];
    }

    // 3. Handle captures
    if (m.captured !== -1) {
      const capF = this.getFeatureIndex(opp, m.captured, m.to);
      for (let h = 0; h < HIDDEN_SIZE; h++) {
        accumWhite[h] -= this.weightsIH[capF * HIDDEN_SIZE + h];
        accumBlack[h] -= this.weightsIH[capF * HIDDEN_SIZE + h];
      }
    }
  }

  /**
   * Run forward propagation on the active accumulators
   */
  public evaluateAccumulators(accumWhite: Float32Array, accumBlack: Float32Array): number {
    let output = this.biasO;

    // Apply Clipped ReLU activation function: f(x) = max(0, min(127, x))
    // Rescaled here to clamp between 0 and 100 for evaluation scaling
    for (let h = 0; h < HIDDEN_SIZE; h++) {
      const valW = Math.max(0, Math.min(100, accumWhite[h]));
      const valB = Math.max(0, Math.min(100, accumBlack[h]));

      output += valW * this.weightsHO[h];
      output += valB * this.weightsHO[HIDDEN_SIZE + h];
    }

    return Math.round(output);
  }
}

// Global NNUE instance
export const nnueEvaluator = new MicroNNUE();
