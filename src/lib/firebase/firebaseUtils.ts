import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  ActionCodeSettings
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const createUserWithVerification = async (email: string, password: string) => {
  try {
    // First create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Configure action code settings
    const actionCodeSettings: ActionCodeSettings = {
      url: `${window.location.origin}/verify-email`,
      handleCodeInApp: true,
    };

    // If in development, modify the verification email handling
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Email verification link will be logged to console');
      // The emulator will log the verification link to the console
    }

    // Send verification email
    await sendEmailVerification(user, actionCodeSettings);

    // Create initial user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      emailVerified: false,
      createdAt: serverTimestamp(),
      uid: user.uid,
      role: 'user',
      displayName: user.displayName || email.split('@')[0], // Use part before @ as display name if not set
      photoURL: user.photoURL || null,
    });

    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};
