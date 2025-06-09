import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInAsGuest, isLoading } = useAuth();

  const handleGuestStart = async () => {
    try {
      await signInAsGuest();
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to start as guest:', error);
    }
  };

  const handleCreateAccount = () => {
    navigate('/auth?mode=signup');
  };

  const handleSignIn = () => {
    navigate('/auth?mode=signin');
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Free Cricket Scorer - Simple Cricket Scoring App for Casual Games</title>
        <meta name="description" content="Free cricket scoring app perfect for street cricket, backyard games, and local tournaments. Score matches easily with custom rules, real-time updates, and detailed statistics." />
        <meta name="keywords" content="cricket scorer, cricket scoring app, free cricket app, street cricket, casual cricket, cricket statistics" />
        <meta property="og:title" content="Free Cricket Scorer - Simple Cricket Scoring App" />
        <meta property="og:description" content="Score your cricket matches easily with our free app. Perfect for street cricket and casual games." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Free Cricket Scorer - Simple Cricket Scoring App" />
        <meta name="twitter:description" content="Score your cricket matches easily with our free app. Perfect for street cricket and casual games." />
      </Helmet>

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Free Cricket Scorer",
            "description": "Free cricket scoring app perfect for street cricket, backyard games, and local tournaments. Score matches easily with custom rules and real-time updates.",
            "url": "https://cricket.cloud9digital.in",
            "applicationCategory": "SportsApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "Real-time scoring",
              "Custom match rules",
              "Mobile-friendly interface",
              "Detailed statistics",
              "No registration required"
            ]
          })
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-cricket-green to-cricket-blue pb-safe">
        {/* Navigation */}
        <nav className="p-4 lg:p-6 flex justify-between items-center">
          <div className="text-white text-xl lg:text-2xl font-bold">
            🏏 Free Cricket Scorer
          </div>
          <div className="flex space-x-2 lg:space-x-4">
            <button
              onClick={handleSignIn}
              className="text-white/80 hover:text-white transition-colors text-sm lg:text-base px-2 lg:px-0"
            >
              Sign In
            </button>
            <button
              onClick={handleCreateAccount}
              className="bg-white text-cricket-green px-3 lg:px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm lg:text-base"
            >
              Sign Up
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-8 lg:py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Score Your Cricket Matches
              <span className="block text-yellow-300">Without Complications</span>
            </h1>
            <p className="text-lg md:text-xl text-green-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              The simplest way to score street cricket, backyard games, and local tournaments. 
              No complex setups, just start scoring in seconds.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <button
                onClick={handleGuestStart}
                disabled={isLoading}
                className="bg-yellow-500 text-yellow-900 px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 w-full sm:w-auto"
              >
                {isLoading ? 'Starting...' : '🚀 Start Scoring Now'}
              </button>
              <button
                onClick={handleCreateAccount}
                className="bg-white/10 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all backdrop-blur border border-white/20 w-full sm:w-auto"
              >
                Create Free Account
              </button>
            </div>
            
            <p className="text-green-200 text-sm">
              No registration required • Free forever • No ads
            </p>
          </div>

          {/* Key Features */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h2 className="text-xl font-bold text-white mb-3">Quick Start</h2>
              <p className="text-green-100">
                Start scoring in seconds. No registration needed. Perfect for impromptu matches.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-xl font-bold text-white mb-3">Your Rules</h2>
              <p className="text-green-100">
                5 overs or 50 overs, 3 players or 11 - you decide! Supports any format.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">📱</div>
              <h2 className="text-xl font-bold text-white mb-3">Works Everywhere</h2>
              <p className="text-green-100">
                Use on any device. Score from your phone while playing at the boundary.
              </p>
            </div>
          </section>

          {/* How it Works */}
          <section className="bg-white/5 backdrop-blur rounded-3xl p-6 lg:p-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white text-center mb-8">
              Start Scoring in 3 Steps
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Set Up Match</h3>
                <p className="text-green-100 text-sm">Choose overs, players, and format</p>
              </div>
              
              <div>
                <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Add Teams</h3>
                <p className="text-green-100 text-sm">Enter team names and players</p>
              </div>
              
              <div>
                <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Start Playing</h3>
                <p className="text-green-100 text-sm">Score balls, runs, and wickets live</p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-green-200 text-sm">
          <p>Made with ❤️ for cricket lovers everywhere</p>
        </footer>
      </div>
    </>
  );
};

export default LandingPage; 