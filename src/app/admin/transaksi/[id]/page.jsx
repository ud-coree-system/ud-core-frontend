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
import { getErrorMessage, formatCurrency, formatNumber, formatDate, getStatusClass, toLocalDate, formatDateFilename, normalizeId } from '@/lib/utils';
import { transaksiAPI, barangAPI, udAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import NotaDapur from '@/components/print/NotaDapur';
import NotaDapurPDF from '@/components/print/NotaDapurPDF';

import { downloadPDF } from '@/lib/pdfGenerator';

export default function TransaksiDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [selectedUDForPrint, setSelectedUDForPrint] = useState(null);
    const [downloading, setDownloading] = useState(null);
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [printing, setPrinting] = useState(null); // 'all' or udId

    useEffect(() => {
        if (params.id) {
            fetchData();
        }
    }, [params.id]);

    // Restore original title on unmount
    useEffect(() => {
        const originalTitle = document.title;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [response, barangRes, udRes] = await Promise.all([
                transaksiAPI.getById(params.id),
                barangAPI.getAll({ limit: 1000 }),
                udAPI.getAll({ limit: 1000 })
            ]);

            if (response.data.success) {
                let trx = response.data.data;

                // Enrich items if IDs are just strings
                if (trx.items && barangRes.data.success && udRes.data.success) {
                    const barangMap = new Map(barangRes.data.data.map(b => [normalizeId(b._id), b]));
                    const udMap = new Map(udRes.data.data.map(u => [normalizeId(u._id), u]));

                    // Find missing barang/ud IDs
                    const missingBarangIds = new Set();
                    const missingUdIds = new Set();

                    trx.items.forEach(item => {
                        const bId = normalizeId(item.barang_id?._id || item.barang_id);
                        const uId = normalizeId(item.ud_id?._id || item.ud_id);
                        if (!barangMap.has(bId) && bId) missingBarangIds.add(bId);
                        if (!udMap.has(uId) && uId) missingUdIds.add(uId);
                    });

                    // Fetch missing items and UDs
                    if (missingBarangIds.size > 0 || missingUdIds.size > 0) {
                        const missingBarangPromises = Array.from(missingBarangIds).map(id => barangAPI.getById(id).catch(() => null));
                        const missingUdPromises = Array.from(missingUdIds).map(id => udAPI.getById(id).catch(() => null));

                        const [fetchedBarang, fetchedUd] = await Promise.all([
                            Promise.all(missingBarangPromises),
                            Promise.all(missingUdPromises)
                        ]);

                        fetchedBarang.forEach(res => {
                            if (res?.data?.success) {
                                const b = res.data.data;
                                barangMap.set(normalizeId(b._id), b);
                            }
                        });

                        fetchedUd.forEach(res => {
                            if (res?.data?.success) {
                                const u = res.data.data;
                                udMap.set(normalizeId(u._id), u);
                            }
                        });
                    }

                    trx.items = trx.items.map(item => {
                        const bId = normalizeId(item.barang_id?._id || item.barang_id);
                        const uId = normalizeId(item.ud_id?._id || item.ud_id);

                        return {
                            ...item,
                            barang_id: barangMap.get(bId) || item.barang_id,
                            ud_id: udMap.get(uId) || item.ud_id
                        };
                    });
                }

                setData(trx);
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
            const udId = normalizeId(item.ud_id?._id || item.ud_id) || 'unknown';
            const udName = item.ud_nama || item.ud_id?.nama_ud || 'Unknown UD';
            if (!acc[udId]) {
                acc[udId] = {
                    id: udId,
                    nama_ud: udName,
                    kode_ud: item.ud_kode || item.ud_id?.kode_ud || '',
                    items: [],
                    total: 0,
                };
            }
            acc[udId].items.push(item);
            acc[udId].total += item.subtotal_jual;
            return acc;
        }, {});
    };

    const handlePrintAll = () => {
        const originalTitle = document.title;
        const dateStr = data.tanggal ? formatDateFilename(data.tanggal) : 'date';
        const dapurName = data.dapur_id?.nama_dapur?.replace(/\s+/g, '_') || 'Dapur';
        const newTitle = `Nota_${dapurName}_Semua_${dateStr}`;
        document.title = newTitle;

        setPrinting('all');
        setSelectedUDForPrint(null);
        setTimeout(() => {
            window.print();
            setPrinting(null);
            // Longer delay for mobile capture
            setTimeout(() => {
                document.title = originalTitle;
            }, 5000);
        }, 1000);
    };

    const handlePrintIndividual = (udId) => {
        const itemsByUD = getItemsByUD();
        const udData = itemsByUD[udId];
        const originalTitle = document.title;
        const dateStr = data.tanggal ? formatDateFilename(data.tanggal) : 'date';
        const dapurName = data.dapur_id?.nama_dapur?.replace(/\s+/g, '_') || 'Dapur';
        const udName = udData?.nama_ud || 'UD';
        const newTitle = `Nota_${dapurName}_${udName.replace(/\s+/g, '_')}_${dateStr}`;
        document.title = newTitle;

        setPrinting(udId);
        setSelectedUDForPrint(udId);
        setTimeout(() => {
            window.print();
            setPrinting(null);
            setTimeout(() => {
                setSelectedUDForPrint(null);
                document.title = originalTitle;
            }, 5000); // Shifting to 5s for mobile stability
        }, 1000);
    };

    const handleDownloadIndividual = async (udId, udName) => {
        try {
            setDownloading(udId);
            const dateStr = data.tanggal ? formatDateFilename(data.tanggal) : 'date';
            const dapurName = data.dapur_id?.nama_dapur?.replace(/\s+/g, '_') || 'Dapur';
            const fileName = `Nota_${dapurName}_${udName.replace(/\s+/g, '_')}_${dateStr}.pdf`;

            // Persistent title for mobile tab identification
            document.title = fileName.replace('.pdf', '');

            // Beri waktu React untuk render komponen ke DOM
            await new Promise(resolve => setTimeout(resolve, 300));

            await downloadPDF(`pdf-nota-${udId}`, fileName);
            toast.success('PDF berhasil diunduh');
        } catch (error) {
            toast.error('Gagal mengunduh PDF');
        } finally {
            setDownloading(null);
            // We leave the title so mobile browsers opening it in a tab see it
        }
    };

    const handleDownloadAll = async () => {
        const itemsByUD = getItemsByUD();
        const udEntries = Object.entries(itemsByUD);

        if (udEntries.length === 0) {
            toast.error('Tidak ada data untuk diunduh');
            return;
        }

        try {
            setDownloadingAll(true);
            const dateStr = data.tanggal ? formatDateFilename(data.tanggal) : 'date';
            const dapurName = data.dapur_id?.nama_dapur?.replace(/\s+/g, '_') || 'Dapur';

            document.title = `Nota_${dapurName}_Semua_${dateStr}`;

            // Beri waktu React untuk render komponen ke DOM
            await new Promise(resolve => setTimeout(resolve, 300));

            for (const [udId, udData] of udEntries) {
                const fileName = `Nota_${dapurName}_${udData.nama_ud.replace(/\s+/g, '_')}_${dateStr}.pdf`;
                await downloadPDF(`pdf-nota-${udId}`, fileName);
                // Small delay to prevent browser blocking multiple downloads
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            toast.success('Semua PDF berhasil diunduh');
        } catch (error) {
            toast.error('Gagal mengunduh PDF massal');
            console.error(error);
        } finally {
            setDownloadingAll(false);
            // Leave title for mobile
        }
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
        <div className="space-y-4 md:space-y-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 lg:border-none"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Detail Transaksi</h1>
                        <p className="text-sm text-gray-500 font-mono mt-0.5">{data.kode_transaksi}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                    {data.status === 'draft' && (
                        <button
                            onClick={handleComplete}
                            disabled={completing}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl
                                   hover:bg-green-700 transition-all font-semibold shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50 text-sm"
                        >
                            {completing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            Selesaikan
                        </button>
                    )}

                    {/* <button
                        onClick={handleDownloadAll}
                        disabled={downloadingAll}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl
                                 hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 text-sm"
                    >
                        {downloadingAll ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        Download Semua PDF
                    </button> */}
                    <button
                        onClick={handlePrintAll}
                        disabled={printing === 'all'}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl
                                 hover:bg-blue-700 transition-all font-semibold shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 text-sm"
                    >
                        {printing === 'all' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Printer className="w-4 h-4" />
                        )}
                        Cetak Nota
                    </button>
                    {/* <button
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-xl
                                 hover:bg-gray-50 transition-all font-semibold active:scale-95 text-sm"
                    >
                        <FileText className="w-4 h-4" />
                        Print Detail
                    </button> */}
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dapur</p>
                        <p className="font-bold text-gray-900">{data.dapur_id?.nama_dapur || '-'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Periode</p>
                        <p className="font-bold text-gray-900">{data.periode_id?.nama_periode || '-'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tanggal</p>
                        <p className="font-bold text-gray-900">{formatDate(data.tanggal)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-lg border ${getStatusClass(data.status)}`}>
                            {statusLabels[data.status] || data.status}
                        </span>
                    </div>
                </div>

                <div className="h-px bg-gray-100 my-6" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Total Penjualan</p>
                        <p className="text-xl md:text-2xl font-black text-blue-700 tracking-tight">{formatCurrency(data.total_harga_jual)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/50">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Modal</p>
                        <p className="text-xl md:text-2xl font-black text-gray-700 tracking-tight">{formatCurrency(data.total_harga_modal)}</p>
                    </div>
                    <div className="bg-green-50/50 rounded-xl p-4 border border-green-100/50">
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Keuntungan</p>
                        <p className="text-xl md:text-2xl font-black text-green-700 tracking-tight">{formatCurrency(data.total_keuntungan)}</p>
                    </div>
                </div>
            </div>

            {/* Items by UD */}
            <div className="space-y-4 md:space-y-6">
                {Object.entries(itemsByUD).map(([udId, udData]) => (
                    <div key={udId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* UD Header */}
                        <div className="bg-gray-50/50 px-4 md:px-6 py-4 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 leading-tight">{udData.nama_ud}</h3>
                                        <p className="text-xs text-gray-500 font-medium">{udData.kode_ud}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subtotal UD</p>
                                        <p className="font-black text-gray-900 text-sm md:text-base tracking-tight">{formatCurrency(udData.total)}</p>
                                    </div>
                                    <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block" />
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handlePrintIndividual(udId)}
                                            disabled={printing !== null}
                                            className="p-2 bg-white border border-gray-300 text-gray-700 rounded-xl
                                                     hover:bg-gray-50 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                            title="Cetak Nota UD"
                                        >
                                            {printing === udId ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Printer className="w-5 h-5" />
                                            )}
                                        </button>
                                        {/* <button
                                            onClick={() => handleDownloadIndividual(udId, udData.nama_ud)}
                                            disabled={downloading === udId}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs
                                                     hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {downloading === udId ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <FileText className="w-4 h-4" />
                                            )}
                                            PDF
                                        </button> */}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items - Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap w-10">No</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Nama Barang</th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap w-16">Qty</th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap w-24">Satuan</th>
                                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Harga Jual</th>
                                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Total Harga Jual</th>
                                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Harga Modal</th>
                                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Total Harga Modal</th>
                                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Keuntungan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {udData.items.map((item, index) => (
                                        <tr key={item._id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0">
                                            <td className="px-3 py-4 text-[10px] font-bold text-gray-400">{(index + 1).toString().padStart(2, '0')}</td>
                                            <td className="px-4 py-4 max-w-[200px] lg:max-w-md">
                                                <p className="font-bold text-gray-900 text-sm truncate" title={item.nama_barang || item.barang_id?.nama_barang}>
                                                    {item.nama_barang || item.barang_id?.nama_barang || '-'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-gray-700 text-sm">{formatNumber(item.qty)}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-md uppercase whitespace-nowrap">
                                                    {item.satuan || item.barang_id?.satuan || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right text-xs text-gray-900 font-bold whitespace-nowrap">
                                                {formatCurrency(item.harga_jual)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-blue-600 tracking-tight text-sm whitespace-nowrap">
                                                {formatCurrency(item.qty * item.harga_jual)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-xs text-gray-500 font-medium whitespace-nowrap">
                                                {formatCurrency(item.harga_modal)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-xs text-gray-600 font-medium whitespace-nowrap">
                                                {formatCurrency(item.qty * item.harga_modal)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-green-600 text-sm whitespace-nowrap">
                                                {formatCurrency((item.qty * item.harga_jual) - (item.qty * item.harga_modal))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Items - Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {udData.items.map((item, index) => (
                                <div key={item._id} className="p-4 space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-gray-900 leading-tight">
                                                {item.nama_barang || item.barang_id?.nama_barang || '-'}
                                            </h4>
                                            <p className="text-[10px] text-gray-500 uppercase">
                                                Qty: <span className="font-bold text-gray-900">{formatNumber(item.qty)}</span> • {item.satuan || item.barang_id?.satuan || '-'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Harga Jual</p>
                                            <p className="text-xs font-bold text-gray-900">{formatCurrency(item.harga_jual)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Harga Jual</p>
                                            <p className="text-sm font-black text-blue-600 tracking-tight">{formatCurrency(item.qty * item.harga_jual)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Harga Modal</p>
                                            <p className="text-xs font-semibold text-gray-600">{formatCurrency(item.harga_modal)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Harga Modal</p>
                                            <p className="text-xs font-bold text-gray-700">{formatCurrency(item.qty * item.harga_modal)}</p>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 p-2 rounded-lg flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-green-700 uppercase">Keuntungan</span>
                                        <span className="font-bold text-green-600 text-sm">
                                            {formatCurrency((item.qty * item.harga_jual) - (item.qty * item.harga_modal))}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Created By Info */}
            <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200/50">
                <p className="text-xs text-gray-500 font-medium">
                    Dibuat oleh: <span className="text-gray-900 font-bold">{data.created_by?.username || '-'}</span>
                    <span className="mx-2">•</span>
                    {formatDate(data.createdAt)}
                </p>
            </div>

            {/* AREA CETAK (Hanya untuk window.print) */}
            <NotaDapur
                data={data}
                itemsByUD={itemsByUD}
                udIdFilter={selectedUDForPrint}
            />

            {/* AREA PDF (Hanya untuk download PDF) */}
            {(downloading || downloadingAll) && (
                <NotaDapurPDF
                    data={data}
                    itemsByUD={itemsByUD}
                    udIdFilter={downloadingAll ? null : downloading}
                />
            )}
        </div>
    );
}
