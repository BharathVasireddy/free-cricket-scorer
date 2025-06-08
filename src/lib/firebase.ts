import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDVGjoOp2Ic70YJv2oX6StrqDhlz7VNoBk",
  authDomain: "free-cricket-scorer.firebaseapp.com",
  projectId: "free-cricket-scorer",
  storageBucket: "free-cricket-scorer.firebasestorage.app",
  messagingSenderId: "420193355868",
  appId: "1:420193355868:web:1066766bb0d322583f7e99",
  measurementId: "G-X39RYZ2DL4"
};

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