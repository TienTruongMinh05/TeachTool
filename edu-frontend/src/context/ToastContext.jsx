// File: src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertDialog, setAlertDialog] = useState(null);

  // 1. TOAST NOTIFICATIONS
  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur || 4500),
    warning: (msg, dur) => addToast(msg, 'warning', dur || 4000),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  // 2. IN-APP CONFIRM DIALOG (Returns Promise<boolean>)
  const confirm = useCallback(({
    title = 'Xác nhận',
    message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    type = 'danger' // 'danger' | 'warning' | 'info'
  }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  // 3. IN-APP ALERT MODAL (Returns Promise<void>)
  const showAlert = useCallback(({
    title = 'Thông báo',
    message = '',
    okText = 'Đã hiểu',
    type = 'info' // 'info' | 'error' | 'success' | 'warning'
  }) => {
    return new Promise((resolve) => {
      setAlertDialog({
        title,
        message,
        okText,
        type,
        onClose: () => {
          setAlertDialog(null);
          resolve();
        }
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast, confirm, showAlert }}>
      {children}

      {/* TOAST CONTAINER (Góc trên bên phải / Trên cùng trên điện thoại) */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] pointer-events-none space-y-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 sm:slide-in-from-right-4 ${
              t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
                : t.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/40'
                : t.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/40'
                : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/40'
            }`}>
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <span className="text-base shrink-0 mt-0.5">
                {t.type === 'success' && '✅'}
                {t.type === 'error' && '❌'}
                {t.type === 'warning' && '⚠️'}
                {t.type === 'info' && 'ℹ️'}
              </span>
              <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-xs opacity-60 hover:opacity-100 p-1 rounded transition cursor-pointer shrink-0">
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* CONFIRM MODAL IN-APP */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                confirmDialog.type === 'danger'
                  ? 'bg-rose-100 text-rose-600'
                  : confirmDialog.type === 'warning'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {confirmDialog.type === 'danger' ? '🗑️' : confirmDialog.type === 'warning' ? '⚠️' : '❓'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4.5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition cursor-pointer ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL IN-APP */}
      {alertDialog && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                alertDialog.type === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : alertDialog.type === 'success'
                  ? 'bg-emerald-100 text-emerald-600'
                  : alertDialog.type === 'warning'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {alertDialog.type === 'error' ? '❌' : alertDialog.type === 'success' ? '✅' : alertDialog.type === 'warning' ? '⚠️' : 'ℹ️'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {alertDialog.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                  {alertDialog.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={alertDialog.onClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs">
                {alertDialog.okText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: {
        success: (msg) => console.log('SUCCESS:', msg),
        error: (msg) => console.error('ERROR:', msg),
        warning: (msg) => console.warn('WARNING:', msg),
        info: (msg) => console.info('INFO:', msg),
      },
      confirm: async ({ message }) => window.confirm(message),
      showAlert: async ({ message }) => window.alert(message),
    };
  }
  return context;
};
