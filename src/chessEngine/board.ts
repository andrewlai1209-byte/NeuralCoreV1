import { EMPTY, ALL, setBit, clearBit, toggleBit, checkBit, popLSB, popCount } from './core';
import { KNIGHT_ATTACKS, KING_ATTACKS, PAWN_ATTACKS, getSliderAttacks } from './attacks';

export const PIECE_PAWN = 0;
export const PIECE_KNIGHT = 1;
export const PIECE_BISHOP = 2;
export const PIECE_ROOK = 3;
export const PIECE_QUEEN = 4;
export const PIECE_KING = 5;

export const COLOR_WHITE = 0;
export const COLOR_BLACK = 1;

export class BitboardEngine {
  public pieceBB: bigint[][] = [
    [0n, 0n, 0n, 0n, 0n, 0n],
    [0n, 0n, 0n, 0n, 0n, 0n]
  ];
  public colorBB: bigint[] = [0n, 0n];
  public occupied: bigint = 0n;

  public sideToMove: number = COLOR_WHITE;
  public epSquare: number = -1; // 0-63, -1 if none
  public castlingRights: number = 15; // WK=1, WQ=2, BK=4, BQ=8
  public halfMoveClock: number = 0;
  public fullMoveNumber: number = 1;

  public history: any[] = [];

  constructor() {
    this.parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  }

  public parseFen(fen: string) {
    this.pieceBB = [[0n,0n,0n,0n,0n,0n], [0n,0n,0n,0n,0n,0n]];
    this.colorBB = [0n, 0n];
    this.occupied = 0n;
    this.history = [];

    const parts = fen.split(' ');
    const boardStr = parts[0];
    
    let sq = 56; // a8
    for (let i = 0; i < boardStr.length; i++) {
      const char = boardStr[i];
      if (char === '/') {
        sq -= 16;
      } else if (char >= '1' && char <= '8') {
        sq += parseInt(char, 10);
      } else {
        const isWhite = char === char.toUpperCase();
        const color = isWhite ? COLOR_WHITE : COLOR_BLACK;
        const typeChar = char.toLowerCase();
        let type = -1;
        if (typeChar === 'p') type = PIECE_PAWN;
        if (typeChar === 'n') type = PIECE_KNIGHT;
        if (typeChar === 'b') type = PIECE_BISHOP;
        if (typeChar === 'r') type = PIECE_ROOK;
        if (typeChar === 'q') type = PIECE_QUEEN;
        if (typeChar === 'k') type = PIECE_KING;

        if (type !== -1) {
          const bit = 1n << BigInt(sq);
          this.pieceBB[color][type] |= bit;
          this.colorBB[color] |= bit;
        }
        sq++;
      }
    }
    
    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
    this.sideToMove = parts[1] === 'w' ? COLOR_WHITE : COLOR_BLACK;
    
    this.castlingRights = 0;
    if (parts[2] !== '-') {
      if (parts[2].includes('K')) this.castlingRights |= 1;
      if (parts[2].includes('Q')) this.castlingRights |= 2;
      if (parts[2].includes('k')) this.castlingRights |= 4;
      if (parts[2].includes('q')) this.castlingRights |= 8;
    }

    this.epSquare = -1;
    if (parts[3] !== '-') {
      const file = parts[3].charCodeAt(0) - 'a'.charCodeAt(0);
      const rank = parts[3].charCodeAt(1) - '1'.charCodeAt(0);
      this.epSquare = rank * 8 + file;
    }

    this.halfMoveClock = parseInt(parts[4] || '0', 10);
    this.fullMoveNumber = parseInt(parts[5] || '1', 10);
  }

  // Very basic pseudo-legal move generation
  // For production, needs pins, checks, castling blocks, etc.
  public inCheck(color: number): boolean {
    const kingBB = this.pieceBB[color][PIECE_KING];
    if (kingBB === 0n) return false;
    const kingSq = popLSB(kingBB).sq;
    return this.isSquareAttacked(kingSq, color ^ 1);
  }

  public isSquareAttacked(sq: number, byColor: number): boolean {
    const opp = byColor;
    const bbOpp = this.colorBB[opp];
    
    // Knights
    if ((KNIGHT_ATTACKS[sq] & this.pieceBB[opp][PIECE_KNIGHT]) !== 0n) return true;
    
    // Pawns
    if ((PAWN_ATTACKS[opp ^ 1][sq] & this.pieceBB[opp][PIECE_PAWN]) !== 0n) return true;
    
    // King
    if ((KING_ATTACKS[sq] & this.pieceBB[opp][PIECE_KING]) !== 0n) return true;
    
    // Sliders
    const rooksQueens = this.pieceBB[opp][PIECE_ROOK] | this.pieceBB[opp][PIECE_QUEEN];
    if (rooksQueens !== 0n) {
      if ((getSliderAttacks(sq, this.occupied, true, false) & rooksQueens) !== 0n) return true;
    }
    
    const bishopsQueens = this.pieceBB[opp][PIECE_BISHOP] | this.pieceBB[opp][PIECE_QUEEN];
    if (bishopsQueens !== 0n) {
      if ((getSliderAttacks(sq, this.occupied, false, true) & bishopsQueens) !== 0n) return true;
    }

    return false;
  }

  public makeMove(m: import('./movegen').Move): void {
    this.history.push({
      epSquare: this.epSquare,
      castlingRights: this.castlingRights,
      halfMoveClock: this.halfMoveClock,
      capturedBB: this.pieceBB[this.sideToMove ^ 1].map(x => x)
    });

    const fromBB = 1n << BigInt(m.from);
    const toBB = 1n << BigInt(m.to);
    const color = this.sideToMove;
    const opp = color ^ 1;

    // Remove from
    this.pieceBB[color][m.piece] &= ~fromBB;
    this.colorBB[color] &= ~fromBB;

    // Handle captures
    if (m.captured !== -1) {
      this.pieceBB[opp][m.captured] &= ~toBB;
      this.colorBB[opp] &= ~toBB;
      this.halfMoveClock = 0;
    } else if (m.piece === PIECE_PAWN) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    // Place at to
    let putPiece = m.piece;
    if (m.promotion !== -1) putPiece = m.promotion;
    
    this.pieceBB[color][putPiece] |= toBB;
    this.colorBB[color] |= toBB;

    // Handle castling rook moves
    if (m.flags === 2) {
      if (m.to === 62) { // wk
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 63n) | (1n << 61n);
        this.colorBB[color] ^= (1n << 63n) | (1n << 61n);
      } else if (m.to === 58) { // wq
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 56n) | (1n << 59n);
        this.colorBB[color] ^= (1n << 56n) | (1n << 59n);
      } else if (m.to === 6) { // bk
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 7n) | (1n << 5n);
        this.colorBB[color] ^= (1n << 7n) | (1n << 5n);
      } else if (m.to === 2) { // bq
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 0n) | (1n << 3n);
        this.colorBB[color] ^= (1n << 0n) | (1n << 3n);
      }
    }

    // Update castling rights
    if (m.piece === PIECE_KING) {
      if (color === COLOR_WHITE) this.castlingRights &= ~(1 | 2);
      else this.castlingRights &= ~(4 | 8);
    }
    if (m.from === 63 || m.to === 63) this.castlingRights &= ~1;
    if (m.from === 56 || m.to === 56) this.castlingRights &= ~2;
    if (m.from === 7 || m.to === 7) this.castlingRights &= ~4;
    if (m.from === 0 || m.to === 0) this.castlingRights &= ~8;

    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
    this.sideToMove ^= 1;
    if (this.sideToMove === COLOR_WHITE) this.fullMoveNumber++;
  }

  public undoMove(m: import('./movegen').Move): void {
    const state = this.history.pop();
    if (!state) return;

    this.sideToMove ^= 1;
    if (this.sideToMove === COLOR_BLACK) this.fullMoveNumber--;

    const color = this.sideToMove;
    const opp = color ^ 1;
    const fromBB = 1n << BigInt(m.from);
    const toBB = 1n << BigInt(m.to);

    let putPiece = m.promotion !== -1 ? m.promotion : m.piece;

    this.pieceBB[color][putPiece] &= ~toBB;
    this.colorBB[color] &= ~toBB;

    this.pieceBB[color][m.piece] |= fromBB;
    this.colorBB[color] |= fromBB;

    if (m.captured !== -1) {
      this.pieceBB[opp][m.captured] |= toBB;
      this.colorBB[opp] |= toBB;
    }

    if (m.flags === 2) {
      if (m.to === 62) {
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 63n) | (1n << 61n);
        this.colorBB[color] ^= (1n << 63n) | (1n << 61n);
      } else if (m.to === 58) {
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 56n) | (1n << 59n);
        this.colorBB[color] ^= (1n << 56n) | (1n << 59n);
      } else if (m.to === 6) {
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 7n) | (1n << 5n);
        this.colorBB[color] ^= (1n << 7n) | (1n << 5n);
      } else if (m.to === 2) {
        this.pieceBB[color][PIECE_ROOK] ^= (1n << 0n) | (1n << 3n);
        this.colorBB[color] ^= (1n << 0n) | (1n << 3n);
      }
    }

    this.epSquare = state.epSquare;
    this.castlingRights = state.castlingRights;
    this.halfMoveClock = state.halfMoveClock;
    this.occupied = this.colorBB[COLOR_WHITE] | this.colorBB[COLOR_BLACK];
  }
}
