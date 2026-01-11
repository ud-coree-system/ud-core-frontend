'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Loader2,
    FileText,
    Printer,
    CheckCircle,
} from 'lucide-react';
import { transaksiAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDate, getStatusClass } from '@/lib/utils';

export default function TransaksiDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchData();
        }
    }, [params.id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await transaksiAPI.getById(params.id);
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
            router.push('/admin/transaksi');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        try {
            setCompleting(true);
            await transaksiAPI.complete(params.id);
            toast.success('Transaksi berhasil diselesaikan');
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setCompleting(false);
        }
    };

    // Group items by UD
    const getItemsByUD = () => {
        if (!data?.items) return {};
        return data.items.reduce((acc, item) => {
            const udId = item.ud_id?._id || 'unknown';
            const udName = item.ud_id?.nama_ud || 'Unknown UD';
            if (!acc[udId]) {
                acc[udId] = {
                    nama_ud: udName,
                    kode_ud: item.ud_id?.kode_ud || '',
                    items: [],
                    total: 0,
                };
            }
            acc[udId].items.push(item);
            acc[udId].total += item.subtotal_jual;
            return acc;
        }, {});
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Memuat data...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const itemsByUD = getItemsByUD();
    const statusLabels = {
        draft: 'Draft',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Detail Transaksi</h1>
                        <p className="text-gray-500 font-mono">{data.kode_transaksi}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {data.status === 'draft' && (
                        <button
                            onClick={handleComplete}
                            disabled={completing}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                       hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {completing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            Selesaikan
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg
                     hover:bg-gray-50 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Dapur</p>
                        <p className="font-medium text-gray-900">{data.dapur_id?.nama_dapur || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Periode</p>
                        <p className="font-medium text-gray-900">{data.periode_id?.nama_periode || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Tanggal</p>
                        <p className="font-medium text-gray-900">{formatDate(data.tanggal)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Status</p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(data.status)}`}>
                            {statusLabels[data.status] || data.status}
                        </span>
                    </div>
                </div>

                <hr className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 mb-1">Total Penjualan</p>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.total_harga_jual)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Modal</p>
                        <p className="text-2xl font-bold text-gray-700">{formatCurrency(data.total_harga_modal)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 mb-1">Keuntungan</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(data.total_keuntungan)}</p>
                    </div>
                </div>
            </div>

            {/* Items by UD */}
            {Object.entries(itemsByUD).map(([udId, udData]) => (
                <div key={udId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* UD Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-500" />
                                <div>
                                    <h3 className="font-semibold text-gray-900">{udData.nama_ud}</h3>
                                    <p className="text-sm text-gray-500">{udData.kode_ud}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Subtotal UD</p>
                                <p className="font-semibold text-gray-900">{formatCurrency(udData.total)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">No</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Nama Barang</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Satuan</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Qty</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Harga</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {udData.items.map((item, index) => (
                                    <tr key={item._id} className="border-t border-gray-100">
                                        <td className="px-6 py-3 text-gray-600">{index + 1}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {item.barang_id?.nama_barang || '-'}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                                                {item.barang_id?.satuan || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center font-medium">{item.qty}</td>
                                        <td className="px-6 py-3 text-right text-gray-600">
                                            {formatCurrency(item.harga_jual)}
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium text-gray-900">
                                            {formatCurrency(item.subtotal_jual)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {/* Created By Info */}
            <div className="text-center text-sm text-gray-500">
                Dibuat oleh: {data.created_by?.username || '-'} • {formatDate(data.createdAt)}
            </div>
        </div>
    );
}
