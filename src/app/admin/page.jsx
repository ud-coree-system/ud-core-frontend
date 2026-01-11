'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Building2,
    Package,
    ChefHat,
    Calendar,
    TrendingUp,
    DollarSign,
    ShoppingCart,
    BarChart3,
    ArrowRight,
    Loader2,
} from 'lucide-react';
import { dashboardAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getStatusClass, getErrorMessage } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import StatsCard from '@/components/admin/StatsCard';

export default function DashboardPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [salesByUD, setSalesByUD] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [summaryRes, recentRes, salesRes] = await Promise.all([
                dashboardAPI.getSummary(),
                dashboardAPI.getRecent({ limit: 5 }),
                dashboardAPI.getSalesByUD(),
            ]);

            if (summaryRes.data.success) {
                setStats(summaryRes.data.data);
            }
            if (recentRes.data.success) {
                setRecentTransactions(recentRes.data.data);
            }
            if (salesRes.data.success) {
                setSalesByUD(salesRes.data.data);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Memuat data dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Selamat datang! Berikut ringkasan data sistem.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total UD"
                    value={stats?.totalUD || 0}
                    icon={Building2}
                />
                <StatsCard
                    title="Total Barang"
                    value={stats?.totalBarang || 0}
                    icon={Package}
                />
                <StatsCard
                    title="Total Dapur"
                    value={stats?.totalDapur || 0}
                    icon={ChefHat}
                />
                <StatsCard
                    title="Total Periode"
                    value={stats?.totalPeriode || 0}
                    icon={Calendar}
                />
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <DollarSign className="w-6 h-6" />
                        <span className="font-medium">Total Penjualan</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(stats?.totalPenjualan || 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <ShoppingCart className="w-6 h-6" />
                        <span className="font-medium">Total Modal</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(stats?.totalModal || 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-6 h-6" />
                        <span className="font-medium">Total Keuntungan</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(stats?.totalKeuntungan || 0)}</p>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Transactions */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Transaksi Terbaru</h2>
                        <Link
                            href="/admin/transaksi"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            Lihat Semua
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {recentTransactions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Belum ada transaksi
                            </div>
                        ) : (
                            recentTransactions.map((trx) => (
                                <div key={trx._id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900">{trx.kode_transaksi}</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(trx.status)}`}>
                                            {trx.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">
                                            {trx.dapur_id?.nama_dapur || '-'}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {formatCurrency(trx.total_harga_jual)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatDateTime(trx.tanggal)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Sales by UD */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Penjualan per UD</h2>
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="divide-y divide-gray-100">
                        {salesByUD.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Belum ada data penjualan
                            </div>
                        ) : (
                            salesByUD.slice(0, 5).map((ud) => (
                                <div key={ud._id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <span className="font-medium text-gray-900">{ud.nama_ud}</span>
                                            <span className="text-xs text-gray-500 ml-2">({ud.kode_ud})</span>
                                        </div>
                                        <span className="text-sm font-medium text-green-600">
                                            {formatCurrency(ud.totalKeuntungan)}
                                        </span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                            style={{
                                                width: `${Math.min(
                                                    (ud.totalJual / (salesByUD[0]?.totalJual || 1)) * 100,
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                                        <span>Penjualan: {formatCurrency(ud.totalJual)}</span>
                                        <span>Qty: {ud.totalQty}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Link
                        href="/admin/transaksi/new"
                        className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
                    >
                        <ShoppingCart className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-blue-900">Input Transaksi</span>
                    </Link>
                    <Link
                        href="/admin/laporan"
                        className="flex flex-col items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group"
                    >
                        <BarChart3 className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-green-900">Buat Laporan</span>
                    </Link>
                    <Link
                        href="/admin/barang"
                        className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group"
                    >
                        <Package className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-purple-900">Kelola Barang</span>
                    </Link>
                    <Link
                        href="/admin/ud"
                        className="flex flex-col items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors group"
                    >
                        <Building2 className="w-8 h-8 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-orange-900">Kelola UD</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
