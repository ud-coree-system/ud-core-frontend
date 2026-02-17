'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    ClipboardList,
    Loader2,
    Filter,
    RotateCcw,
} from 'lucide-react';
import { transaksiAPI, periodeAPI, dapurAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort, getStatusClass, toLocalDate } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SearchableSelect from '@/components/ui/SearchableSelect';
import DatePicker from '@/components/ui/DatePicker';

export default function TransaksiListPage() {
    const { toast } = useToast();

    // State
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalDocuments: 0,
    });

    // Filters
    const [search, setSearch] = useState('');
    const [filterPeriode, setFilterPeriode] = useState('');
    const [filterDapur, setFilterDapur] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTanggal, setFilterTanggal] = useState(null);

    // Options
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);
    const [highlightedDates, setHighlightedDates] = useState([]);

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Hard delete state
    const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
    const [hardDeletingItem, setHardDeletingItem] = useState(null);
    const [hardDeleteLoading, setHardDeleteLoading] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');

    // Uncomplete state (Secure)
    const [uncompleteDialogOpen, setUncompleteDialogOpen] = useState(false);
    const [uncompletingItem, setUncompletingItem] = useState(null);
    const [uncompleteLoading, setUncompleteLoading] = useState(false);
    const [uncompleteVerificationCode, setUncompleteVerificationCode] = useState('');

    // Uncancel state (Simple)
    const [uncancelDialogOpen, setUncancelDialogOpen] = useState(false);
    const [uncancelingItem, setUncancelingItem] = useState(null);
    const [uncancelLoading, setUncancelLoading] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        fetchData();
        fetchHighlightedDates();
    }, [pagination.page, filterPeriode, filterDapur, filterStatus, filterTanggal]);

    const fetchOptions = async () => {
        try {
            const [periodeRes, dapurRes] = await Promise.all([
                periodeAPI.getAll({ limit: 50 }),
                dapurAPI.getAll({ limit: 100 }),
            ]);

            if (periodeRes.data.success) {
                setPeriodeList(periodeRes.data.data);
            }
            if (dapurRes.data.success) {
                setDapurList(dapurRes.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch options:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: filterTanggal ? 500 : pagination.limit,
                periode_id: filterPeriode || undefined,
                dapur_id: filterDapur || undefined,
                status: filterStatus || undefined,
                tanggal: filterTanggal ? `${filterTanggal.getFullYear()}-${String(filterTanggal.getMonth() + 1).padStart(2, '0')}-${String(filterTanggal.getDate()).padStart(2, '0')}` : undefined,
            };
            const response = await transaksiAPI.getAll(params);
            if (response.data.success) {
                let filteredData = response.data.data;

                // Backup client-side filter for tanggal (in case API doesn't support it)
                if (filterTanggal) {
                    const targetDateStr = `${filterTanggal.getFullYear()}-${String(filterTanggal.getMonth() + 1).padStart(2, '0')}-${String(filterTanggal.getDate()).padStart(2, '0')}`;
                    filteredData = filteredData.filter(item => toLocalDate(item.tanggal) === targetDateStr);
                }

                setData(filteredData);
                setPagination((prev) => ({
                    ...prev,
                    ...response.data.pagination,
                    // If we filtered client-side, the total count from server might be misleading, 
                    // but for simple list view this is better than showing wrong dates.
                }));
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const fetchHighlightedDates = async () => {
        try {
            // Fetch a larger set to get more dates for highlighting
            // ideally we'd have a specific endpoint, but let's fetch 100 recent ones 
            // filtered by the current Dapur and Periode
            const params = {
                limit: 100,
                periode_id: filterPeriode || undefined,
                dapur_id: filterDapur || undefined,
            };
            const response = await transaksiAPI.getAll(params);
            if (response.data.success) {
                const dates = response.data.data.map(item => new Date(item.tanggal));
                setHighlightedDates(dates);
            }
        } catch (error) {
            console.error('Failed to fetch highlighted dates:', error);
        }
    };

    const handleDeleteTransaksi = async () => {
        if (!deletingItem) return;

        try {
            setDeleteLoading(true);
            await transaksiAPI.cancel(deletingItem._id);
            toast.success('Transaksi berhasil dibatalkan');
            setDeleteDialogOpen(false);
            setDeletingItem(null);
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleHardDeleteTransaksi = async () => {
        if (!hardDeletingItem) return;
        if (verificationCode !== hardDeletingItem.kode_transaksi) {
            toast.error('Kode transaksi tidak sesuai');
            return;
        }

        try {
            setHardDeleteLoading(true);
            await transaksiAPI.hardDelete(hardDeletingItem._id);
            toast.success('Transaksi berhasil dihapus secara permanen');
            setHardDeleteDialogOpen(false);
            setHardDeletingItem(null);
            setVerificationCode('');
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setHardDeleteLoading(false);
        }
    };

    const handleUncompleteTransaksi = async () => {
        if (!uncompletingItem) return;
        if (uncompleteVerificationCode !== uncompletingItem.kode_transaksi) {
            toast.error('Kode transaksi tidak sesuai');
            return;
        }

        try {
            setUncompleteLoading(true);
            await transaksiAPI.uncomplete(uncompletingItem._id);
            toast.success('Transaksi berhasil dikembalikan ke Draft');
            setUncompleteDialogOpen(false);
            setUncompletingItem(null);
            setUncompleteVerificationCode('');
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setUncompleteLoading(false);
        }
    };

    const handleUncancelTransaksi = async () => {
        if (!uncancelingItem) return;

        try {
            setUncancelLoading(true);
            await transaksiAPI.uncancel(uncancelingItem._id);
            toast.success('Transaksi berhasil dibatalkan pembatalannya');
            setUncancelDialogOpen(false);
            setUncancelingItem(null);
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setUncancelLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusLabels = {
            draft: 'Draft',
            completed: 'Selesai',
            cancelled: 'Dibatalkan',
        };
        return (
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(status)}`}>
                {statusLabels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">List Transaksi</h1>
                    <p className="text-sm md:text-base text-gray-500 mt-0.5">Daftar semua transaksi</p>
                </div>
                <Link
                    href="/admin/transaksi/new"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl
                           hover:bg-blue-700 transition-all font-semibold shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Input Transaksi
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                    {/* Periode */}
                    <div className="relative">
                        <SearchableSelect
                            value={filterPeriode}
                            onChange={(e) => {
                                setFilterPeriode(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            options={periodeList.map(p => ({
                                value: p._id,
                                label: `${p.nama_periode} (${formatDateShort(p.tanggal_mulai)} - ${formatDateShort(p.tanggal_selesai)})`
                            }))}
                            placeholder="Semua Periode"
                            searchPlaceholder="Cari periode..."
                            className="text-sm"
                        />
                    </div>

                    {/* Dapur */}
                    <div className="relative">
                        <SearchableSelect
                            value={filterDapur}
                            onChange={(e) => {
                                setFilterDapur(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            options={dapurList.map(d => ({
                                value: d._id,
                                label: d.nama_dapur
                            }))}
                            placeholder="Semua Dapur"
                            searchPlaceholder="Cari dapur..."
                            className="text-sm"
                        />
                    </div>

                    {/* Status */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => {
                                setFilterStatus(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg appearance-none
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-sm"
                        >
                            <option value="">Semua Status</option>
                            <option value="draft">Draft</option>
                            <option value="completed">Selesai</option>
                            <option value="cancelled">Dibatalkan</option>
                        </select>
                    </div>

                    {/* Tanggal */}
                    <div className="relative">
                        <DatePicker
                            selected={filterTanggal}
                            onChange={(date) => {
                                setFilterTanggal(date);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            placeholder="Semua Tanggal"
                            highlightDates={highlightedDates}
                            className="w-full"
                            inputClassName="w-full pl-3 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-sm h-[42px]"
                        />
                    </div>

                    {/* Reset */}
                    <button
                        onClick={() => {
                            setFilterPeriode('');
                            setFilterDapur('');
                            setFilterStatus('');
                            setFilterTanggal(null);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium
                                 hover:bg-gray-50 transition-colors text-sm"
                    >
                        Reset Filter
                    </button>
                </div>
            </div>

            {/* List / Table Content */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                        <p className="text-gray-500 text-sm animate-pulse">Memuat data transaksi...</p>
                    </div>
                ) : data.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title="Belum ada transaksi"
                        description="Buat transaksi baru untuk memulai"
                        action={
                            <Link
                                href="/admin/transaksi/new"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-all active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Input Transaksi
                            </Link>
                        }
                    />
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-10">
                                            No
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-32">
                                            Kode
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Dapur
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                                            Periode
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Tanggal
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Total
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                                            Untung
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.map((item, index) => (
                                        <tr key={item._id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0">
                                            <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                                                {(pagination.page - 1) * pagination.limit + index + 1}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap">
                                                <span className="font-mono text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200">
                                                    {item.kode_transaksi}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 max-w-[150px] lg:max-w-xs">
                                                <p className="font-bold text-gray-900 text-sm truncate" title={item.dapur_id?.nama_dapur}>
                                                    {item.dapur_id?.nama_dapur || '-'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 hidden xl:table-cell max-w-[120px]">
                                                <p className="text-gray-600 text-sm truncate" title={item.periode_id?.nama_periode}>
                                                    {item.periode_id?.nama_periode || '-'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <p className="text-gray-500 text-sm">{formatDateShort(item.tanggal)}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-gray-900 text-sm whitespace-nowrap">
                                                {formatCurrency(item.total_harga_jual)}
                                            </td>
                                            <td className="px-4 py-4 text-right hidden lg:table-cell whitespace-nowrap">
                                                <span className="text-green-600 font-bold text-sm">
                                                    {formatCurrency(item.total_keuntungan)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <Link
                                                        href={`/admin/transaksi/${item._id}`}
                                                        className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    {item.status === 'draft' && (
                                                        <>
                                                            <Link
                                                                href={`/admin/transaksi/${item._id}/edit`}
                                                                className="p-1.5 hover:bg-yellow-100 rounded-lg text-yellow-600 transition-colors"
                                                                title="Edit Transaksi"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Link>
                                                            <button
                                                                onClick={() => {
                                                                    setDeletingItem(item);
                                                                    setDeleteDialogOpen(true);
                                                                }}
                                                                className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                                                                title="Batalkan Transaksi"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === 'completed' && (
                                                        <button
                                                            onClick={() => {
                                                                setUncompletingItem(item);
                                                                setUncompleteDialogOpen(true);
                                                                setUncompleteVerificationCode('');
                                                            }}
                                                            className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                                            title="Kembalikan ke Draft"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {item.status === 'cancelled' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setUncancelingItem(item);
                                                                    setUncancelDialogOpen(true);
                                                                }}
                                                                className="p-1.5 hover:bg-green-100 rounded-lg text-green-600 transition-colors"
                                                                title="Kembalikan ke Draft"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setHardDeletingItem(item);
                                                                    setHardDeleteDialogOpen(true);
                                                                    setVerificationCode('');
                                                                }}
                                                                className="p-1.5 hover:bg-red-100 rounded-lg text-red-700 transition-colors"
                                                                title="Hapus Permanen"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {data.map((item, index) => (
                                <div key={item._id} className="p-4 space-y-3 active:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    #{(pagination.page - 1) * pagination.limit + index + 1}
                                                </span>
                                                <span className="font-mono text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-200">
                                                    {item.kode_transaksi}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 leading-tight">
                                                {item.dapur_id?.nama_dapur || 'Unknown Dapur'}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {item.periode_id?.nama_periode} • {formatDateShort(item.tanggal)}
                                            </p>
                                        </div>
                                        {getStatusBadge(item.status)}
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Transaksi</p>
                                            <p className="font-black text-blue-600 text-lg">
                                                {formatCurrency(item.total_harga_jual)}
                                            </p>
                                            <p className="text-[10px] text-green-600 font-bold">
                                                Untung: {formatCurrency(item.total_keuntungan)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/admin/transaksi/${item._id}`}
                                                className="flex flex-col items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-xl"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </Link>
                                            {item.status === 'draft' && (
                                                <>
                                                    <Link
                                                        href={`/admin/transaksi/${item._id}/edit`}
                                                        className="flex flex-col items-center justify-center w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl"
                                                        title="Edit Transaksi"
                                                    >
                                                        <Edit className="w-5 h-5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setDeletingItem(item);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        className="flex flex-col items-center justify-center w-10 h-10 bg-red-50 text-red-600 rounded-xl"
                                                        title="Batalkan Transaksi"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            {item.status === 'completed' && (
                                                <button
                                                    onClick={() => {
                                                        setUncompletingItem(item);
                                                        setUncompleteDialogOpen(true);
                                                        setUncompleteVerificationCode('');
                                                    }}
                                                    className="flex flex-col items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-xl"
                                                    title="Kembalikan ke Draft"
                                                >
                                                    <RotateCcw className="w-5 h-5" />
                                                </button>
                                            )}
                                            {item.status === 'cancelled' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setUncancelingItem(item);
                                                            setUncancelDialogOpen(true);
                                                        }}
                                                        className="flex flex-col items-center justify-center w-10 h-10 bg-green-50 text-green-600 rounded-xl"
                                                        title="Kembalikan ke Draft"
                                                    >
                                                        <RotateCcw className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setHardDeletingItem(item);
                                                            setHardDeleteDialogOpen(true);
                                                            setVerificationCode('');
                                                        }}
                                                        className="flex flex-col items-center justify-center w-10 h-10 bg-red-50 text-red-700 rounded-xl"
                                                        title="Hapus Permanen"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-xs md:text-sm text-gray-500 font-medium">
                                    Menampilkan <span className="text-gray-900">{data.length}</span> dari <span className="text-gray-900">{pagination.totalDocuments}</span> data
                                </p>
                                <Pagination
                                    currentPage={pagination.page}
                                    totalPages={pagination.totalPages}
                                    onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setDeletingItem(null);
                }}
                onConfirm={handleDeleteTransaksi}
                title="Batalkan Transaksi"
                message={`Apakah Anda yakin ingin membatalkan transaksi "${deletingItem?.kode_transaksi}"? Status transaksi akan berubah menjadi "Dibatalkan".`}
                confirmText="Ya, Batalkan"
                loading={deleteLoading}
            />

            {/* Uncancel Confirm Dialog */}
            <ConfirmDialog
                isOpen={uncancelDialogOpen}
                onClose={() => {
                    setUncancelDialogOpen(false);
                    setUncancelingItem(null);
                }}
                onConfirm={handleUncancelTransaksi}
                title="Kembalikan Transaksi"
                message={`Apakah Anda yakin ingin mengembalikan transaksi "${uncancelingItem?.kode_transaksi}" ke status Draft?`}
                confirmText="Ya, Kembalikan"
                variant="info"
                loading={uncancelLoading}
            />

            {/* Uncomplete Secure Confirm Dialog */}
            <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${uncompleteDialogOpen ? 'visible' : 'hidden'}`}>
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => {
                        if (!uncompleteLoading) {
                            setUncompleteDialogOpen(false);
                            setUncompletingItem(null);
                        }
                    }}
                />
                <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-fade-in text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <RotateCcw className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Uncomplete Transaksi</h3>
                    <p className="text-gray-500 mb-6 text-sm">
                        Mengembalikan transaksi <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1 rounded">{uncompletingItem?.kode_transaksi}</span> ke status **Draft**.
                        Ini akan memungkinkan Anda untuk mengedit kembali transaksi ini.
                    </p>
                    <div className="mb-6 text-left">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Ketik Kode Transaksi untuk Konfirmasi
                        </label>
                        <input
                            type="text"
                            value={uncompleteVerificationCode}
                            onChange={(e) => setUncompleteVerificationCode(e.target.value)}
                            placeholder={uncompletingItem?.kode_transaksi}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-center tracking-wider transition-all"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => {
                                setUncompleteDialogOpen(false);
                                setUncompletingItem(null);
                            }}
                            disabled={uncompleteLoading}
                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleUncompleteTransaksi}
                            disabled={uncompleteLoading || uncompleteVerificationCode !== uncompletingItem?.kode_transaksi}
                            className="flex-[1.5] px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale disabled:shadow-none active:scale-95"
                        >
                            {uncompleteLoading ? 'Memproses...' : 'Ya, Kembalikan ke Draft'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hard Delete Confirm Dialog */}
            <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${hardDeleteDialogOpen ? 'visible' : 'hidden'}`}>
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => {
                        if (!hardDeleteLoading) {
                            setHardDeleteDialogOpen(false);
                            setHardDeletingItem(null);
                        }
                    }}
                />

                {/* Dialog */}
                <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Permanen</h3>
                        <p className="text-gray-500 mb-6 text-sm">
                            Tindakan ini <span className="font-bold text-red-600 uppercase">tidak dapat dibatalkan</span>.
                            Transaksi <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1 rounded">{hardDeletingItem?.kode_transaksi}</span> akan dihapus selamanya dari database.
                        </p>

                        <div className="mb-6 text-left">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Ketik Kode Transaksi untuk Konfirmasi
                            </label>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder={hardDeletingItem?.kode_transaksi}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono text-center tracking-wider transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setHardDeleteDialogOpen(false);
                                    setHardDeletingItem(null);
                                }}
                                disabled={hardDeleteLoading}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleHardDeleteTransaksi}
                                disabled={hardDeleteLoading || verificationCode !== hardDeletingItem?.kode_transaksi}
                                className="flex-[1.5] px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:grayscale disabled:shadow-none active:scale-95"
                            >
                                {hardDeleteLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menghapus...</span>
                                    </div>
                                ) : 'Hapus Selamanya'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
