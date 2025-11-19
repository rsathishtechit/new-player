import React, { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Library } from 'lucide-react';
import SplashScreen from './SplashScreen';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-400 hover:text-blue-300 transition-colors">
            <Library className="w-6 h-6" />
            <span>Nilaa Player</span>
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<SplashScreen />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
