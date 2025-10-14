import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [fuelLevel, setFuelLevel] = useState(0);

  useEffect(() => {
    // Animate fuel gauge from 0 to 100 over 1.5 seconds
    const duration = 1500;
    const steps = 60;
    const increment = 100 / steps;
    const intervalTime = duration / steps;

    const fuelInterval = setInterval(() => {
      setFuelLevel(prev => {
        const next = prev + increment;
        return next >= 100 ? 100 : next;
      });
    }, intervalTime);

    // Start fade out after 1.5 seconds (gauge complete)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1500);

    // Complete splash screen after 2 seconds total
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearInterval(fuelInterval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        backgroundImage: 'url(/Splash.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      
      <div className="relative z-10 text-center">
        {/* Kenworth Logo */}
        <div className="mb-8 flex justify-center">
          <img 
            src="https://www.kenworth.com/media/w4jnzm4t/kenworth_logo-header-new-012023.png" 
            alt="Kenworth Logo" 
            className="h-20 md:h-24 object-contain drop-shadow-2xl"
            onError={(e) => {
              // Fallback if logo fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* App Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
          WKI Service Management
        </h1>
        <p className="text-xl md:text-2xl text-white drop-shadow-xl mb-12">
          Work In Progress Tracker
        </p>

        {/* Fuel Gauge Loading Indicator */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Fuel Gauge Container */}
            <div className="relative w-48 h-48 md:w-56 md:h-56">
              {/* Outer Circle */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {/* Background Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="12"
                />
                {/* Fuel Level Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="url(#fuelGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 85}`}
                  strokeDashoffset={`${2 * Math.PI * 85 * (1 - fuelLevel / 100)}`}
                  style={{
                    transition: 'stroke-dashoffset 0.05s linear',
                    filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))'
                  }}
                />
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="fuelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <svg className="w-12 h-12 md:w-16 md:h-16 mb-2" fill="white" viewBox="0 0 24 24">
                  <path d="M3 18v-6a9 9 0 0118 0v6h-2v-6a7 7 0 00-14 0v6H3zm5-6a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z"/>
                  <path d="M7 18h10v2H7z"/>
                </svg>
                <p className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  {Math.round(fuelLevel)}%
                </p>
                <p className="text-sm md:text-base text-white drop-shadow-lg mt-1">
                  {fuelLevel < 30 ? 'Empty' : fuelLevel < 70 ? 'Filling' : 'Full'}
                </p>
              </div>
            </div>
            
            {/* Gauge Labels */}
            <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 text-white font-bold drop-shadow-lg">
              E
            </div>
            <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-white font-bold drop-shadow-lg">
              F
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
