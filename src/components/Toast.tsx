import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  txHash?: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, txHash?: string) => string;
  dismiss: (id: string) => void;
  success: (message: string, txHash?: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loading: (message: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', txHash?: string): string => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, txHash }]);
    // Auto-dismiss non-loading toasts
    if (type !== 'loading') {
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((message: string, txHash?: string) => { toast(message, 'success', txHash); }, [toast]);
  const error = useCallback((message: string) => { toast(message, 'error'); }, [toast]);
  const info = useCallback((message: string) => { toast(message, 'info'); }, [toast]);
  const loading = useCallback((message: string) => toast(message, 'loading'), [toast]);

  const ICONS: Record<ToastType, string> = { success: '✓', error: '✗', info: 'ℹ', loading: '⟳' };
  const COLORS: Record<ToastType, { bg: string; border: string }> = {
    success: { bg: 'rgba(74,222,128,0.12)', border: '#4ade80' },
    error:   { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444' },
    info:    { bg: 'rgba(34,211,238,0.12)', border: '#22d3ee' },
    loading: { bg: 'rgba(255,153,0,0.12)',  border: '#ff9900' },
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss, success, error, info, loading }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          maxWidth: '380px',
          padding: '0 16px',
          pointerEvents: 'none',
        }}>
          {toasts.map(t => {
            const c = COLORS[t.type];
            return (
              <div
                key={t.id}
                style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  backdropFilter: 'blur(12px)',
                  pointerEvents: 'all',
                  animation: 'fadeInUp 0.2s ease',
                }}
              >
                <span style={{
                  color: c.border,
                  fontSize: '16px',
                  fontWeight: 700,
                  flexShrink: 0,
                  animation: t.type === 'loading' ? 'spin 1s linear infinite' : undefined,
                  display: 'inline-block',
                }}>
                  {ICONS[t.type]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>{t.message}</p>
                  {t.txHash && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${t.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: c.border, fontSize: '11px', textDecoration: 'none', opacity: 0.8 }}
                    >
                      View on Basescan →
                    </a>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0', fontSize: '16px', lineHeight: '1', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
