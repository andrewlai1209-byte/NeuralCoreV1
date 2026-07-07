import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function saveExperience(data: any) {
  try {
    const preparedData = { ...data };
    if (preparedData.bestMove && typeof preparedData.bestMove === 'object') {
      // Serialize the Move object using SAN (Standard Algebraic Notation)
      preparedData.bestMove = (preparedData.bestMove as any).san || preparedData.bestMove.toString();
    }
    await addDoc(collection(db, 'rl_experience'), {
      ...preparedData,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error adding experience: ", e);
  }
}
