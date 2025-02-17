import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableNetwork,
  disableNetwork,
  FirestoreError,
  memoryLocalCache,
  connectFirestoreEmulator
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Function to determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Initialize Firestore with appropriate settings based on environment
const db = (() => {
  try {
    let firestoreInstance;

    // Initialize Firestore with appropriate cache settings
    if (isBrowser) {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } else {
      firestoreInstance = initializeFirestore(app, {
        localCache: memoryLocalCache()
      });
    }

    // Connect to emulator in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log('Connecting to Firestore emulator...');
      connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
      
      // Also connect Auth and Storage emulators if needed
      connectAuthEmulator(auth, 'http://localhost:9099');
      const storage = getStorage(app);
      connectStorageEmulator(storage, 'localhost', 9199);
    }

    return firestoreInstance;
  } catch (error) {
    console.warn("Failed to initialize Firestore with persistent cache, falling back to memory cache:", error);
    const fallbackInstance = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
    
    // Still try to connect to emulator in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log('Connecting to Firestore emulator (fallback)...');
      connectFirestoreEmulator(fallbackInstance, 'localhost', 8080);
    }

    return fallbackInstance;
  }
})();

// Enhanced reconnection function with exponential backoff
const reconnectFirestore = async (retryCount = 0, maxRetries = 5, baseDelay = 1000) => {
  try {
    if (!isBrowser) return; // Don't attempt reconnection in non-browser environments
    
    await disableNetwork(db);
    // Exponential backoff delay
    const delay = baseDelay * Math.pow(2, retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));
    await enableNetwork(db);
    console.log("Firestore network connection restored");
  } catch (error) {
    if (retryCount < maxRetries) {
      console.log(`Retrying Firestore connection (${retryCount + 1}/${maxRetries})...`);
      await reconnectFirestore(retryCount + 1, maxRetries, baseDelay);
    } else {
      console.error("Failed to reconnect to Firestore after multiple attempts:", error);
      // Emit an event that the UI can listen to for showing a connection error
      if (isBrowser) {
        window.dispatchEvent(new CustomEvent('firestoreConnectionError', { detail: error }));
      }
    }
  }
};

// Initialize network state
if (isBrowser) {
  enableNetwork(db).catch(async (error: FirestoreError) => {
    console.error("Error enabling Firestore network:", error);
    await reconnectFirestore();
  });
}

const storage = getStorage(app);

export { app, auth, db, storage, reconnectFirestore };
