import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

// Local storage backup buffer for offline support
const LOCAL_STORAGE_KEY = 'neuralcore_rl_experience_buffer';

let memoryBuffer: any[] = [];

function getLocalBuffer(): any[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {
    // Ignore error
  }
  return memoryBuffer;
}

function saveLocalBuffer(buffer: any[]) {
  const trimmed = buffer.slice(-100); // Limit to last 100 items
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
      return;
    }
  } catch (err) {
    console.warn("Offline experience buffer write failed:", err);
  }
  memoryBuffer = trimmed;
}

export async function saveExperience(data: any) {
  const preparedData = { ...data };
  if (preparedData.bestMove && typeof preparedData.bestMove === 'object') {
    preparedData.bestMove = (preparedData.bestMove as any).san || preparedData.bestMove.toString();
  }
  
  const record = {
    ...preparedData,
    timestamp: new Date().toISOString()
  };

  // 1. Save to local fallback buffer first so data is never lost offline
  const buffer = getLocalBuffer();
  buffer.push(record);
  saveLocalBuffer(buffer);

  // 2. Attempt asynchronous cloud sync if online and db is initialized
  if (!db) {
    console.log("Offline Mode: Saved experience locally. (Firebase is not initialized)");
    return;
  }

  try {
    await addDoc(collection(db, 'rl_experience'), record);
    // Remove the item from local buffer if successfully synced to Firestore
    const currentBuffer = getLocalBuffer();
    const updatedBuffer = currentBuffer.filter(item => item.timestamp !== record.timestamp);
    saveLocalBuffer(updatedBuffer);
  } catch (e) {
    // Graceful logging without disrupting search thread
    console.log("Saved experience locally (Running offline or sandbox restriction).");
  }
}
