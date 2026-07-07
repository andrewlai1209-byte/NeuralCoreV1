/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chess } from 'chess.js';

// Global Bitboard Constants (64-bit unsigned BigInts)
export const EMPTY = 0n;
export const ALL = 0xffffffffffffffffn;

// Rank and File Masks
export const FILE_MASKS: bigint[] = [];
export const RANK_MASKS: bigint[] = [];

for (let file = 0; file < 8; file++) {
  let mask = 0n;
  for (let rank = 0; rank < 8; rank++) {
    mask |= 1n << BigInt(file + rank * 8);
  }
  FILE_MASKS.push(mask);
}

for (let rank = 0; rank < 8; rank++) {
  let mask = 0n;
  for (let file = 0; file < 8; file++) {
    mask |= 1n << BigInt(file + rank * 8);
  }
  RANK_MASKS.push(mask);
}

// Adjacent File Masks
export const ADJACENT_FILE_MASKS: bigint[] = [];
for (let file = 0; file < 8; file++) {
  let mask = 0n;
  if (file > 0) mask |= FILE_MASKS[file - 1];
  if (file < 7) mask |= FILE_MASKS[file + 1];
  ADJACENT_FILE_MASKS.push(mask);
}

// Central Squares (e4, d4, e5, d5, c4, c5, f4, f5)
export const CENTER_CORE_MASK = 
  (1n << 27n) | (1n << 28n) | // e4, d4 (ranks/files indexes based on 0-63)
  (1n << 35n) | (1n << 36n); // e5, d5

export const CENTER_EXTENDED_MASK =
  (1n << 18n) | (1n << 19n) | (1n << 20n) | (1n << 21n) | // c3, d3, e3, f3
  (1n << 26n) | (1n << 29n) | // c4, f4
  (1n << 34n) | (1n << 37n) | // c5, f5
  (1n << 42n) | (1n << 43n) | (1n << 44n) | (1n << 45n); // c6, d6, e6, f6

// Passed Pawn and King Shield Precalculated Masks
export const PASSED_PAWN_WHITE_MASKS = new Array<bigint>(64).fill(0n);
export const PASSED_PAWN_BLACK_MASKS = new Array<bigint>(64).fill(0n);
export const KING_SHIELD_WHITE_MASKS = new Array<bigint>(64).fill(0n);
export const KING_SHIELD_BLACK_MASKS = new Array<bigint>(64).fill(0n);

// Initialize Precalculated Masks
for (let file = 0; file < 8; file++) {
  for (let rank = 0; rank < 8; rank++) {
    const sq = file + rank * 8;

    // Passed Pawn Masks: Columns front-left, front, front-right of the pawn
    let whitePassed = 0n;
    let blackPassed = 0n;

    for (let r = rank + 1; r < 8; r++) {
      whitePassed |= 1n << BigInt(file + r * 8);
      if (file > 0) whitePassed |= 1n << BigInt((file - 1) + r * 8);
      if (file < 7) whitePassed |= 1n << BigInt((file + 1) + r * 8);
    }

    for (let r = rank - 1; r >= 0; r--) {
      blackPassed |= 1n << BigInt(file + r * 8);
      if (file > 0) blackPassed |= 1n << BigInt((file - 1) + r * 8);
      if (file < 7) blackPassed |= 1n << BigInt((file + 1) + r * 8);
    }

    PASSED_PAWN_WHITE_MASKS[sq] = whitePassed;
    PASSED_PAWN_BLACK_MASKS[sq] = blackPassed;

    // King Shield Masks: Three squares in front of the King
    let whiteShield = 0n;
    if (rank < 7) {
      whiteShield |= 1n << BigInt(file + (rank + 1) * 8);
      if (file > 0) whiteShield |= 1n << BigInt((file - 1) + (rank + 1) * 8);
      if (file < 7) whiteShield |= 1n << BigInt((file + 1) + (rank + 1) * 8);
    }
    KING_SHIELD_WHITE_MASKS[sq] = whiteShield;

    let blackShield = 0n;
    if (rank > 0) {
      blackShield |= 1n << BigInt(file + (rank - 1) * 8);
      if (file > 0) blackShield |= 1n << BigInt((file - 1) + (rank - 1) * 8);
      if (file < 7) blackShield |= 1n << BigInt((file + 1) + (rank - 1) * 8);
    }
    KING_SHIELD_BLACK_MASKS[sq] = blackShield;
  }
}

/**
 * High-performance bit counter (popCount / Hamming weight) for 64-bit integers
 */
export function popCount(bb: bigint): number {
  let count = 0;
  let temp = bb & ALL; // Ensure 64-bit unsigned limits
  while (temp > 0n) {
    temp &= temp - 1n;
    count++;
  }
  return count;
}

/**
 * Convert Chess.js board status into modern 64-bit Bitboard representation
 */
export interface BoardBitboards {
  wp: bigint; wn: bigint; wb: bigint; wr: bigint; wq: bigint; wk: bigint;
  bp: bigint; bn: bigint; bb: bigint; br: bigint; bq: bigint; bk: bigint;
  whitePieces: bigint;
  blackPieces: bigint;
  occupied: bigint;
}

export function convertToBitboards(chess: Chess): BoardBitboards {
  let wp = 0n, wn = 0n, wb = 0n, wr = 0n, wq = 0n, wk = 0n;
  let bp = 0n, bn = 0n, bb = 0n, br = 0n, bq = 0n, bk = 0n;

  const board = chess.board();

  // chess.js maps row 0 as rank 8, row 7 as rank 1
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;

      const file = c;
      const rank = 7 - r; // index 0-7 represents rank 1-8
      const bitIndex = BigInt(file + rank * 8);
      const mask = 1n << bitIndex;

      if (cell.color === 'w') {
        switch (cell.type) {
          case 'p': wp |= mask; break;
          case 'n': wn |= mask; break;
          case 'b': wb |= mask; break;
          case 'r': wr |= mask; break;
          case 'q': wq |= mask; break;
          case 'k': wk |= mask; break;
        }
      } else {
        switch (cell.type) {
          case 'p': bp |= mask; break;
          case 'n': bn |= mask; break;
          case 'b': bb |= mask; break;
          case 'r': br |= mask; break;
          case 'q': bq |= mask; break;
          case 'k': bk |= mask; break;
        }
      }
    }
  }

  const whitePieces = wp | wn | wb | wr | wq | wk;
  const blackPieces = bp | bn | bb | br | bq | bk;
  const occupied = whitePieces | blackPieces;

  return {
    wp, wn, wb, wr, wq, wk,
    bp, bn, bb, br, bq, bk,
    whitePieces,
    blackPieces,
    occupied
  };
}
