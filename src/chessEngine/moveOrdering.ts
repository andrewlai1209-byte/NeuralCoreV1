import { Chess } from 'chess.js';

/**
 * Sort moves to optimize Alpha-Beta Pruning (PV move / MVV-LVA / Killer Moves / History Heuristics)
 */
export function sortMoves(
  chess: Chess,
  moves: any[],
  ply: number,
  ttMove: any | null,
  killerMoves: { from: string; to: string; promotion?: string }[][],
  historyMoves: Record<string, number>
): any[] {
  const valueMap: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  
  return moves.map(m => {
    let priority = 0;
    
    // 1. PV/TT Best Move has highest priority
    if (ttMove && m.from === ttMove.from && m.to === ttMove.to && m.promotion === ttMove.promotion) {
      priority += 100000;
    }

    // 2. Captures: MVV-LVA (Most Valuable Victim, Least Valuable Assault)
    if (m.captured) {
      priority += 10000 + valueMap[m.captured] - (valueMap[m.piece] / 100);
    }

    // 3. Promotion
    if (m.promotion) {
      priority += 9000 + valueMap[m.promotion];
    }

    // 4. Killer Moves (quiet moves that caused beta cutoffs in sibling nodes at this depth)
    const plyKillers = killerMoves[ply];
    if (plyKillers) {
      if (plyKillers[0] && m.from === plyKillers[0].from && m.to === plyKillers[0].to) {
        priority += 8000;
      } else if (plyKillers[1] && m.from === plyKillers[1].from && m.to === plyKillers[1].to) {
        priority += 7000;
      }
    }

    // 5. Checks
    if (m.san && m.san.includes('+')) {
      priority += 5000;
    }

    // 6. History Heuristics for quiet moves
    const historyKey = `${m.from}_${m.to}_${m.promotion || ''}`;
    const historyScore = historyMoves[historyKey] || 0;
    priority += Math.min(4000, historyScore);

    // 7. Castling
    if (m.flags && (m.flags.includes('k') || m.flags.includes('q'))) {
      priority += 1000;
    }
    
    return { move: m, priority };
  })
  .sort((a, b) => b.priority - a.priority)
  .map(x => x.move);
}
