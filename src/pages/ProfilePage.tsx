import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Settings, LogOut, User, Mail, Trophy, History, Bell, HelpCircle } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isGuest, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/landing');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserName = () => {
    if (isGuest) return 'Guest User';
    return currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Cricket Player';
  };

  const getUserEmail = () => {
    if (isGuest) return 'guest@cricketscorer.app';
    return currentUser?.email || 'No email provided';
  };

  const getInitials = () => {
    const name = getUserName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-cricket-blue to-blue-600 text-white px-4 pt-8 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-bold">
              {getInitials()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{getUserName()}</h1>
              <p className="text-blue-100">{getUserEmail()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-lg mx-auto px-4 -mt-6">
        <div className="space-y-4">
          {/* Account Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Account</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              <button className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">Profile Details</h3>
                  <p className="text-sm text-gray-500">Update your personal information</p>
                </div>
              </button>

              <button className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Mail size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">Email Settings</h3>
                  <p className="text-sm text-gray-500">Manage email preferences</p>
                </div>
              </button>
            </div>
          </div>

          {/* Cricket Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Cricket Stats</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              <button className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <Trophy size={18} className="text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">Match History</h3>
                  <p className="text-sm text-gray-500">View your cricket statistics</p>
                </div>
              </button>

              <button className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                  <History size={18} className="text-orange-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">Recent Activity</h3>
                  <p className="text-sm text-gray-500">Check your recent matches</p>
                </div>
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Preferences</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              <button className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Bell size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">Notifications</h3>
                  <p className="text-sm text-gray-500">Customize alert settings</p>
                </div>
              </button>

              <button className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Settings size={18} className="text-teal-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">App Settings</h3>
                  <p className="text-sm text-gray-500">Configure app preferences</p>
                </div>
              </button>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Help & Support</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              <button className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                  <HelpCircle size={18} className="text-rose-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">Get Help</h3>
                  <p className="text-sm text-gray-500">FAQs and support resources</p>
                </div>
              </button>

              <button 
                onClick={handleLogout}
                className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-red-600"
              >
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                  <LogOut size={18} className="text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium">Sign Out</h3>
                  <p className="text-sm text-red-500/70">Log out of your account</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 