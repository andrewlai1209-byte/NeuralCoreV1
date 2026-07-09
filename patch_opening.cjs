const fs = require('fs');

const code = `
export class OpeningTrieNode {
  children: Record<string, OpeningTrieNode> = {};
  moves: string[] = [];
}

export class OpeningBook {
  root: OpeningTrieNode = new OpeningTrieNode();

  addSequence(sequence: string[]) {
    let current = this.root;
    for (let i = 0; i < sequence.length; i++) {
      const move = sequence[i];
      if (!current.children[move]) {
        current.children[move] = new OpeningTrieNode();
        current.moves.push(move);
      }
      current = current.children[move];
    }
  }

  getMoves(history: string[]): string[] {
    let current = this.root;
    for (const move of history) {
      if (!current.children[move]) return [];
      current = current.children[move];
    }
    return current.moves;
  }
}

export const globalOpeningBook = new OpeningBook();

// Grandmaster repertoires
globalOpeningBook.addSequence(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']); // Ruy Lopez
globalOpeningBook.addSequence(['e4', 'c5', 'Nf3', 'd6', 'd4']); // Sicilian
globalOpeningBook.addSequence(['d4', 'Nf6', 'c4', 'e6', 'Nc3']); // Nimzo/Queen's Indian
globalOpeningBook.addSequence(['d4', 'd5', 'c4', 'e6']); // Queen's Gambit Declined
globalOpeningBook.addSequence(['e4', 'e6', 'd4', 'd5']); // French
globalOpeningBook.addSequence(['e4', 'c6', 'd4', 'd5']); // Caro-Kann

export function getOpeningMove(history: string[]): string | null {
  const moves = globalOpeningBook.getMoves(history);
  if (!moves || moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}
`;

fs.writeFileSync('src/lib/openingBook.ts', code);
