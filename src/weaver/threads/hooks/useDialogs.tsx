import { useState, useCallback } from 'react';
import AlertDialog from '@/weaver/stage/components/ui/AlertDialog/AlertDialog';

type DialogOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export const useDialogs = () => {
  const [dialogState, setDialogState] = useState<{
    options: DialogOptions;
    isAlert: boolean;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({ options, isAlert: false, resolve });
    });
  }, []);

  const alert = useCallback((options: DialogOptions) => {
    return new Promise<void>((resolve) => {
      setDialogState({
        options,
        isAlert: true,
        resolve: () => resolve(),
      });
    });
  }, []);

  const handleClose = (value: boolean) => {
    dialogState?.resolve(value);
    setDialogState(null);
  };

  const Dialogs = () => (
    <AlertDialog
      isOpen={!!dialogState}
      title={dialogState?.options.title || ''}
      description={dialogState?.options.description || ''}
      onConfirm={() => handleClose(true)}
      onCancel={() => handleClose(false)}
      confirmLabel={dialogState?.options.confirmLabel || 'OK'}
      cancelLabel={!dialogState?.isAlert ? (dialogState?.options.cancelLabel || 'Anuluj') : undefined}
    />
  );

  return { confirm, alert, Dialogs };
};