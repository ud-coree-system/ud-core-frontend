'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { generateId } from '@/lib/utils';

const ToastContext = createContext(null);

const toastIcons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const toastStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = generateId();
        setToasts((prev) => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const updateToast = useCallback((id, updates) => {
        setToasts((prev) =>
            prev.map((toast) => (toast.id === id ? { ...toast, ...updates } : toast))
        );
    }, []);

    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        warning: (message, duration) => addToast(message, 'warning', duration),
        info: (message, duration) => addToast(message, 'info', duration),
        update: (id, updates) => updateToast(id, updates),
        dismiss: (id) => removeToast(id),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((t) => {
                    const Icon = toastIcons[t.type];
                    return (
                        <div
                            key={t.id}
                            className={`
                flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
                animate-slide-in min-w-[300px] max-w-[400px] pointer-events-auto
                ${toastStyles[t.type]}
              `}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${iconStyles[t.type]}`} />
                            <p className="flex-1 text-sm font-medium">{t.message}</p>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="flex-shrink-0 p-1 hover:bg-black/5 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
