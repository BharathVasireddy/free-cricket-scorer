import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, PlusSquare, History, User } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 bottom-nav safe-area-bottom">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around py-1">
          <button 
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center py-2 px-3 transition-all ${
              isActive('/dashboard') 
                ? 'text-cricket-blue scale-105' 
                : 'text-gray-500 hover:text-cricket-blue hover:scale-105'
            }`}
          >
            <HomeIcon size={22} strokeWidth={2} />
            <span className="text-[11px] font-medium mt-0.5">Home</span>
          </button>
          
          <button 
            onClick={() => navigate('/setup')}
            className={`flex flex-col items-center py-2 px-3 transition-all ${
              isActive('/setup') 
                ? 'text-cricket-green scale-105' 
                : 'text-gray-500 hover:text-cricket-green hover:scale-105'
            }`}
          >
            <PlusSquare size={22} strokeWidth={2} />
            <span className="text-[11px] font-medium mt-0.5">New</span>
          </button>
          
          <button 
            onClick={() => navigate('/matches')}
            className={`flex flex-col items-center py-2 px-3 transition-all ${
              isActive('/matches') 
                ? 'text-purple-500 scale-105' 
                : 'text-gray-500 hover:text-purple-500 hover:scale-105'
            }`}
          >
            <History size={22} strokeWidth={2} />
            <span className="text-[11px] font-medium mt-0.5">Matches</span>
          </button>
          
          <button 
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center py-2 px-3 transition-all ${
              isActive('/profile') 
                ? 'text-indigo-500 scale-105' 
                : 'text-gray-500 hover:text-indigo-500 hover:scale-105'
            }`}
          >
            <User size={22} strokeWidth={2} />
            <span className="text-[11px] font-medium mt-0.5">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNav; 