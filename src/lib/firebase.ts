import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that all required environment variables are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Missing required Firebase environment variables. Please check your .env.local file.');
}

// Diagnose Firebase setup
export const diagnoseFirebase = () => {
  console.log('🔧 Firebase Configuration Diagnostics:');
  console.log('- Project ID:', firebaseConfig.projectId);
  console.log('- Auth Domain:', firebaseConfig.authDomain);
  console.log('- API Key:', firebaseConfig.apiKey ? 'Present' : 'Missing');
  console.log('- App ID:', firebaseConfig.appId);
  console.log('- Storage Bucket:', firebaseConfig.storageBucket);

  try {
    console.log('- Firebase App:', app ? 'Initialized' : 'Not initialized');
    console.log('- Firestore:', db ? 'Available' : 'Not available');
    console.log('- Auth:', auth ? 'Available' : 'Not available');
  } catch (error) {
    console.error('- Error during diagnostics:', error);
  }
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Run diagnostics on import
diagnoseFirebase();

export default app; 