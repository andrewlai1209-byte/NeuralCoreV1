/**
 * Transposition Table entry representing alpha-beta search bounds caching
 */
export interface TTEntry {
  depth: number;
  score: number;
  flag: 'EXACT' | 'ALPHA' | 'BETA';
  bestMove: string;
}

/**
 * Transposition Table for caching chess search calculations across evaluations
 */
export class TranspositionTable {
  private table: Map<string, TTEntry>;
  private maxEntries: number;

  constructor(maxEntries: number = 100000) {
    this.table = new Map();
    this.maxEntries = maxEntries;
  }

  /**
   * Retrieves a cached search node
   */
  public get(key: string): TTEntry | undefined {
    return this.table.get(key);
  }

  /**
   * Caches a search node, checking for table bounds limit to prevent memory leaks
   */
  public set(key: string, entry: TTEntry): void {
    if (this.table.size >= this.maxEntries) {
      this.clear(); // Safe eviction
    }
    this.table.set(key, entry);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.table.clear();
  }

  /**
   * Get the current size of the Transposition Table
   */
  public size(): number {
    return this.table.size;
  }
}
