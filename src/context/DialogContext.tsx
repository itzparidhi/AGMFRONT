import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface DialogConfig {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'info' | 'success' | 'warning';
  isAlert: boolean;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  confirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'info' | 'success' | 'warning', confirmText?: string, cancelText?: string) => void;
  alert: (title: string, message: string, variant?: 'danger' | 'info' | 'success' | 'warning', confirmText?: string) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeDialog, setActiveDialog] = useState<DialogConfig>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    isAlert: false,
    onConfirm: () => {},
  });

  const closeDialog = () => {
    setActiveDialog(prev => ({ ...prev, isOpen: false }));
  };

  const confirm = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    variant: 'danger' | 'info' | 'success' | 'warning' = 'info',
    confirmText?: string,
    cancelText?: string
  ) => {
    setActiveDialog({
      isOpen: true,
      title,
      message,
      variant,
      isAlert: false,
      onConfirm: () => {
        onConfirm();
        closeDialog();
      },
      confirmText,
      cancelText,
    });
  };

  const alert = (
    title: string, 
    message: string, 
    variant: 'danger' | 'info' | 'success' | 'warning' = 'info',
    confirmText?: string
  ) => {
    setActiveDialog({
      isOpen: true,
      title,
      message,
      variant,
      isAlert: true,
      onConfirm: closeDialog,
      confirmText,
    });
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmDialog
        isOpen={activeDialog.isOpen}
        onClose={closeDialog}
        onConfirm={activeDialog.onConfirm}
        title={activeDialog.title}
        message={activeDialog.message}
        variant={activeDialog.variant}
        isAlert={activeDialog.isAlert}
        confirmText={activeDialog.confirmText || (activeDialog.isAlert ? "OK" : "Confirm")}
        cancelText={activeDialog.cancelText}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
