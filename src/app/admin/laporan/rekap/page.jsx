'use client';

import { useState, useEffect, Fragment } from 'react';
import {
    ClipboardList,
    Search,
    Loader2,
    Filter,
    Calendar,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { periodeAPI, transaksiAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function LaporanRekapPage() {
    const { toast } = useToast();

    // Options
    const [periodeList, setPeriodeList] = useState([]);

    // Filters
    const [filterPeriode, setFilterPeriode] = useState('');

    // Data
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [groupedData, setGroupedData] = useState({});

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const response = await periodeAPI.getAll({ limit: 50 });
            if (response.data.success) {
                setPeriodeList(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch periods:', error);
        }
    };

    const fetchTransactions = async () => {
        if (!filterPeriode) {
            toast.warning('Pilih periode terlebih dahulu');
            return;
        }

        const selectedPeriode = periodeList.find(p => p._id === filterPeriode);
        if (!selectedPeriode) return;

        try {
            setLoading(true);
            const params = {
                limit: 2000,
                status: 'completed',
                tanggal_mulai: selectedPeriode.tanggal_mulai,
                tanggal_selesai: selectedPeriode.tanggal_selesai,
            };
            const response = await transaksiAPI.getAll(params);
            if (response.data.success) {
                // Fetch full details for each transaction to get items and UD info
                const detailedTransactions = await Promise.all(
                    response.data.data.map(async (trx) => {
                        const detailRes = await transaksiAPI.getById(trx._id);
                        return detailRes.data.success ? detailRes.data.data : trx;
                    })
                );

                processGroupedData(detailedTransactions);
                setTransactions(detailedTransactions);
                toast.success(`Ditemukan ${detailedTransactions.length} transaksi`);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const processGroupedData = (data) => {
        const grouped = {};

        data.forEach((trx) => {
            const dateStr = formatDateShort(trx.tanggal);
            if (!grouped[dateStr]) {
                grouped[dateStr] = {
                    date: trx.tanggal,
                    uds: {},
                    subtotalJual: 0,
                    subtotalModal: 0,
                    subtotalKeuntungan: 0,
                };
            }

            trx.items?.forEach((item) => {
                const udName = item.ud_id?.nama_ud || 'Tanpa UD';
                const udId = item.ud_id?._id || 'none';

                if (!grouped[dateStr].uds[udId]) {
                    grouped[dateStr].uds[udId] = {
                        name: udName,
                        items: [],
                        totalJual: 0,
                        totalModal: 0,
                        totalKeuntungan: 0,
                    };
                }

                grouped[dateStr].uds[udId].items.push(item);
                grouped[dateStr].uds[udId].totalJual += item.subtotal_jual;
                grouped[dateStr].uds[udId].totalModal += item.subtotal_modal;
                grouped[dateStr].uds[udId].totalKeuntungan += item.keuntungan;

                grouped[dateStr].subtotalJual += item.subtotal_jual;
                grouped[dateStr].subtotalModal += item.subtotal_modal;
                grouped[dateStr].subtotalKeuntungan += item.keuntungan;
            });
        });

        // Sort dates descending
        const sortedGrouped = Object.fromEntries(
            Object.entries(grouped).sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
        );

        setGroupedData(sortedGrouped);
    };

    const grandTotalJual = Object.values(groupedData).reduce((sum, day) => sum + day.subtotalJual, 0);
    const grandTotalModal = Object.values(groupedData).reduce((sum, day) => sum + day.subtotalModal, 0);
    const grandTotalKeuntungan = Object.values(groupedData).reduce((sum, day) => sum + day.subtotalKeuntungan, 0);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Laporan Rekap Penjualan</h1>
                <p className="text-gray-500 mt-1">Data penjualan terperinci berdasarkan periode</p>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Pilih Periode
                        </label>
                        <select
                            value={filterPeriode}
                            onChange={(e) => setFilterPeriode(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Semua Periode</option>
                            {periodeList.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.nama_periode} ({formatDateShort(p.tanggal_mulai)} - {formatDateShort(p.tanggal_selesai)})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5" />
                        )}
                        Tampilkan Laporan
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {Object.keys(groupedData).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-500">Total Penjualan</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(grandTotalJual)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-500">Total Modal</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(grandTotalModal)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm group">
                        <p className="text-sm font-medium text-gray-500">Total Keuntungan</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(grandTotalKeuntungan)}</p>
                    </div>
                </div>
            )}

            {/* Report Table */}
            <div className="space-y-8">
                {Object.keys(groupedData).map((dateStr) => {
                    const dayData = groupedData[dateStr];
                    return (
                        <div key={dateStr} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-900">{dateStr}</h2>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-gray-600">Jual: <span className="font-bold text-gray-900">{formatCurrency(dayData.subtotalJual)}</span></span>
                                    <span className="text-gray-600">Modal: <span className="font-bold text-gray-900">{formatCurrency(dayData.subtotalModal)}</span></span>
                                    <span className="text-gray-600">Keuntungan: <span className="font-bold text-green-600">{formatCurrency(dayData.subtotalKeuntungan)}</span></span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/30 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-3 text-left border-b border-gray-200 w-12">No</th>
                                            <th className="px-6 py-3 text-left border-b border-gray-200">Nama Barang</th>
                                            <th className="px-6 py-3 text-center border-b border-gray-200">Qty</th>
                                            <th className="px-6 py-3 text-center border-b border-gray-200">Satuan</th>
                                            <th className="px-6 py-3 text-right border-b border-gray-200">Harga Jual</th>
                                            <th className="px-6 py-3 text-right border-b border-gray-200">Total Jual</th>
                                            <th className="px-6 py-3 text-right border-b border-gray-200">Harga Modal</th>
                                            <th className="px-6 py-3 text-right border-b border-gray-200">Total Modal</th>
                                            <th className="px-6 py-3 text-right border-b border-gray-200">Keuntungan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Object.values(dayData.uds).map((ud, udIdx) => (
                                            <Fragment key={`ud-group-${dateStr}-${udIdx}`}>
                                                {/* UD Sub-header */}
                                                <tr key={`ud-${udIdx}`} className="bg-blue-50/30">
                                                    <td colSpan={9} className="px-6 py-2 text-sm font-bold text-blue-700 italic border-b border-blue-100">
                                                        {ud.name}
                                                    </td>
                                                </tr>
                                                {/* Items */}
                                                {ud.items.map((item, itemIdx) => (
                                                    <tr key={`${dateStr}-${udIdx}-${itemIdx}`} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-3 text-sm text-gray-500">{itemIdx + 1}</td>
                                                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.barang_id?.nama_barang || '-'}</td>
                                                        <td className="px-6 py-3 text-sm text-center font-semibold text-blue-600">{item.qty}</td>
                                                        <td className="px-6 py-3 text-sm text-center text-gray-500">{item.barang_id?.satuan || '-'}</td>
                                                        <td className="px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(item.harga_jual)}</td>
                                                        <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(item.subtotal_jual)}</td>
                                                        <td className="px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(item.harga_modal)}</td>
                                                        <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(item.subtotal_modal)}</td>
                                                        <td className="px-6 py-3 text-sm text-right font-bold text-green-600">{formatCurrency(item.keuntungan)}</td>
                                                    </tr>
                                                ))}
                                                {/* UD Totals */}
                                                <tr className="bg-gray-50/20">
                                                    <td colSpan={5} className="px-6 py-3 text-xs font-bold text-gray-400 text-right uppercase tracking-wider">Subtotal {ud.name}</td>
                                                    <td className="px-6 py-3 text-sm text-right font-bold text-gray-900 border-t border-gray-200">{formatCurrency(ud.totalJual)}</td>
                                                    <td className="px-6 py-3 border-t border-gray-200"></td>
                                                    <td className="px-6 py-3 text-sm text-right font-bold text-gray-900 border-t border-gray-200">{formatCurrency(ud.totalModal)}</td>
                                                    <td className="px-6 py-3 text-sm text-right font-bold text-green-700 border-t border-gray-200">{formatCurrency(ud.totalKeuntungan)}</td>
                                                </tr>
                                            </Fragment>
                                        ))}
                                        {/* Day Totals */}
                                        <tr className="bg-gray-100/50">
                                            <td colSpan={5} className="px-6 py-4 text-sm font-extrabold text-gray-900 text-right uppercase">Total {dateStr}</td>
                                            <td className="px-6 py-4 text-sm text-right font-extrabold text-gray-900">{formatCurrency(dayData.subtotalJual)}</td>
                                            <td className="px-6 py-4"></td>
                                            <td className="px-6 py-4 text-sm text-right font-extrabold text-gray-900">{formatCurrency(dayData.subtotalModal)}</td>
                                            <td className="px-6 py-4 text-sm text-right font-extrabold text-green-700">{formatCurrency(dayData.subtotalKeuntungan)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}

                {/* Grand Total Row at the very bottom if there's data */}
                {Object.keys(groupedData).length > 0 && (
                    <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-center md:text-left">
                            <h3 className="text-xl font-bold">TOTAL KESELURUHAN</h3>
                            <p className="text-blue-100 text-sm opacity-80 mt-1">Rekapitulasi seluruh periode yang dipilih</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
                            <div>
                                <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-1">Total Jual</p>
                                <p className="text-2xl font-black">{formatCurrency(grandTotalJual)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-1">Total Modal</p>
                                <p className="text-2xl font-black">{formatCurrency(grandTotalModal)}</p>
                            </div>
                            <div className="bg-white/10 px-6 py-3 rounded-xl backdrop-blur-md border border-white/20">
                                <p className="text-xs font-medium text-green-300 uppercase tracking-widest mb-1">Total Untung</p>
                                <p className="text-2xl font-black text-green-400">{formatCurrency(grandTotalKeuntungan)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {!loading && Object.keys(groupedData).length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <ClipboardList className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Data</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">Pilih range tanggal dan klik tombol tampilkan untuk memuat laporan rekap penjualan.</p>
                </div>
            )}
        </div>
    );
}

