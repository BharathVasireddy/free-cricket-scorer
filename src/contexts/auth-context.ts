import { createContext } from 'react';
import type { User } from 'firebase/auth';

export interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
