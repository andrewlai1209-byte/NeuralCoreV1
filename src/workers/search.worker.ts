// src/workers/search.worker.ts
import { Chess } from 'chess.js';
import { ChessEngine } from '../engine';

self.onmessage = async (e: MessageEvent) => {
  const { fen, config, trainingProgress, trainedWeights } = e.data;
  const chess = new Chess(fen);
  const engine = new ChessEngine(config);
  
  // Inject the weights into the engine instance if needed
  // In a real worker, we might need to expose a method to set these
  // For now, assume engine constructor or a method handles it.
  
  // Perform the search
  const result = engine.search(fen, trainingProgress);
  
  self.postMessage(result);
};
