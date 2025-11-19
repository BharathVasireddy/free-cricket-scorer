import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithEmail, signUpWithEmail, isLoading } = useAuth();

  // Check URL parameter to determine initial mode
  const urlMode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(urlMode !== 'signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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



  const handleBack = () => {
    // Check if there's a previous page in history, otherwise go to landing
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    // Update URL without navigation
    const newMode = !isLogin ? 'signin' : 'signup';
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-blue to-blue-700 flex items-center justify-center p-4 pb-safe">
      <div className="max-w-md w-full">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="text-white/80 hover:text-white mb-6 flex items-center text-sm font-medium touch-target"
          >
            <ArrowLeft size={16} className="mr-1" />
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
                <label htmlFor="displayName" className="form-label">
                  Full Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full pr-10"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cricket-blue text-white py-3 rounded-xl font-semibold hover:bg-cricket-blue/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              className="text-sm text-gray-600 hover:text-cricket-blue transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
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