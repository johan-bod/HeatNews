import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

// Firebase configuration
// These environment variables should be set in .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const isFirebaseConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your-api-key-here' &&
  !firebaseConfig.apiKey.includes('your_');

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Initialize Firebase only if properly configured
if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Google Authentication Provider
    googleProvider = new GoogleAuthProvider();

    // Configure Google provider
    googleProvider.setCustomParameters({
      prompt: 'select_account', // Always show account selection
    });

    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.warn('⚠️ Firebase initialization failed:', error);
    console.warn('💡 The app will work without authentication features');
  }
} else {
  console.warn('⚠️ Firebase not configured. Authentication features will be disabled.');
  console.warn('💡 To enable authentication, add valid Firebase credentials to your .env file');
}

export { auth, googleProvider };
export default app;
