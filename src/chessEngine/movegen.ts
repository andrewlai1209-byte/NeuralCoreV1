import { BitboardEngine, COLOR_WHITE, COLOR_BLACK, PIECE_PAWN, PIECE_KNIGHT, PIECE_BISHOP, PIECE_ROOK, PIECE_QUEEN, PIECE_KING } from './board';
import { KNIGHT_ATTACKS, KING_ATTACKS, PAWN_ATTACKS, getSliderAttacks } from './attacks';
import { popLSB } from './core';

export interface Move {
  from: number;
  to: number;
  piece: number;
  captured: number;
  promotion: number;
  flags: number; // 0 = normal, 1 = ep, 2 = castle, 4 = pawn double push
}

export function generateMoves(board: BitboardEngine, capturesOnly: boolean = false): Move[] {
  const moves: Move[] = [];
  const color = board.sideToMove;
  const opp = color ^ 1;
  const friendlyBB = board.colorBB[color];
  const enemyBB = board.colorBB[opp];
  const occupied = board.occupied;

  const getCaptured = (to: number): number => {
    for (let pt = 0; pt < 6; pt++) {
      if ((board.pieceBB[opp][pt] & (1n << BigInt(to))) !== 0n) return pt;
    }
    return -1;
  };

  const addMove = (from: number, to: number, piece: number, captured: number, flags: number = 0) => {
    if (capturesOnly && captured === -1 && flags !== 1) return; // eps is a capture
    
    // Pawn promotion
    if (piece === PIECE_PAWN && (to >= 56 || to <= 7)) {
      moves.push({ from, to, piece, captured, promotion: PIECE_QUEEN, flags });
      if (!capturesOnly) {
        moves.push({ from, to, piece, captured, promotion: PIECE_ROOK, flags });
        moves.push({ from, to, piece, captured, promotion: PIECE_BISHOP, flags });
        moves.push({ from, to, piece, captured, promotion: PIECE_KNIGHT, flags });
      }
    } else {
      moves.push({ from, to, piece, captured, promotion: -1, flags });
    }
  };

  // Pawns
  let pawns = board.pieceBB[color][PIECE_PAWN];
  const forwardDir = color === COLOR_WHITE ? 8n : -8n;
  const rank3 = color === COLOR_WHITE ? 2 : 5;
  
  while (pawns !== 0n) {
    const { sq: from, bb: remaining } = popLSB(pawns);
    pawns = remaining;
    
    // Forward moves
    if (!capturesOnly) {
      const to = from + Number(forwardDir);
      if ((occupied & (1n << BigInt(to))) === 0n) {
        addMove(from, to, PIECE_PAWN, -1, 0);
        
        // Double push
        if (Math.floor(from / 8) === (color === COLOR_WHITE ? 1 : 6)) {
          const to2 = to + Number(forwardDir);
          if ((occupied & (1n << BigInt(to2))) === 0n) {
            addMove(from, to2, PIECE_PAWN, -1, 4);
          }
        }
      }
    }

    // Attacks
    let attacks = PAWN_ATTACKS[color][from] & enemyBB;
    while (attacks !== 0n) {
      const { sq: to, bb: remAttacks } = popLSB(attacks);
      attacks = remAttacks;
      addMove(from, to, PIECE_PAWN, getCaptured(to), 0);
    }

    // En Passant
    if (board.epSquare !== -1) {
      let epAttacks = PAWN_ATTACKS[color][from] & (1n << BigInt(board.epSquare));
      if (epAttacks !== 0n) {
        addMove(from, board.epSquare, PIECE_PAWN, PIECE_PAWN, 1);
      }
    }
  }

  // Knights
  let knights = board.pieceBB[color][PIECE_KNIGHT];
  while (knights !== 0n) {
    const { sq: from, bb: remaining } = popLSB(knights);
    knights = remaining;
    let attacks = KNIGHT_ATTACKS[from] & ~friendlyBB;
    while (attacks !== 0n) {
      const { sq: to, bb: remAttacks } = popLSB(attacks);
      attacks = remAttacks;
      addMove(from, to, PIECE_KNIGHT, getCaptured(to), 0);
    }
  }

  // Bishops
  let bishops = board.pieceBB[color][PIECE_BISHOP];
  while (bishops !== 0n) {
    const { sq: from, bb: remaining } = popLSB(bishops);
    bishops = remaining;
    let attacks = getSliderAttacks(from, occupied, false, true) & ~friendlyBB;
    while (attacks !== 0n) {
      const { sq: to, bb: remAttacks } = popLSB(attacks);
      attacks = remAttacks;
      addMove(from, to, PIECE_BISHOP, getCaptured(to), 0);
    }
  }

  // Rooks
  let rooks = board.pieceBB[color][PIECE_ROOK];
  while (rooks !== 0n) {
    const { sq: from, bb: remaining } = popLSB(rooks);
    rooks = remaining;
    let attacks = getSliderAttacks(from, occupied, true, false) & ~friendlyBB;
    while (attacks !== 0n) {
      const { sq: to, bb: remAttacks } = popLSB(attacks);
      attacks = remAttacks;
      addMove(from, to, PIECE_ROOK, getCaptured(to), 0);
    }
  }

  // Queens
  let queens = board.pieceBB[color][PIECE_QUEEN];
  while (queens !== 0n) {
    const { sq: from, bb: remaining } = popLSB(queens);
    queens = remaining;
    let attacks = getSliderAttacks(from, occupied, true, true) & ~friendlyBB;
    while (attacks !== 0n) {
      const { sq: to, bb: remAttacks } = popLSB(attacks);
      attacks = remAttacks;
      addMove(from, to, PIECE_QUEEN, getCaptured(to), 0);
    }
  }

  // King
  let kings = board.pieceBB[color][PIECE_KING];
  if (kings !== 0n) {
    const from = popLSB(kings).sq;
    let attacks = KING_ATTACKS[from] & ~friendlyBB;
    while (attacks !== 0n) {
      const { sq: to, bb: remAttacks } = popLSB(attacks);
      attacks = remAttacks;
      addMove(from, to, PIECE_KING, getCaptured(to), 0);
    }

    // Castling
    if (!capturesOnly && !board.inCheck(color)) {
      if (color === COLOR_WHITE) {
        if ((board.castlingRights & 1) && (occupied & ((1n << 61n) | (1n << 62n))) === 0n) {
          if (!board.isSquareAttacked(61, COLOR_BLACK)) addMove(60, 62, PIECE_KING, -1, 2);
        }
        if ((board.castlingRights & 2) && (occupied & ((1n << 57n) | (1n << 58n) | (1n << 59n))) === 0n) {
          if (!board.isSquareAttacked(59, COLOR_BLACK)) addMove(60, 58, PIECE_KING, -1, 2);
        }
      } else {
        if ((board.castlingRights & 4) && (occupied & ((1n << 5n) | (1n << 6n))) === 0n) {
          if (!board.isSquareAttacked(5, COLOR_WHITE)) addMove(4, 6, PIECE_KING, -1, 2);
        }
        if ((board.castlingRights & 8) && (occupied & ((1n << 1n) | (1n << 2n) | (1n << 3n))) === 0n) {
          if (!board.isSquareAttacked(3, COLOR_WHITE)) addMove(4, 2, PIECE_KING, -1, 2);
        }
      }
    }
  }

  // Filter out moves that leave us in check
  const legalMoves: Move[] = [];
  for (const m of moves) {
    board.makeMove(m);
    if (!board.inCheck(color)) {
      legalMoves.push(m);
    }
    board.undoMove(m);
  }

  return legalMoves;
}
