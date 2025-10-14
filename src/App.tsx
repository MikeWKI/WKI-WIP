import { useState, useEffect } from 'react';
import RepairOrderTracker from './RepairOrderTracker';
import SplashScreen from './SplashScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Check if user has seen splash screen in this session
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  return (
    <>
      {showSplash ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : (
        <RepairOrderTracker />
      )}
    </>
  );
}

export default App
