// utils/pets.ts
import { db } from '../../firebase';
import { doc, collection } from 'firebase/firestore';

export const petDoc = (uid: string, petId: string) =>
  doc(db, 'users', uid, 'pets', petId);

export const petCol = (uid: string, petId: string, sub: string) =>
  collection(db, 'users', uid, 'pets', petId, sub);
