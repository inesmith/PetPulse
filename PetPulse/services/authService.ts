// services/authService.ts
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, sendPasswordResetEmail, type User, } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, } from 'firebase/firestore';


/* utils */
function normalizeUsername(u: string) {
  return u.trim().toLowerCase();
}

/* signup */
export async function registerUser(
  email: string,
  password: string,
  username?: string
): Promise<User> {
  const emailN = email.trim().toLowerCase();
  const usernameN = username?.trim();

  const cred = await createUserWithEmailAndPassword(auth, emailN, password);

  if (usernameN) {
    await updateProfile(cred.user, { displayName: usernameN });
    await reserveUsername(usernameN, cred.user.uid);
  }

  await setDoc(
    doc(db, 'users', cred.user.uid),
    {
      email: cred.user.email,
      displayName: cred.user.displayName ?? usernameN ?? '',
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  return cred.user;
}

/* login */
export async function loginUser(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return cred.user;
}

export async function loginWithUsernameOrEmail(
  identifier: string,
  password: string
): Promise<User> {
  const id = identifier.trim();
  const email = id.includes('@') ? id.toLowerCase() : (await getEmailForUsername(id)) ?? '';
  if (!email) throw new Error('Username not found');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/* auth state + logout */
export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function logoutUser() {
  return signOut(auth);
}

/* password reset */
export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

/* username mapping */
async function reserveUsername(username: string, uid: string) {
  const uname = normalizeUsername(username);
  await setDoc(doc(db, 'usernames', uname), { uid }, { merge: false });
}

async function getEmailForUsername(username: string): Promise<string | null> {
  const uname = normalizeUsername(username);
  const snap = await getDoc(doc(db, 'usernames', uname));
  if (!snap.exists()) return null;

  const { uid } = snap.data() as { uid: string };
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;

  const data = userSnap.data() as { email?: string };
  return data.email ?? null;
}

/* optional: friendlier errors */
export function mapAuthError(err: unknown): string {
  const code = (err as any)?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email/username or password.';
    case 'auth/user-not-found':
      return 'No account found with those details.';
    case 'auth/email-already-in-use':
      return 'That email is already registered.';
    case 'auth/weak-password':
      return 'Password is too weak. Try a longer one.';
    default:
      return 'Something went wrong. Please try again.';
  }
}