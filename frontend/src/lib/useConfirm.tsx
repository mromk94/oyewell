import { useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function useConfirm() {
  const [config, setConfig] = useState<ConfirmOptions | null>(null);

  const showConfirm = useCallback((opts: ConfirmOptions) => setConfig(opts), []);
  const close = useCallback(() => setConfig(null), []);

  const Modal = config ? (
    <ConfirmModal
      open
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel ?? 'Confirm'}
      danger={config.danger}
      onConfirm={() => {
        close();
        config.onConfirm();
      }}
      onCancel={close}
    />
  ) : null;

  return { showConfirm, close, Modal };
}
