import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDVGjoOp2Ic70YJv2oX6StrqDhlz7VNoBk",
  authDomain: "free-cricket-scorer.firebaseapp.com",
  projectId: "free-cricket-scorer",
  storageBucket: "free-cricket-scorer.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 