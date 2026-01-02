import React from 'react';

interface FooterProps {
  isDarkMode: boolean;
}

const Footer: React.FC<FooterProps> = ({ isDarkMode }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`border-t py-2 md:py-4 px-4 md:px-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
          {/* Left Section - Branding */}
          <div className="flex items-center gap-2 md:gap-3">
            <img 
              src="https://www.kenworth.com/media/w4jnzm4t/kenworth_logo-header-new-012023.png" 
              alt="Kenworth Logo" 
              className="h-6 md:h-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex flex-col">
              <span className={`text-sm md:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                WKI Service Department
              </span>
              <span className={`text-xs hidden md:block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                RO Tracker
              </span>
            </div>
          </div>

          {/* Center Section - App Info (hidden on mobile) */}
          <div className={`hidden md:block text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <p className="font-semibold mb-1">
              Real-Time Repair Order Management
            </p>
            <p className="flex items-center justify-center gap-2 flex-wrap text-xs">
              <span>🔧 Current WIP</span>
              <span>•</span>
              <span>📦 Archive System</span>
              <span>•</span>
              <span>🔍 Global Search</span>
              <span>•</span>
              <span>💾 Auto-Save</span>
            </p>
          </div>

          {/* Right Section - Copyright & Notice */}
          <div className={`text-center md:text-right text-xs md:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="flex items-center justify-center md:justify-end gap-2 mb-1">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
              }`}>
                🔒 WKI Proprietary
              </span>
            </div>
            <p className="text-xs">
              © {currentYear} WKI Service Department - RO Tracker
            </p>
            <p className="text-xs mt-1 hidden md:block">
              For authorized WKI personnel only
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
