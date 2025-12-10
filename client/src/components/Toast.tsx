import { useEffect, useState } from 'react';
import { X, Rocket } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-slate-800/95 backdrop-blur-sm border border-cyan-500/50 rounded-xl p-4 shadow-2xl max-w-sm mx-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Rocket className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-white text-sm font-medium flex-1">{message}</p>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}