'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    Package,
    ChefHat,
    Loader2,
    Lock,
    CheckCircle,
    XCircle,
    RotateCcw
} from 'lucide-react';
import { barangAPI, dapurAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

export default function KitchenBarangPage() {
    const { toast } = useToast();

    // Auth State
    const [isVerified, setIsVerified] = useState(false);
    const [kitchenCode, setKitchenCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [kitchenName, setKitchenName] = useState('');

    // Data State
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        totalPages: 1,
        totalDocuments: 0,
    });

    useEffect(() => {
        // Check local storage for existing session
        const storedCode = localStorage.getItem('kitchen_access_code');
        const storedName = localStorage.getItem('kitchen_name');
        if (storedCode && storedName) {
            setKitchenCode(storedCode);
            setKitchenName(storedName);
            setIsVerified(true);
        }
    }, []);

    useEffect(() => {
        if (isVerified) {
            fetchData();
        }
    }, [isVerified, pagination.page, search]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: search || undefined,
            };
            const response = await barangAPI.getAll(params);
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

    const handleVerify = async (e) => {
        if (e) e.preventDefault();
        if (!kitchenCode.trim()) {
            toast.warning('Masukkan kode dapur');
            return;
        }

        try {
            setVerifying(true);
            const response = await dapurAPI.getAll({ isActive: true });
            if (response.data.success) {
                const kitchens = response.data.data;
                const kitchen = kitchens.find(k => k.kode_dapur.toLowerCase() === kitchenCode.trim().toLowerCase());

                if (kitchen) {
                    setIsVerified(true);
                    setKitchenName(kitchen.nama_dapur);
                    localStorage.setItem('kitchen_access_code', kitchenCode.trim());
                    localStorage.setItem('kitchen_name', kitchen.nama_dapur);
                    toast.success(`Akses diberikan: ${kitchen.nama_dapur}`);
                } else {
                    toast.error('Kode dapur tidak valid atau tidak aktif');
                }
            }
        } catch (error) {
            toast.error('Gagal memverifikasi kode');
        } finally {
            setVerifying(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('kitchen_access_code');
        localStorage.removeItem('kitchen_name');
        setIsVerified(false);
        setKitchenCode('');
        setKitchenName('');
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    if (!isVerified) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                            <ChefHat className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Akses Orang Dapur</h1>
                        <p className="text-gray-500 mt-2">Silahkan masukkan kode dapur Anda untuk melanjutkan.</p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 pl-1">
                                Kode Dapur
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={kitchenCode}
                                    onChange={(e) => setKitchenCode(e.target.value)}
                                    placeholder="Masukkan kode..."
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                                             focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all
                                             font-mono uppercase text-lg tracking-widest"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={verifying}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200
                                     hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {verifying ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : 'Masuk ke Sistem'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-8">
                        Akses ini hanya untuk staf dapur internal.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-100">
                                <ChefHat className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 leading-none">List Barang</h1>
                                <p className="text-xs font-medium text-blue-600 mt-1 uppercase tracking-wider">{kitchenName}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                            title="Keluar"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-6">
                {/* Search & Stats */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shadow-gray-100 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={handleSearch}
                            placeholder="Cari nama barang..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl
                                     focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                {/* Main Table/List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                                <Loader2 className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-gray-500 font-medium animate-pulse">Memuat data barang...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="py-12">
                            <EmptyState
                                icon={Package}
                                title="Barang tidak ditemukan"
                                description={search ? `Tidak ada hasil untuk "${search}"` : "Belum ada data barang tersedia"}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-200">
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest w-20">No</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Nama Barang</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest w-40">Satuan</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest w-40">Harga Jual</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest w-60">Status Stok</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.map((item, index) => (
                                            <tr key={item._id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-400 font-mono">
                                                    {((pagination.page - 1) * pagination.limit) + index + 1}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{item.nama_barang}</p>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                                                        {item.satuan}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right font-bold text-blue-600">
                                                    {formatCurrency(item.harga_jual)}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {item.isActive ? (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100">
                                                                <CheckCircle className="w-4 h-4" />
                                                                <span className="text-xs font-bold uppercase tracking-wide">Tersedia</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full border border-red-100">
                                                                <XCircle className="w-4 h-4" />
                                                                <span className="text-xs font-bold uppercase tracking-wide">Kosong</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {data.map((item, index) => (
                                    <div key={item._id} className="p-4 flex items-center justify-between gap-4 active:bg-gray-50 transition-all">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-mono text-gray-400">#{(pagination.page - 1) * pagination.limit + index + 1}</span>
                                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase tracking-tighter">{item.satuan}</span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 truncate pr-2">{item.nama_barang}</h3>
                                            <p className="text-sm font-bold text-blue-600 mt-1">{formatCurrency(item.harga_jual)}</p>
                                        </div>
                                        <div className="shrink-0">
                                            {item.isActive ? (
                                                <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full shadow-sm shadow-green-50">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase">Ready</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full shadow-sm shadow-red-50">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase">Habis</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-sm font-medium text-gray-500">
                                        Menampilkan <span className="text-gray-900">{data.length}</span> dari <span className="text-gray-900">{pagination.totalDocuments}</span> barang
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
            </div>
        </div>
    );
}
