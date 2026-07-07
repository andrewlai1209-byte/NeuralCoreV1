export const EMPTY = 0n;
export const ALL = 0xffffffffffffffffn;

// Core bitboard operations
export function setBit(bb: bigint, sq: number): bigint {
  return bb | (1n << BigInt(sq));
}

export function clearBit(bb: bigint, sq: number): bigint {
  return bb & ~(1n << BigInt(sq));
}

export function toggleBit(bb: bigint, sq: number): bigint {
  return bb ^ (1n << BigInt(sq));
}

export function checkBit(bb: bigint, sq: number): boolean {
  return (bb & (1n << BigInt(sq))) !== 0n;
}

export function popLSB(bb: bigint): { sq: number; bb: bigint } {
  if (bb === 0n) return { sq: -1, bb: 0n };
  const lsb = bb & -bb;
  const sq = lsb.toString(2).length - 1;
  return { sq, bb: bb & (bb - 1n) };
}

export function popCount(bb: bigint): number {
  let count = 0;
  let temp = bb & ALL;
  while (temp > 0n) {
    temp &= temp - 1n;
    count++;
  }
  return count;
}
