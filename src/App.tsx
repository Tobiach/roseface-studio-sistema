// src/App.tsx
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProvider, useApp } from './context/AppContext';
import { Sparkles } from 'lucide-react';

const ToastNotification: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed top-5 right-5 z-50 bg-rf-black text-white px-5 py-3 rounded-2xl shadow-2xl border border-rf-gold/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <Sparkles className="w-5 h-5 text-rf-gold-bright shrink-0" />
      <span className="text-xs sm:text-sm font-semibold font-body">{toastMessage}</span>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <ToastNotification />
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App;
