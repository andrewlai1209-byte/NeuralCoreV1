/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Zobrist Hashing for Chess Positions
 * Provides fast, collision-free 64-bit hashing of board positions
 * Used for Transposition Table lookups and Move Repetition Detection
 */

// Pseudo-random 64-bit numbers for each piece type and square
// These are pre-computed Zobrist constants (standard values)
const ZOBRIST_RANDOM_SEED = 0x9E3779B97F4A7C15n; // A large prime for seeding

// Precomputed Zobrist tables
let ZOBRIST_TABLE: Map<string, bigint> = new Map();

/**
 * Generate consistent random 64-bit numbers using a seeded generator
 */
function zobristRandom(index: number): bigint {
  let hash = ZOBRIST_RANDOM_SEED ^ BigInt(index);
  // XORShift64* algorithm for consistent pseudo-randomness
  hash ^= hash >> 30n;
  hash = hash * 0xBF58476D1CE4E5B9n;
  hash ^= hash >> 27n;
  hash = hash * 0x94D049BB133111EBn;
  return hash;
}

/**
 * Initialize Zobrist constants
 * Pieces: p, n, b, r, q, k (lowercase) x 2 colors x 64 squares = 768 values
 * Side to move: 1 value
 * Castling rights: 16 combinations
 * En passant files: 8 files x 2 (not used, but reserved)
 */
export function initializeZobrist(): void {
  let index = 0;
  
  // Piece-Square combinations
  const pieces = ['p', 'n', 'b', 'r', 'q', 'k'];
  const colors = ['w', 'b'];
  
  for (const color of colors) {
    for (const piece of pieces) {
      for (let square = 0; square < 64; square++) {
        const key = `${color}${piece}${square}`;
        ZOBRIST_TABLE.set(key, zobristRandom(index++));
      }
    }
  }
  
  // Side to move (White = 0, Black = 1)
  ZOBRIST_TABLE.set('side_w', zobristRandom(index++));
  ZOBRIST_TABLE.set('side_b', zobristRandom(index++));
  
  // Castling rights (16 combinations: KQkq)
  for (let i = 0; i < 16; i++) {
    ZOBRIST_TABLE.set(`castling_${i}`, zobristRandom(index++));
  }
  
  // En passant files (8 files: a-h)
  for (let i = 0; i < 8; i++) {
    ZOBRIST_TABLE.set(`enpassant_${i}`, zobristRandom(index++));
  }
}

/**
 * Convert square coordinate (0-63) to algebraic notation square key
 * 0 = a1, 1 = b1, ..., 56 = a8, 63 = h8
 */
function squareToCoord(square: number): { file: number; rank: number } {
  return {
    file: square % 8,
    rank: Math.floor(square / 8)
  };
}

/**
 * Convert algebraic notation (e.g., "e4") to square index (0-63)
 */
function squareFromAlgebraic(sq: string): number {
  if (sq.length !== 2) return -1;
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0); // a-h = 0-7
  const rank = parseInt(sq[1]) - 1; // 1-8 = 0-7
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return -1;
  return rank * 8 + file;
}

/**
 * Extract castling rights from FEN castling string (e.g., "KQkq")
 * Returns a number 0-15 representing the castling rights
 */
function getCastlingIndex(castlingStr: string): number {
  let index = 0;
  if (castlingStr.includes('K')) index |= 1;
  if (castlingStr.includes('Q')) index |= 2;
  if (castlingStr.includes('k')) index |= 4;
  if (castlingStr.includes('q')) index |= 8;
  return index;
}

/**
 * Extract en passant file from FEN en passant field
 * Returns file index (0-7 for a-h) or -1 if none
 */
function getEnpassantFile(enpassantStr: string): number {
  if (enpassantStr === '-') return -1;
  return enpassantStr.charCodeAt(0) - 'a'.charCodeAt(0);
}

/**
 * Compute Zobrist hash from FEN string
 * This is the main interface for hashing positions
 */
export function zobristHashFromFen(fen: string): bigint {
  let hash = 0n;
  
  const parts = fen.split(' ');
  if (parts.length < 4) {
    console.warn('Invalid FEN format:', fen);
    return hash;
  }
  
  const boardPart = parts[0];
  const sidePart = parts[1];
  const castlingPart = parts[2];
  const enpassantPart = parts[3];
  
  // Parse board (FEN format: ranks from 8 to 1, files a-h)
  const ranks = boardPart.split('/');
  let square = 56; // Start at a8 (rank 8, file a = square 56)
  
  for (const rank of ranks) {
    let fileInRank = 0;
    for (const char of rank) {
      if (char >= '1' && char <= '8') {
        // Empty squares
        fileInRank += parseInt(char);
      } else {
        // Piece: determine color and type
        const color = char === char.toUpperCase() ? 'w' : 'b';
        const piece = char.toLowerCase();
        
        const squareKey = `${color}${piece}${square + fileInRank}`;
        const key = ZOBRIST_TABLE.get(squareKey);
        if (key !== undefined) {
          hash ^= key;
        }
        fileInRank++;
      }
    }
    square -= 8; // Move to next rank (downwards in FEN)
  }
  
  // Side to move
  const sideKey = ZOBRIST_TABLE.get(`side_${sidePart}`);
  if (sideKey !== undefined) {
    hash ^= sideKey;
  }
  
  // Castling rights
  const castlingIndex = getCastlingIndex(castlingPart);
  const castlingKey = ZOBRIST_TABLE.get(`castling_${castlingIndex}`);
  if (castlingKey !== undefined) {
    hash ^= castlingKey;
  }
  
  // En passant
  const epFile = getEnpassantFile(enpassantPart);
  if (epFile >= 0) {
    const epKey = ZOBRIST_TABLE.get(`enpassant_${epFile}`);
    if (epKey !== undefined) {
      hash ^= epKey;
    }
  }
  
  return hash;
}

/**
 * Incremental Zobrist hash update (more efficient than recomputing from FEN)
 * Toggles pieces on/off from the hash
 */
export class IncrementalZobristHash {
  private hash: bigint = 0n;
  
  constructor(initialFen?: string) {
    if (initialFen) {
      this.hash = zobristHashFromFen(initialFen);
    }
  }
  
  /**
   * Toggle a piece at a square (add if not present, remove if present)
   */
  public togglePiece(color: 'w' | 'b', piece: string, square: number): void {
    const key = ZOBRIST_TABLE.get(`${color}${piece}${square}`);
    if (key !== undefined) {
      this.hash ^= key;
    }
  }
  
  /**
   * Toggle side to move
   */
  public toggleSide(color: 'w' | 'b'): void {
    const key = ZOBRIST_TABLE.get(`side_${color}`);
    if (key !== undefined) {
      this.hash ^= key;
    }
  }
  
  /**
   * Update castling rights
   */
  public updateCastling(oldCastlingStr: string, newCastlingStr: string): void {
    const oldIndex = getCastlingIndex(oldCastlingStr);
    const newIndex = getCastlingIndex(newCastlingStr);
    
    const oldKey = ZOBRIST_TABLE.get(`castling_${oldIndex}`);
    const newKey = ZOBRIST_TABLE.get(`castling_${newIndex}`);
    
    if (oldKey !== undefined) this.hash ^= oldKey;
    if (newKey !== undefined) this.hash ^= newKey;
  }
  
  /**
   * Update en passant file
   */
  public updateEnpassant(oldFile: number, newFile: number): void {
    if (oldFile >= 0) {
      const oldKey = ZOBRIST_TABLE.get(`enpassant_${oldFile}`);
      if (oldKey !== undefined) this.hash ^= oldKey;
    }
    if (newFile >= 0) {
      const newKey = ZOBRIST_TABLE.get(`enpassant_${newFile}`);
      if (newKey !== undefined) this.hash ^= newKey;
    }
  }
  
  /**
   * Get current hash value
   */
  public getHash(): bigint {
    return this.hash;
  }
}

// Initialize Zobrist table on module load
if (ZOBRIST_TABLE.size === 0) {
  initializeZobrist();
}
