// src/lib/openingBook.ts

export const LIGHTWEIGHT_OPENING_BOOK: Record<string, string[]> = {
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": ["e4", "d4", "Nf3"],
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": ["c5", "e5", "e6"],
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1": ["Nf6", "d5"],
};

export function getOpeningMove(fen: string): string | null {
  const moves = LIGHTWEIGHT_OPENING_BOOK[fen];
  if (!moves || moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}
