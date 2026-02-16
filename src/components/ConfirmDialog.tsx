import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'info' | 'success' | 'warning';
  isAlert?: boolean; // If true, only shows "OK" button (styled as confirm)
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isAlert = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger': return <AlertTriangle className="text-red-500" size={24} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={24} />;
      case 'success': return <CheckCircle className="text-green-500" size={24} />;
      default: return <Info className="text-blue-400" size={24} />;
    }
  };

  const getButtonColor = () => {
    switch (variant) {
      case 'danger': return 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]';
      case 'warning': return 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]';
      case 'success': return 'bg-green-500 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]';
      default: return 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-4 glass-panel overflow-hidden animate-in zoom-in-95 duration-200 p-0">
        
        {/* Header decoration */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
            variant === 'danger' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
            variant === 'success' ? 'bg-gradient-to-r from-green-500 to-teal-500' :
            variant === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
            'bg-gradient-to-r from-blue-500 to-purple-500'
        }`}></div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
            <div className={`mb-6 p-4 rounded-full border shadow-lg ${
                variant === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
                variant === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                variant === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                'bg-blue-500/10 border-blue-500/20 text-blue-500'
            }`}>
              {getIcon()}
            </div>
            
            <h3 className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
              {title}
            </h3>
            
            <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-[90%]">
              {message}
            </p>

            <div className="flex gap-4 w-full justify-center">
              {!isAlert && (
                  <button
                  onClick={onClose}
                  className="glass-button hover:bg-white/5 border-white/10 text-zinc-300 min-w-[100px]"
                  >
                  {cancelText}
                  </button>
              )}
              <button
                onClick={() => onConfirm()}
                className={`glass-button border-0 min-w-[120px] shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 ${getButtonColor()}`}
              >
                {confirmText}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};
