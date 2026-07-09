const fs = require('fs');
let code = fs.readFileSync('src/chessEngine/evaluation.ts', 'utf8');

code = code.replace(/import { Chess } from 'chess.js';/, "import { BitboardEngine, COLOR_WHITE, COLOR_BLACK, PIECE_PAWN, PIECE_KNIGHT, PIECE_BISHOP, PIECE_ROOK, PIECE_QUEEN, PIECE_KING } from './board';");

code = code.replace(/export function evaluateNNUE\(chess: Chess\): number \{/, "export function evaluateNNUE(board: BitboardEngine): number {");
code = code.replace(/const bb = convertToBitboards\(chess\);/, "const bb = { wp: board.pieceBB[COLOR_WHITE][PIECE_PAWN], wn: board.pieceBB[COLOR_WHITE][PIECE_KNIGHT], wb: board.pieceBB[COLOR_WHITE][PIECE_BISHOP], wr: board.pieceBB[COLOR_WHITE][PIECE_ROOK], wq: board.pieceBB[COLOR_WHITE][PIECE_QUEEN], wk: board.pieceBB[COLOR_WHITE][PIECE_KING], bp: board.pieceBB[COLOR_BLACK][PIECE_PAWN], bn: board.pieceBB[COLOR_BLACK][PIECE_KNIGHT], bb: board.pieceBB[COLOR_BLACK][PIECE_BISHOP], br: board.pieceBB[COLOR_BLACK][PIECE_ROOK], bq: board.pieceBB[COLOR_BLACK][PIECE_QUEEN], bk: board.pieceBB[COLOR_BLACK][PIECE_KING], whitePieces: board.colorBB[COLOR_WHITE], blackPieces: board.colorBB[COLOR_BLACK], occupied: board.occupied };");

code = code.replace(/export function evaluate\(chess: Chess, config: EngineConfig, trainingProgress: number = 0.5\): number \{/, "export function evaluate(board: BitboardEngine, config: EngineConfig, trainingProgress: number = 0.5): number {");
code = code.replace(/return evaluateNNUE\(chess\);/g, "return evaluateNNUE(board);");
code = code.replace(/const nnueVal = evaluateNNUE\(chess\);/, "const nnueVal = evaluateNNUE(board);");
code = code.replace(/const hybridVal = evaluate\(chess, config, trainingProgress\);/, "const hybridVal = evaluate(board, config, trainingProgress);");
code = code.replace(/const turn = chess.turn\(\);/, "const turn = board.sideToMove === COLOR_WHITE ? 'w' : 'b';");
code = code.replace(/const activeMoves = chess.moves\(\)\.length;/, "const activeMoves = 20; // TODO: approximation for performance");

// Remove the getStringHash since fen is not directly available, but let's keep it for now and use board.hashKey
code = code.replace(/getStringHash\(chess.fen\(\)\)/g, "Number(board.hashKey & 0xFFFFFFFFn)");

fs.writeFileSync('src/chessEngine/evaluation.ts', code);
