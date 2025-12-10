import { useState, useEffect } from 'react';
import { Rocket, Smartphone, Bell, X } from 'lucide-react';
import { useMiniKit } from '../lib/miniapp/minikit';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WelcomeDialog({ open, onOpenChange }: WelcomeDialogProps) {
  const { addToApp, context } = useMiniKit();
  const [isAdding, setIsAdding] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleAddToFarcaster = async () => {
    setIsAdding(true);
    try {
      await addToApp();
      console.log('✅ App added to Farcaster');
    } catch (error) {
      console.error('❌ Failed to add app to Farcaster:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          console.log('✅ Notifications enabled');
        }
      } catch (error) {
        console.error('❌ Failed to enable notifications:', error);
      }
    }
  };

  const handleContinue = () => {
    localStorage.setItem('starmint_welcome_shown', 'true');
    onOpenChange(false);
  };

  const isAlreadyAdded = context?.client?.added;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 border-2 border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Welcome to STARMINT!
          </DialogTitle>
          <DialogDescription className="text-center text-gray-300 mt-2">
            Your epic space adventure begins here
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* App Icon */}
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/50">
              <Rocket className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center border-4 border-slate-900">
              <span className="text-xl">+</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Add STARMINT to Farcaster</h3>
            <p className="text-sm text-gray-400">
              Get quick access and stay updated with the latest features
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {/* Add to Farcaster Button */}
            {!isAlreadyAdded && (
              <button
                onClick={handleAddToFarcaster}
                disabled={isAdding}
                className="w-full flex items-center justify-start space-x-4 bg-slate-800/50 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-500/60 rounded-xl px-6 py-4 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">
                    {isAdding ? 'Adding...' : 'Add to Farcaster'}
                  </div>
                  <div className="text-xs text-gray-400">Quick access from your profile</div>
                </div>
              </button>
            )}

            {isAlreadyAdded && (
              <div className="w-full flex items-center justify-start space-x-4 bg-green-900/20 border border-green-500/30 rounded-xl px-6 py-4">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-green-400">Added to Farcaster ✓</div>
                  <div className="text-xs text-gray-400">You can now access STARMINT quickly</div>
                </div>
              </div>
            )}

            {/* Enable Notifications Button */}
            {notificationPermission !== 'granted' && (
              <button
                onClick={handleEnableNotifications}
                className="w-full flex items-center justify-start space-x-4 bg-slate-800/50 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl px-6 py-4 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-cyan-600/20 rounded-lg flex items-center justify-center group-hover:bg-cyan-600/30 transition-colors">
                  <Bell className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">Enable notifications</div>
                  <div className="text-xs text-gray-400">Stay updated with game events</div>
                </div>
              </button>
            )}

            {notificationPermission === 'granted' && (
              <div className="w-full flex items-center justify-start space-x-4 bg-green-900/20 border border-green-500/30 rounded-xl px-6 py-4">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-green-400">Notifications enabled ✓</div>
                  <div className="text-xs text-gray-400">You'll receive game updates</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleContinue}
              className="flex-1 bg-transparent border-gray-600 hover:bg-slate-800 text-white"
            >
              Not now
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-0"
            >
              Let's Go!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
