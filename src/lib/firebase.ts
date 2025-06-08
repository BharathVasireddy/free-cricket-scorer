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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app; 