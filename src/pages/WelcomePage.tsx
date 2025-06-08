import React from 'react';
import { useNavigate } from 'react-router-dom';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-green via-green-600 to-green-800 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center mb-12">
          <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <span className="text-4xl">🏏</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
            Cricket Scorer
          </h1>
          <p className="text-green-100 text-xl font-medium">
            Professional scoring made simple
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => navigate('/setup')}
            className="w-full bg-white text-cricket-green font-bold py-5 px-6 rounded-2xl shadow-2xl hover:bg-gray-50 hover:shadow-3xl transition-all duration-200 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-xl">🏏</span>
              <span className="text-lg">Start New Match</span>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/matches')}
            className="w-full bg-transparent text-white font-semibold py-5 px-6 rounded-2xl border-2 border-white/30 hover:bg-white/10 hover:border-white/50 transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-xl">📊</span>
              <span className="text-lg">View Past Matches</span>
            </div>
          </button>
        </div>
      </div>

      {/* Features Footer */}
      <div className="pb-8 px-6">
        <div className="max-w-sm mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="text-white space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">⚡</span>
                <span className="text-sm font-medium">Live ball-by-ball scoring</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">📱</span>
                <span className="text-sm font-medium">Mobile-first design</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🎯</span>
                <span className="text-sm font-medium">Custom rules & formats</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage; 