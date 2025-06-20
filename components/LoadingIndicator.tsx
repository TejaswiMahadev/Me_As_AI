
import React from 'react';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-1 p-2 bg-gray-700 rounded-lg max-w-min">
      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-75"></div>
      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-150"></div>
      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-225"></div>
       <span className="text-xs text-gray-300 ml-1">Tejaswi is typing...</span>
    </div>
  );
};

export default LoadingIndicator;
