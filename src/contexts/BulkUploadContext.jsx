'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { barangAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils';

const BulkUploadContext = createContext(null);

export function BulkUploadProvider({ children }) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
    const [result, setResult] = useState({ success: [], failed: [] });
    const toastIdRef = useRef(null);

    const startUpload = useCallback(async (validData) => {
        if (isUploading) return;

        setIsUploading(true);
        const total = validData.length;
        const initialProgress = { current: 0, total, success: 0, failed: 0 };
        setProgress(initialProgress);
        setResult({ success: [], failed: [] });

        const successItems = [];
        const failedItems = [];

        // Create or update progress toast
        toastIdRef.current = toast.info(`Memulai upload ${total} barang...`, 0);

        for (let i = 0; i < total; i++) {
            const item = validData[i];
            const current = i + 1;

            try {
                const payload = {
                    nama_barang: item.namaBarang,
                    satuan: item.satuan,
                    harga_jual: item.hargaJual,
                    harga_modal: item.hargaModal,
                    ud_id: item.ud._id,
                    isActive: true,
                };

                await barangAPI.create(payload);
                successItems.push(item);

                setProgress(prev => ({ ...prev, current, success: prev.success + 1 }));

                toast.update(toastIdRef.current, {
                    message: `Uploading: ${current}/${total} (${successItems.length} sukses, ${failedItems.length} gagal)`
                });

            } catch (error) {
                const failedItem = {
                    ...item,
                    uploadError: getErrorMessage(error),
                };
                failedItems.push(failedItem);

                setProgress(prev => ({ ...prev, current, failed: prev.failed + 1 }));

                toast.update(toastIdRef.current, {
                    message: `Uploading: ${current}/${total} (${successItems.length} sukses, ${failedItems.length} gagal)`
                });
            }

            // Small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        setIsUploading(false);
        setResult({ success: successItems, failed: failedItems });

        // Update final toast
        if (failedItems.length === 0) {
            toast.update(toastIdRef.current, {
                message: `Berhasil mengupload ${successItems.length} barang`,
                type: 'success'
            });
        } else {
            toast.update(toastIdRef.current, {
                message: `Upload selesai: ${successItems.length} sukses, ${failedItems.length} gagal`,
                type: 'warning'
            });
        }

        // Auto-dismiss after 5 seconds
        const finalToastId = toastIdRef.current;
        setTimeout(() => {
            toast.dismiss(finalToastId);
        }, 5000);
    }, [isUploading, toast]);

    const resetUploadState = useCallback(() => {
        setIsUploading(false);
        setProgress({ current: 0, total: 0, success: 0, failed: 0 });
        setResult({ success: [], failed: [] });
        toastIdRef.current = null;
    }, []);

    return (
        <BulkUploadContext.Provider value={{
            isUploading,
            progress,
            result,
            startUpload,
            resetUploadState
        }}>
            {children}
        </BulkUploadContext.Provider>
    );
}

export function useBulkUpload() {
    const context = useContext(BulkUploadContext);
    if (!context) {
        throw new Error('useBulkUpload must be used within a BulkUploadProvider');
    }
    return context;
}
