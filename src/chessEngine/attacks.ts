import { setBit } from './core';

export const KNIGHT_ATTACKS: bigint[] = new Array(64).fill(0n);
export const KING_ATTACKS: bigint[] = new Array(64).fill(0n);
export const PAWN_ATTACKS: bigint[][] = [new Array(64).fill(0n), new Array(64).fill(0n)]; // 0 = white, 1 = black

const NOT_A_FILE = 0xfefefefefefefefen;
const NOT_H_FILE = 0x7f7f7f7f7f7f7f7fn;
const NOT_AB_FILE = 0xfcfcfcfcfcfcfcfcn;
const NOT_GH_FILE = 0x3f3f3f3f3f3f3f3fn;

for (let sq = 0; sq < 64; sq++) {
  let bb = setBit(0n, sq);
  
  // Knight
  let nAttacks = 0n;
  nAttacks |= (bb << 17n) & NOT_A_FILE;
  nAttacks |= (bb << 15n) & NOT_H_FILE;
  nAttacks |= (bb << 10n) & NOT_AB_FILE;
  nAttacks |= (bb << 6n) & NOT_GH_FILE;
  nAttacks |= (bb >> 17n) & NOT_H_FILE;
  nAttacks |= (bb >> 15n) & NOT_A_FILE;
  nAttacks |= (bb >> 10n) & NOT_GH_FILE;
  nAttacks |= (bb >> 6n) & NOT_AB_FILE;
  KNIGHT_ATTACKS[sq] = nAttacks & 0xffffffffffffffffn;

  // King
  let kAttacks = 0n;
  kAttacks |= (bb << 8n);
  kAttacks |= (bb >> 8n);
  kAttacks |= (bb << 1n) & NOT_A_FILE;
  kAttacks |= (bb >> 1n) & NOT_H_FILE;
  kAttacks |= (bb << 9n) & NOT_A_FILE;
  kAttacks |= (bb >> 9n) & NOT_H_FILE;
  kAttacks |= (bb << 7n) & NOT_H_FILE;
  kAttacks |= (bb >> 7n) & NOT_A_FILE;
  KING_ATTACKS[sq] = kAttacks & 0xffffffffffffffffn;

  // Pawns
  PAWN_ATTACKS[0][sq] = ((bb << 7n) & NOT_H_FILE) | ((bb << 9n) & NOT_A_FILE);
  PAWN_ATTACKS[1][sq] = ((bb >> 7n) & NOT_A_FILE) | ((bb >> 9n) & NOT_H_FILE);
}

// Sliders (Ray attacks on the fly)
const RAYS_ROOK = [[0,1], [1,0], [0,-1], [-1,0]];
const RAYS_BISHOP = [[1,1], [1,-1], [-1,1], [-1,-1]];

export function getSliderAttacks(sq: number, block: bigint, isRook: boolean, isBishop: boolean): bigint {
  let attacks = 0n;
  const file = sq & 7;
  const rank = sq >> 3;

  const rays = [];
  if (isRook) rays.push(...RAYS_ROOK);
  if (isBishop) rays.push(...RAYS_BISHOP);

  for (const [df, dr] of rays) {
    for (let f = file + df, r = rank + dr; f >= 0 && f <= 7 && r >= 0 && r <= 7; f += df, r += dr) {
      const trgSq = r * 8 + f;
      attacks |= (1n << BigInt(trgSq));
      if ((block & (1n << BigInt(trgSq))) !== 0n) {
        break;
      }
    }
  }
  return attacks;
}
