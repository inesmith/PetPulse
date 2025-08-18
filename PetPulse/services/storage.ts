import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

export async function uploadPetImage(uid: string, petId: string, fileUri: string) {
  // RN/Expo: fetch the file and upload as blob
  const res = await fetch(fileUri);
  const blob = await res.blob();

  const path = `users/${uid}/pets/${petId}.jpg`;
  const sRef = ref(storage, path);
  await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(sRef);
  return { url, path };
}
