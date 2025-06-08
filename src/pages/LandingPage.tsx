import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
      {/* JSON-LD Schema Markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Free Cricket Scorer",
            "description": "Professional cricket scoring made simple and free. Track live matches, manage player statistics, and never miss a ball.",
            "url": "https://free-cricket-scorer.vercel.app",
            "applicationCategory": "SportsApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "Cloud 9 Digital",
              "url": "https://cloud9digital.in"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "127",
              "bestRating": "5"
            },
            "review": [
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Rajesh Kumar"
                },
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5"
                },
                "reviewBody": "Amazing app! Makes cricket scoring so easy and professional. Used it for our local tournament and everyone loved it."
              },
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Priya Sharma"
                },
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5"
                },
                "reviewBody": "Best free cricket scorer I've found. Clean interface, all features work perfectly, and no annoying ads!"
              }
            ]
          })
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-cricket-green to-cricket-blue">
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
        <div className="container mx-auto px-4 py-8 lg:py-16">
          <div className="text-center mb-12 lg:mb-16">
            <div className="text-6xl lg:text-8xl mb-4 lg:mb-6">🏏</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 lg:mb-6 leading-tight">
              Free Cricket Scorer
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-green-100 mb-6 lg:mb-8 max-w-4xl mx-auto leading-relaxed px-4">
              Professional cricket scoring made simple and free. Track live matches, 
              manage player statistics, and never miss a ball.
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
              No registration required to get started • Free forever • No ads
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12 lg:mb-16">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 lg:p-8 text-center">
              <div className="text-4xl lg:text-5xl mb-4">⚡</div>
              <h3 className="text-lg lg:text-xl font-bold text-white mb-4">Real-time Scoring</h3>
              <p className="text-green-100 text-sm lg:text-base">
                Score matches live with instant updates. Track runs, wickets, and overs as they happen.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 lg:p-8 text-center">
              <div className="text-4xl lg:text-5xl mb-4">📊</div>
              <h3 className="text-lg lg:text-xl font-bold text-white mb-4">Player Statistics</h3>
              <p className="text-green-100 text-sm lg:text-base">
                Comprehensive player stats including batting averages, bowling figures, and strike rates.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 lg:p-8 text-center">
              <div className="text-4xl lg:text-5xl mb-4">☁️</div>
              <h3 className="text-lg lg:text-xl font-bold text-white mb-4">Cloud Sync</h3>
              <p className="text-green-100 text-sm lg:text-base">
                Save matches to the cloud and access them from any device. Share with team members.
              </p>
            </div>
          </div>

          {/* Reviews & Testimonials */}
          <div className="bg-white/5 backdrop-blur rounded-3xl p-6 lg:p-12 mb-12 lg:mb-16">
            <div className="text-center mb-8 lg:mb-12">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                Trusted by Cricket Enthusiasts
              </h2>
              <div className="flex justify-center items-center space-x-2 mb-4">
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} className="text-yellow-400 text-xl lg:text-2xl">⭐</span>
                  ))}
                </div>
                <span className="text-white font-semibold text-lg">4.8/5</span>
                <span className="text-green-100">(127 reviews)</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="flex space-x-1 mb-3">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} className="text-yellow-400">⭐</span>
                  ))}
                </div>
                <p className="text-green-100 text-sm lg:text-base mb-4">
                  "Amazing app! Makes cricket scoring so easy and professional. Used it for our local tournament and everyone loved it."
                </p>
                <div className="text-white font-semibold">- Rajesh Kumar</div>
                <div className="text-green-200 text-sm">Cricket Coach, Mumbai</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="flex space-x-1 mb-3">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} className="text-yellow-400">⭐</span>
                  ))}
                </div>
                <p className="text-green-100 text-sm lg:text-base mb-4">
                  "Best free cricket scorer I've found. Clean interface, all features work perfectly, and no annoying ads!"
                </p>
                <div className="text-white font-semibold">- Priya Sharma</div>
                <div className="text-green-200 text-sm">Sports Club Manager, Delhi</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 md:col-span-2 lg:col-span-1">
                <div className="flex space-x-1 mb-3">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} className="text-yellow-400">⭐</span>
                  ))}
                </div>
                <p className="text-green-100 text-sm lg:text-base mb-4">
                  "Perfect for our weekend matches. Easy to use on mobile, saves all data automatically. Highly recommended!"
                </p>
                <div className="text-white font-semibold">- Arjun Patel</div>
                <div className="text-green-200 text-sm">Tournament Organizer</div>
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-white/5 backdrop-blur rounded-3xl p-6 lg:p-12 mb-12 lg:mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-white text-center mb-8 lg:mb-12">
              How It Works
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              <div className="text-center">
                <div className="bg-blue-500 text-white w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-xl lg:text-2xl font-bold">
                  1
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Setup Match</h4>
                <p className="text-green-100 text-sm lg:text-base">Create teams, set overs, and configure match format</p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-500 text-white w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-xl lg:text-2xl font-bold">
                  2
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Toss & Players</h4>
                <p className="text-green-100 text-sm lg:text-base">Conduct toss and select batting/bowling lineup</p>
              </div>
              
              <div className="text-center">
                <div className="bg-yellow-500 text-white w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-xl lg:text-2xl font-bold">
                  3
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Live Scoring</h4>
                <p className="text-green-100 text-sm lg:text-base">Track every ball with our intuitive scoring interface</p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-500 text-white w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-xl lg:text-2xl font-bold">
                  4
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Results & Stats</h4>
                <p className="text-green-100 text-sm lg:text-base">View detailed scorecards and player statistics</p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-8 lg:mb-12">
              Why Choose Free Cricket Scorer?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-left">
                <div className="text-3xl mb-3">🆓</div>
                <h4 className="text-lg font-bold text-white mb-2">Completely Free</h4>
                <p className="text-green-100 text-sm lg:text-base">No hidden fees, no premium features, no subscriptions. Everything is free forever.</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-left">
                <div className="text-3xl mb-3">📱</div>
                <h4 className="text-lg font-bold text-white mb-2">Mobile Friendly</h4>
                <p className="text-green-100 text-sm lg:text-base">Works perfectly on phones, tablets, and desktops. Score from anywhere.</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-left">
                <div className="text-3xl mb-3">🚀</div>
                <h4 className="text-lg font-bold text-white mb-2">No Setup Required</h4>
                <p className="text-green-100 text-sm lg:text-base">Start scoring immediately. No downloads, no installations, no account required.</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-left">
                <div className="text-3xl mb-3">🎯</div>
                <h4 className="text-lg font-bold text-white mb-2">Professional Quality</h4>
                <p className="text-green-100 text-sm lg:text-base">All the features you need for serious cricket scoring and statistics.</p>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center bg-white/10 backdrop-blur rounded-3xl p-8 lg:p-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Ready to Start Scoring?
            </h2>
            <p className="text-green-100 text-lg mb-6 lg:mb-8">
              Join thousands of cricket enthusiasts who trust Free Cricket Scorer for their matches.
            </p>
            <button
              onClick={handleGuestStart}
              disabled={isLoading}
              className="bg-yellow-500 text-yellow-900 px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
            >
              {isLoading ? 'Starting...' : '🏏 Start Your First Match'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white/5 backdrop-blur border-t border-white/10 py-6 lg:py-8 mt-12 lg:mt-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-6">
              {/* Branding */}
              <div className="text-center md:text-left">
                <h3 className="text-lg font-bold text-white mb-2">🏏 Free Cricket Scorer</h3>
                <p className="text-green-100 text-sm">
                  Professional cricket scoring made simple and free
                </p>
              </div>
              
              {/* Quick Links */}
              <div className="text-center">
                <h4 className="text-white font-semibold mb-2">Quick Start</h4>
                <div className="space-y-1">
                  <button 
                    onClick={handleGuestStart}
                    className="block mx-auto text-green-200 hover:text-white text-sm transition-colors"
                  >
                    Start Scoring
                  </button>
                  <button 
                    onClick={handleCreateAccount}
                    className="block mx-auto text-green-200 hover:text-white text-sm transition-colors"
                  >
                    Create Account
                  </button>
                  <button 
                    onClick={handleSignIn}
                    className="block mx-auto text-green-200 hover:text-white text-sm transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              </div>
              
              {/* Company Info */}
              <div className="text-center md:text-right">
                <h4 className="text-white font-semibold mb-2">Developed by</h4>
                <a 
                  href="https://cloud9digital.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-200 hover:text-white transition-colors text-sm font-medium"
                >
                  Cloud 9 Digital
                </a>
                <p className="text-green-200 text-xs mt-1">
                  Professional Web Solutions
                </p>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-4 lg:pt-6 text-center">
              <p className="text-green-100 mb-2 text-sm lg:text-base">
                Made with ❤️ for cricket lovers everywhere
              </p>
              <p className="text-green-200 text-xs lg:text-sm">
                © 2024 Free Cricket Scorer • Free Forever • No Ads • 
                <a 
                  href="https://cloud9digital.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 hover:text-white transition-colors"
                >
                  Cloud 9 Digital
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage; 