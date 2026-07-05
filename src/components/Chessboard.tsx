/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { useSound } from '../SoundContext';
import { Copy, Check } from 'lucide-react';

interface ChessboardProps {
  fen: string;
  onMove?: (move: { from: string; to: string; promotion?: string }) => void;
  interactive?: boolean;
  flipped?: boolean;
  highlightSquares?: string[]; // Squares to highlight (e.g. king in check, or last move)
  engineLastMoveSquares?: string[]; // Squares of the last engine move specifically
}

// Crisp, beautiful custom modern flat vector SVG paths for each chess piece
const ChessPieceSvg: React.FC<{ type: string; color: string; size: number }> = ({ type, color, size }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#1A1A1A';
  const stroke = isWhite ? '#334155' : '#F1F5F9';
  const strokeWidth = 1.5;

  switch (type) {
    case 'p': // Pawn
      return (
        <svg width={size} height={size} viewBox="0 0 45 45" className="drop-shadow-sm select-none">
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83.61-1.41 1.57-1.41 2.69 0 .99.43 1.87 1.13 2.5H13v3h19v-3h-5.13c.7-.63 1.13-1.51 1.13-2.5 0-1.12-.58-2.08-1.41-2.69C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'n': // Knight
      return (
        <svg width={size} height={size} viewBox="0 0 45 45" className="drop-shadow-md select-none">
          <path
            d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,24 13,24 C 13,24 14,20 18,20 C 18,20 17,21 15,25 C 13,29 13,31 16,31 C 18,31 21,30 23,27 C 25,24 26,20 28,19 C 30,18 31,19 31,19 C 31,19 32,14 29,11 C 26,8 22,10 22,10 z M 15,32 L 30,32 L 30,35 L 15,35 L 15,32 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'b': // Bishop
      return (
        <svg width={size} height={size} viewBox="0 0 45 45" className="drop-shadow-md select-none">
          <path
            d="M 9,36 L 36,36 L 36,39 L 9,39 L 9,36 z M 22.5,9 C 15,9 15,18 15,21 C 15,24 18,28 22.5,33 C 27,28 30,24 30,21 C 30,18 30,9 22.5,9 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <circle cx="22.5" cy="5" r="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M 18,15 L 27,15 M 22.5,12 L 22.5,22" stroke={stroke} strokeWidth={1.5} />
        </svg>
      );
    case 'r': // Rook
      return (
        <svg width={size} height={size} viewBox="0 0 45 45" className="drop-shadow-md select-none">
          <path
            d="M 9,34 L 36,34 L 36,38 L 9,38 L 9,34 z M 12,14 L 12,31 L 33,31 L 33,14 L 29.5,14 L 29.5,21 L 26.5,21 L 26.5,14 L 18.5,14 L 18.5,21 L 15.5,21 L 15.5,14 L 12,14 z M 9,10 L 12,10 L 12,13 L 17,13 L 17,10 L 20,10 L 20,13 L 25,13 L 25,10 L 28,10 L 28,13 L 33,13 L 33,10 L 36,10 L 36,14 L 9,14 L 9,10 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'q': // Queen
      return (
        <svg width={size} height={size} viewBox="0 0 45 45" className="drop-shadow-lg select-none">
          <path
            d="M 9,36 L 36,36 L 36,39 L 9,39 L 9,36 z M 9,15 L 14,31 L 31,31 L 36,15 L 29.5,26 L 22.5,12 L 15.5,26 L 9,15 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <circle cx="9" cy="12" r="1.5" fill={fill} stroke={stroke} strokeWidth={1} />
          <circle cx="15.5" cy="11" r="1.5" fill={fill} stroke={stroke} strokeWidth={1} />
          <circle cx="22.5" cy="8" r="1.5" fill={fill} stroke={stroke} strokeWidth={1} />
          <circle cx="29.5" cy="11" r="1.5" fill={fill} stroke={stroke} strokeWidth={1} />
          <circle cx="36" cy="12" r="1.5" fill={fill} stroke={stroke} strokeWidth={1} />
        </svg>
      );
    case 'k': // King
      return (
        <svg width={size} height={size} viewBox="0 0 45 45" className="drop-shadow-lg select-none">
          <path
            d="M 9,36 L 36,36 L 36,39 L 9,39 L 9,36 z M 11.5,16 C 11.5,16 11.5,26 15,29 C 18.5,32 26.5,32 30,29 C 33.5,26 33.5,16 33.5,16 C 33.5,16 29.5,18 22.5,18 C 15.5,18 11.5,16 11.5,16 z M 15,16 L 30,16 L 30,21 L 15,21 L 15,16 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* King Crown Cross */}
          <path d="M 22.5,5 L 22.5,13 M 18.5,9 L 26.5,9" stroke={stroke} strokeWidth={2} />
        </svg>
      );
    default:
      return null;
  }
};

const getPieceCount = (fenString: string): number => {
  const pieces = fenString.split(' ')[0];
  return (pieces.match(/[a-zA-Z]/g) || []).length;
};

const getChangedSquares = (chess1: Chess, chess2: Chess): Square[] => {
  const squares: Square[] = [];
  const filesList = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranksList = ['1', '2', '3', '4', '5', '6', '7', '8'];
  for (const file of filesList) {
    for (const rank of ranksList) {
      const sq = `${file}${rank}` as Square;
      const p1 = chess1.get(sq);
      const p2 = chess2.get(sq);
      if (JSON.stringify(p1) !== JSON.stringify(p2)) {
        squares.push(sq);
      }
    }
  }
  return squares;
};

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  onMove,
  interactive = true,
  flipped = false,
  highlightSquares = [],
  engineLastMoveSquares = []
}) => {
  const { playMoveSound } = useSound();
  const [chess, setChess] = useState<Chess>(new Chess(fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [keyboardCursor, setKeyboardCursor] = useState<Square | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [lastMoveSquares, setLastMoveSquares] = useState<Square[]>([]);
  const [copiedFen, setCopiedFen] = useState(false);
  const isFirstRender = useRef(true);

  // Keep internal chess instance in sync with the FEN prop
  useEffect(() => {
    try {
      const prevFen = chess.fen();
      if (fen !== prevFen) {
        const nextChess = new Chess(fen);
        
        // Find changed squares for the last move glow
        const changed = getChangedSquares(chess, nextChess);
        if (changed.length > 0 && changed.length <= 4) {
          setLastMoveSquares(changed);
        } else {
          setLastMoveSquares([]);
        }

        setChess(nextChess);
        setSelectedSquare(null);
        setLegalMoves([]);

        if (!isFirstRender.current) {
          // Determine the correct sound effect to play
          if (nextChess.isGameOver()) {
            playMoveSound('gameover');
          } else if (nextChess.inCheck()) {
            playMoveSound('check');
          } else {
            const hadMorePieces = getPieceCount(prevFen) > getPieceCount(fen);
            if (hadMorePieces) {
              playMoveSound('capture');
            } else {
              playMoveSound('move');
            }
          }
        }
      }
      isFirstRender.current = false;
    } catch (e) {
      console.error('Invalid FEN passed to Chessboard:', fen, e);
    }
  }, [fen]);

  const handleCopyFen = () => {
    try {
      navigator.clipboard.writeText(chess.fen());
      setCopiedFen(true);
      setTimeout(() => setCopiedFen(false), 2000);
    } catch (err) {
      console.error('Failed to copy FEN:', err);
    }
  };

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const orderedFiles = flipped ? [...files].reverse() : files;
  const orderedRanks = flipped ? [...ranks].reverse() : ranks;

  const moveCursor = (current: Square, direction: 'up' | 'down' | 'left' | 'right') => {
    const filesList = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranksList = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const file = current[0];
    const rank = current[1];
    let fIdx = filesList.indexOf(file);
    let rIdx = ranksList.indexOf(rank);

    // If flipped is true, visual up is ranks decreasing, visual down is ranks increasing.
    // Visual left is files increasing, visual right is files decreasing.
    const upStep = flipped ? -1 : 1;
    const downStep = flipped ? 1 : -1;
    const leftStep = flipped ? 1 : -1;
    const rightStep = flipped ? -1 : 1;

    if (direction === 'up') rIdx += upStep;
    if (direction === 'down') rIdx += downStep;
    if (direction === 'left') fIdx += leftStep;
    if (direction === 'right') fIdx += rightStep;

    fIdx = Math.max(0, Math.min(7, fIdx));
    rIdx = Math.max(0, Math.min(7, rIdx));

    return `${filesList[fIdx]}${ranksList[rIdx]}` as Square;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'].includes(e.key)) {
      e.preventDefault();
    } else {
      return;
    }

    if (!keyboardCursor) {
      setKeyboardCursor(flipped ? 'd5' : 'e4');
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        setKeyboardCursor(prev => moveCursor(prev || 'e4', 'up'));
        break;
      case 'ArrowDown':
        setKeyboardCursor(prev => moveCursor(prev || 'e4', 'down'));
        break;
      case 'ArrowLeft':
        setKeyboardCursor(prev => moveCursor(prev || 'e4', 'left'));
        break;
      case 'ArrowRight':
        setKeyboardCursor(prev => moveCursor(prev || 'e4', 'right'));
        break;
      case 'Enter':
      case ' ':
        if (keyboardCursor) {
          handleSquareClick(keyboardCursor);
        }
        break;
      case 'Escape':
        setSelectedSquare(null);
        setLegalMoves([]);
        setKeyboardCursor(null);
        break;
    }
  };

  const handleSquareClick = (square: Square) => {
    if (!interactive) return;

    // Set keyboard cursor to the clicked square for natural handoff
    setKeyboardCursor(square);

    // If a legal move destination is clicked
    if (legalMoves.includes(square) && selectedSquare) {
      // Find if this move requires promotion
      const moves = chess.moves({ square: selectedSquare, verbose: true });
      const move = moves.find(m => m.to === square);
      
      const isPromotion = move?.promotion !== undefined;
      
      if (onMove) {
        onMove({
          from: selectedSquare,
          to: square,
          promotion: isPromotion ? 'q' : undefined // default to queen promotion
        });
      }
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = chess.get(square);
    const turn = chess.turn();

    // If clicking their own piece
    if (piece && piece.color === turn) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(moves.map(m => m.to as Square));
    } else {
      // Clicked empty space or opponent piece (without it being a legal destination)
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  return (
    <div className="flex flex-col items-center w-full gap-2">
      <div 
        id="chessboard_container" 
        tabIndex={0}
        onFocus={() => {
          setIsFocused(true);
          if (!keyboardCursor) {
            setKeyboardCursor(flipped ? 'e5' : 'e2');
          }
        }}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className={`w-full aspect-square max-w-[500px] select-none rounded-xl overflow-hidden border p-2 md:p-3 relative outline-none transition-all duration-200 ${
          isFocused 
            ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-emerald-500/10 shadow-2xl' 
            : 'border-slate-800 bg-slate-900 shadow-xl'
        }`}
      >
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full relative bg-slate-800">
          {orderedRanks.map((rank, rIdx) => {
            return orderedFiles.map((file, fIdx) => {
              const square = `${file}${rank}` as Square;
              const piece = chess.get(square);
              
              // Slate Color Theme for sleek modern feel
              const isDark = (rIdx + fIdx) % 2 === 1;
              const bgClass = isDark 
                ? 'bg-slate-500 text-slate-200' 
                : 'bg-slate-200 text-slate-700';
              
              const isSelected = selectedSquare === square;
              const isLegalDest = legalMoves.includes(square);
              const isHighlighted = highlightSquares.includes(square);
              const isKeyboardCursor = isFocused && keyboardCursor === square;
              const isLastMoveSquare = lastMoveSquares.includes(square);
              const isEngineLastMove = engineLastMoveSquares?.includes(square);

              return (
                <div
                  key={square}
                  id={`square_${square}`}
                  onClick={() => handleSquareClick(square)}
                  className={`
                    relative flex items-center justify-center cursor-pointer transition-colors duration-150 aspect-square
                    ${bgClass}
                    ${isSelected ? 'ring-4 ring-amber-400 ring-inset bg-amber-100/40' : ''}
                    ${isHighlighted ? 'bg-amber-300/40 ring-2 ring-amber-500/50' : ''}
                    ${isLastMoveSquare ? 'ring-2 ring-emerald-400/60 shadow-[inset_0_0_15px_rgba(16,185,129,0.35)]' : ''}
                  `}
                >
                  {/* Subtle pulsing border for engine's last move */}
                  {isEngineLastMove && (
                    <div className="absolute inset-0 border-4 border-indigo-400 z-20 pointer-events-none animate-pulse" />
                  )}

                  {/* Subtle Glow Overlay for Last Move Squares */}
                  {isLastMoveSquare && (
                    <div className="absolute inset-0 bg-emerald-400/10 pointer-events-none z-0 border border-emerald-400/20" />
                  )}

                  {/* Piece Rendering */}
                  {piece && (
                    <div className="z-10 w-full h-full flex items-center justify-center p-[6%] hover:scale-[1.04] transition-transform">
                      <ChessPieceSvg type={piece.type} color={piece.color} size={42} />
                    </div>
                  )}

                  {/* Keyboard Cursor Highlight */}
                  {isKeyboardCursor && (
                    <div className="absolute inset-0 border-[3px] border-dashed border-emerald-400 ring-4 ring-emerald-500/50 ring-inset pointer-events-none z-30 animate-pulse" />
                  )}

                  {/* Legal Move Indicators */}
                  {isLegalDest && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      {piece ? (
                        // Capture Indicator: neat ring around target
                        <div className="w-[85%] h-[85%] rounded-full border-4 border-amber-500 bg-transparent opacity-75" />
                      ) : (
                        // Standard Move Dot
                        <div className="w-4 h-4 rounded-full bg-slate-700/45 dark:bg-slate-800/60 shadow-sm" />
                      )}
                    </div>
                  )}

                  {/* Rank coordinates (left column only) */}
                  {fIdx === 0 && (
                    <span className={`absolute top-1 left-1.5 text-[9px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                      {rank}
                    </span>
                  )}

                  {/* File coordinates (bottom row only) */}
                  {rIdx === 7 && (
                    <span className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                      {file}
                    </span>
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>
      {/* Keyboard Assistive Instructions & Copy FEN Button */}
      <div className="w-full max-w-[500px] text-[10px] text-slate-400 bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between gap-3 select-none">
        <div className="flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0" />
          <p className="leading-relaxed">
            <span className="text-white font-semibold">Accessible Play:</span> Click board/tab to focus. Use <span className="text-emerald-400 font-bold font-mono">Arrow Keys</span> to navigate, <span className="text-emerald-400 font-bold font-mono">Enter</span> to move, <span className="text-emerald-400 font-bold font-mono">Esc</span> to cancel.
          </p>
        </div>
        <button
          onClick={handleCopyFen}
          title="Copy board state FEN"
          className="ml-auto px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-lg flex items-center gap-1.5 transition-all text-[9px] font-bold uppercase tracking-wider shrink-0 cursor-pointer shadow-sm hover:shadow"
        >
          {copiedFen ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
              <span>Copy FEN</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
