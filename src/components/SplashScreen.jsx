import React from 'react';
import { Library } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <Library className="w-24 h-24 text-blue-400 animate-pulse" />
            <div className="absolute inset-0 bg-blue-400 blur-xl opacity-50 animate-pulse"></div>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Nilaa Player</h1>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-gray-400 mt-4 text-sm">Loading your courses...</p>
      </div>
    </div>
  );
}
