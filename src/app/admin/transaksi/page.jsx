'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Plus,
    Search,
    Eye,
    Edit,
    XCircle,
    ClipboardList,
    Loader2,
    Filter,
} from 'lucide-react';
import { transaksiAPI, periodeAPI, dapurAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort, getStatusClass } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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

    // Options
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);

    // Cancel state
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancellingItem, setCancellingItem] = useState(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        fetchData();
    }, [pagination.page, filterPeriode, filterDapur, filterStatus]);

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
                limit: pagination.limit,
                periode_id: filterPeriode || undefined,
                dapur_id: filterDapur || undefined,
                status: filterStatus || undefined,
            };
            const response = await transaksiAPI.getAll(params);
            if (response.data.success) {
                setData(response.data.data);
                setPagination((prev) => ({
                    ...prev,
                    ...response.data.pagination,
                }));
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelTransaksi = async () => {
        if (!cancellingItem) return;

        try {
            setCancelLoading(true);
            await transaksiAPI.cancel(cancellingItem._id);
            toast.success('Transaksi berhasil dibatalkan');
            setCancelDialogOpen(false);
            setCancellingItem(null);
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setCancelLoading(false);
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
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">List Transaksi</h1>
                    <p className="text-gray-500 mt-1">Daftar semua transaksi</p>
                </div>
                <Link
                    href="/admin/transaksi/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Input Transaksi
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Periode */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={filterPeriode}
                            onChange={(e) => {
                                setFilterPeriode(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg appearance-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua Periode</option>
                            {periodeList.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.nama_periode}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Dapur */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={filterDapur}
                            onChange={(e) => {
                                setFilterDapur(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg appearance-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua Dapur</option>
                            {dapurList.map((d) => (
                                <option key={d._id} value={d._id}>
                                    {d.nama_dapur}
                                </option>
                            ))}
                        </select>
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
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua Status</option>
                            <option value="draft">Draft</option>
                            <option value="completed">Selesai</option>
                            <option value="cancelled">Dibatalkan</option>
                        </select>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={() => {
                            setFilterPeriode('');
                            setFilterDapur('');
                            setFilterStatus('');
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium
                     hover:bg-gray-50 transition-colors"
                    >
                        Reset Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : data.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title="Belum ada transaksi"
                        description="Buat transaksi baru untuk memulai"
                        action={
                            <Link
                                href="/admin/transaksi/new"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" />
                                Input Transaksi
                            </Link>
                        }
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left">Kode</th>
                                        <th className="text-left">Dapur</th>
                                        <th className="text-left hidden md:table-cell">Periode</th>
                                        <th className="text-left hidden lg:table-cell">Tanggal</th>
                                        <th className="text-right">Total</th>
                                        <th className="text-right hidden md:table-cell">Keuntungan</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {item.kode_transaksi}
                                                </span>
                                            </td>
                                            <td>
                                                <p className="font-medium text-gray-900">{item.dapur_id?.nama_dapur || '-'}</p>
                                            </td>
                                            <td className="hidden md:table-cell">
                                                <p className="text-gray-600">{item.periode_id?.nama_periode || '-'}</p>
                                            </td>
                                            <td className="hidden lg:table-cell">
                                                <p className="text-gray-600">{formatDateShort(item.tanggal)}</p>
                                            </td>
                                            <td className="text-right font-medium text-gray-900">
                                                {formatCurrency(item.total_harga_jual)}
                                            </td>
                                            <td className="text-right hidden md:table-cell">
                                                <span className="text-green-600 font-medium">
                                                    {formatCurrency(item.total_keuntungan)}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link
                                                        href={`/admin/transaksi/${item._id}`}
                                                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    {item.status === 'draft' && (
                                                        <>
                                                            <Link
                                                                href={`/admin/transaksi/${item._id}/edit`}
                                                                className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Link>
                                                            <button
                                                                onClick={() => {
                                                                    setCancellingItem(item);
                                                                    setCancelDialogOpen(true);
                                                                }}
                                                                className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                                title="Batalkan"
                                                            >
                                                                <XCircle className="w-4 h-4" />
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

                        {/* Pagination */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Menampilkan {data.length} dari {pagination.totalDocuments} data
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

            {/* Cancel Confirm Dialog */}
            <ConfirmDialog
                isOpen={cancelDialogOpen}
                onClose={() => {
                    setCancelDialogOpen(false);
                    setCancellingItem(null);
                }}
                onConfirm={handleCancelTransaksi}
                title="Batalkan Transaksi"
                message={`Apakah Anda yakin ingin membatalkan transaksi "${cancellingItem?.kode_transaksi}"?`}
                confirmText="Ya, Batalkan"
                loading={cancelLoading}
            />
        </div>
    );
}
