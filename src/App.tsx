import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import FridgeAnalyzer from './components/FridgeAnalyzer';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100">
        <FridgeAnalyzer />
      </div>
    </ErrorBoundary>
  );
}

export default App;