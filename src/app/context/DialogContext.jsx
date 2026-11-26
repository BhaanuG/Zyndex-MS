import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, HelpCircle, Info, X } from 'lucide-react';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { type: 'alert' | 'confirm', title, message, confirmText, cancelText, resolve }

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      let config = {};
      if (typeof options === 'string') {
        config = { message: options };
      } else {
        config = options || {};
      }

      setDialog({
        type: 'confirm',
        title: config.title || 'Confirmation Required',
        message: config.message || '',
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        isDestructive: Boolean(config.isDestructive),
        resolve: (val) => {
          setDialog(null);
          resolve(val);
        }
      });
    });
  }, []);

  const showAlert = useCallback((options) => {
    return new Promise((resolve) => {
      let config = {};
      if (typeof options === 'string') {
        config = { message: options };
      } else {
        config = options || {};
      }

      setDialog({
        type: 'alert',
        title: config.title || 'Notice',
        message: config.message || '',
        confirmText: config.confirmText || 'Got it',
        statusType: config.statusType || 'info', // 'success' | 'error' | 'info'
        resolve: () => {
          setDialog(null);
          resolve(true);
        }
      });
    });
  }, []);

  // Intercept window.alert and window.confirm globally across the application so no native browser URL popups ever appear
  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    window.alert = (msg) => {
      showAlert(String(msg ?? ''));
    };

    window.confirm = (msg) => {
      // Synchronous return fallback for old code while async showConfirm is preferred
      showConfirm(String(msg ?? ''));
      return false; // Return false synchronously so action is safely handled by async modal
    };

    // Also attach custom event listeners so any component can invoke without imports
    const handleCustomAlert = (e) => {
      if (e.detail) showAlert(e.detail);
    };
    const handleCustomConfirm = (e) => {
      if (e.detail) showConfirm(e.detail);
    };

    window.addEventListener('zyndex:alert', handleCustomAlert);
    window.addEventListener('zyndex:confirm', handleCustomConfirm);

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      window.removeEventListener('zyndex:alert', handleCustomAlert);
      window.removeEventListener('zyndex:confirm', handleCustomConfirm);
    };
  }, [showAlert, showConfirm]);

  const handleClose = (result) => {
    if (dialog?.resolve) {
      dialog.resolve(result);
    } else {
      setDialog(null);
    }
  };

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert }}>
      {children}

      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 md:p-7 space-y-5 text-center">
                {/* Icon Badge */}
                <div className="mx-auto flex items-center justify-center">
                  {dialog.type === 'confirm' ? (
                    <div className={`size-16 rounded-2xl flex items-center justify-center shadow-xs ${
                      dialog.isDestructive
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-orange-50 text-orange-600 border border-orange-200'
                    }`}>
                      <HelpCircle className="size-8" />
                    </div>
                  ) : dialog.statusType === 'success' ? (
                    <div className="size-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="size-8" />
                    </div>
                  ) : dialog.statusType === 'error' ? (
                    <div className="size-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shadow-xs">
                      <AlertCircle className="size-8" />
                    </div>
                  ) : (
                    <div className="size-16 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shadow-xs">
                      <Info className="size-8" />
                    </div>
                  )}
                </div>

                {/* Title & Message */}
                <div className="space-y-2.5">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {dialog.title}
                  </h3>
                  <div className="text-sm text-slate-600 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line text-left bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                    {dialog.message}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  {dialog.type === 'confirm' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleClose(true)}
                        className={`flex-1 py-3 px-5 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-98 ${
                          dialog.isDestructive
                            ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
                            : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-orange-600/25'
                        }`}
                      >
                        {dialog.confirmText}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClose(false)}
                        className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-98"
                      >
                        {dialog.cancelText}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleClose(true)}
                      className="w-full py-3 px-5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-600/25 transition-all cursor-pointer active:scale-98"
                    >
                      {dialog.confirmText}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
