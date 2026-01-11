'use client';

import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Konfirmasi',
    message = 'Apakah Anda yakin ingin melanjutkan?',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    variant = 'danger', // 'danger' | 'warning' | 'info'
    loading = false,
}) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-red-100 text-red-600',
            button: 'bg-red-600 hover:bg-red-700 text-white',
        },
        warning: {
            icon: 'bg-yellow-100 text-yellow-600',
            button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        },
        info: {
            icon: 'bg-blue-100 text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 text-white',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl animate-fade-in p-6">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                <div className="text-center">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${styles.icon}`}>
                        <AlertTriangle className="w-7 h-7" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-gray-500 mb-6">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium
                       hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${styles.button}`}
                        >
                            {loading ? 'Memproses...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
