import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInAsGuest, signInWithEmail, signUpWithEmail, isLoading } = useAuth();
  
  // Check URL parameter to determine initial mode
  const urlMode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(urlMode !== 'signup');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  // Update mode based on URL parameter changes
  useEffect(() => {
    if (urlMode === 'signup') {
      setIsLogin(false);
    } else if (urlMode === 'signin') {
      setIsLogin(true);
    }
  }, [urlMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    }
  };

  const handleGuestAccess = async () => {
    try {
      await signInAsGuest();
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to continue as guest');
    }
  };

  const handleBack = () => {
    // Check if there's a previous page in history, otherwise go to landing
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-blue to-blue-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="text-white/80 hover:text-white mb-6 flex items-center text-sm font-medium touch-target"
          >
            <span className="text-lg mr-1">←</span>
            Back
          </button>
          
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏏</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back!' : 'Join Cricket Scorer'}
            </h1>
            <p className="text-blue-100 text-lg">
              {isLogin ? 'Sign in to continue scoring' : 'Create your account to get started'}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cricket-blue focus:border-transparent transition-colors"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cricket-blue focus:border-transparent transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cricket-blue focus:border-transparent transition-colors"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cricket-blue text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-cricket-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
            >
              {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  // Update URL without navigation
                  const newMode = !isLogin ? 'signin' : 'signup';
                  const url = new URL(window.location.href);
                  url.searchParams.set('mode', newMode);
                  window.history.replaceState({}, '', url.toString());
                }}
                className="text-cricket-blue hover:text-blue-700 font-medium touch-target"
              >
                {isLogin ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              onClick={handleGuestAccess}
              disabled={isLoading}
              className="w-full mt-4 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
            >
              {isLoading ? 'Please wait...' : 'Continue as Guest'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing up, you agree to our terms and privacy policy. 
              <br />
              Developed by{' '}
              <a 
                href="https://cloud9digital.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cricket-blue hover:text-blue-700 touch-target"
              >
                Cloud 9 Digital
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 