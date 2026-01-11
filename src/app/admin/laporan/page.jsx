'use client';

import { useState, useEffect } from 'react';
import {
    FileBarChart2,
    Download,
    FileText,
    FileSpreadsheet,
    Loader2,
    Filter,
    Calendar,
} from 'lucide-react';
import { transaksiAPI, periodeAPI, dapurAPI, udAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort, toDateInputValue } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function LaporanPage() {
    const { toast } = useToast();

    // Options
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);
    const [udList, setUdList] = useState([]);

    // Filters
    const [filterPeriode, setFilterPeriode] = useState('');
    const [filterDapur, setFilterDapur] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Data
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const [periodeRes, dapurRes, udRes] = await Promise.all([
                periodeAPI.getAll({ limit: 50 }),
                dapurAPI.getAll({ limit: 100 }),
                udAPI.getAll({ limit: 100 }),
            ]);

            if (periodeRes.data.success) setPeriodeList(periodeRes.data.data);
            if (dapurRes.data.success) setDapurList(dapurRes.data.data);
            if (udRes.data.success) setUdList(udRes.data.data);
        } catch (error) {
            console.error('Failed to fetch options:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const params = {
                limit: 1000,
                status: 'completed',
                periode_id: filterPeriode || undefined,
                dapur_id: filterDapur || undefined,
                tanggal_mulai: startDate || undefined,
                tanggal_selesai: endDate || undefined,
            };
            const response = await transaksiAPI.getAll(params);
            if (response.data.success) {
                // Fetch full details for each transaction
                const detailedTransactions = await Promise.all(
                    response.data.data.map(async (trx) => {
                        const detailRes = await transaksiAPI.getById(trx._id);
                        return detailRes.data.success ? detailRes.data.data : trx;
                    })
                );
                setTransactions(detailedTransactions);
                toast.success(`Ditemukan ${detailedTransactions.length} transaksi`);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    // Group items by UD for reporting
    const getItemsByUD = () => {
        const udMap = {};
        transactions.forEach((trx) => {
            trx.items?.forEach((item) => {
                const udId = item.ud_id?._id || 'unknown';
                const udName = item.ud_id?.nama_ud || 'Unknown UD';
                const udKode = item.ud_id?.kode_ud || '';

                if (!udMap[udId]) {
                    udMap[udId] = {
                        _id: udId,
                        nama_ud: udName,
                        kode_ud: udKode,
                        items: [],
                        totalJual: 0,
                        totalModal: 0,
                        totalKeuntungan: 0,
                    };
                }

                udMap[udId].items.push({
                    ...item,
                    transaksi: trx.kode_transaksi,
                    dapur: trx.dapur_id?.nama_dapur,
                    tanggal: trx.tanggal,
                });
                udMap[udId].totalJual += item.subtotal_jual;
                udMap[udId].totalModal += item.subtotal_modal;
                udMap[udId].totalKeuntungan += item.keuntungan;
            });
        });
        return Object.values(udMap);
    };

    // Generate PDF Nota for single UD
    const generateNotaPDF = (udData) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTA PEMBELIAN', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(udData.nama_ud, 105, 30, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(udData.kode_ud, 105, 36, { align: 'center' });

        // Date
        doc.text(`Tanggal: ${formatDateShort(new Date())}`, 14, 50);

        // Table
        const tableData = udData.items.map((item, idx) => [
            idx + 1,
            item.barang_id?.nama_barang || '-',
            item.barang_id?.satuan || '-',
            item.qty,
            formatCurrency(item.harga_jual),
            formatCurrency(item.subtotal_jual),
        ]);

        doc.autoTable({
            startY: 55,
            head: [['No', 'Nama Barang', 'Satuan', 'Qty', 'Harga', 'Subtotal']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [59, 130, 246] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'right', cellWidth: 30 },
                5: { halign: 'right', cellWidth: 35 },
            },
        });

        // Total
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', 130, finalY);
        doc.text(formatCurrency(udData.totalJual), 195, finalY, { align: 'right' });

        // Save
        doc.save(`NOTA_${udData.kode_ud}_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`);
    };

    // Generate all Nota PDFs
    const generateAllNotas = () => {
        const itemsByUD = getItemsByUD();
        if (itemsByUD.length === 0) {
            toast.warning('Tidak ada data untuk dibuat nota');
            return;
        }

        setGenerating(true);
        try {
            itemsByUD.forEach((ud) => {
                generateNotaPDF(ud);
            });
            toast.success(`${itemsByUD.length} nota berhasil dibuat`);
        } catch (error) {
            toast.error('Gagal membuat nota');
        } finally {
            setGenerating(false);
        }
    };

    // Generate Excel Report
    const generateExcel = () => {
        const itemsByUD = getItemsByUD();
        if (transactions.length === 0) {
            toast.warning('Tidak ada data untuk dibuat laporan');
            return;
        }

        setGenerating(true);
        try {
            const wb = XLSX.utils.book_new();

            // Sheet 1: Data Pesanan (All transactions)
            const allOrdersData = transactions.flatMap((trx) =>
                trx.items?.map((item) => ({
                    'Kode Transaksi': trx.kode_transaksi,
                    'Tanggal': formatDateShort(trx.tanggal),
                    'Dapur': trx.dapur_id?.nama_dapur || '-',
                    'UD': item.ud_id?.nama_ud || '-',
                    'Nama Barang': item.barang_id?.nama_barang || '-',
                    'Satuan': item.barang_id?.satuan || '-',
                    'Qty': item.qty,
                    'Harga Jual': item.harga_jual,
                    'Subtotal': item.subtotal_jual,
                    'Harga Modal': item.harga_modal,
                    'Total Modal': item.subtotal_modal,
                    'Keuntungan': item.keuntungan,
                })) || []
            );

            const ws1 = XLSX.utils.json_to_sheet(allOrdersData);
            XLSX.utils.book_append_sheet(wb, ws1, 'Data Pesanan');

            // Sheet per UD
            itemsByUD.forEach((ud) => {
                const udData = ud.items.map((item, idx) => ({
                    'No': idx + 1,
                    'Kode Transaksi': item.transaksi,
                    'Tanggal': formatDateShort(item.tanggal),
                    'Dapur': item.dapur || '-',
                    'Nama Barang': item.barang_id?.nama_barang || '-',
                    'Satuan': item.barang_id?.satuan || '-',
                    'Qty': item.qty,
                    'Harga Jual': item.harga_jual,
                    'Subtotal': item.subtotal_jual,
                }));

                // Add total row
                udData.push({
                    'No': '',
                    'Kode Transaksi': '',
                    'Tanggal': '',
                    'Dapur': '',
                    'Nama Barang': '',
                    'Satuan': '',
                    'Qty': '',
                    'Harga Jual': 'TOTAL',
                    'Subtotal': ud.totalJual,
                });

                const wsUD = XLSX.utils.json_to_sheet(udData);
                // Truncate sheet name to 31 chars (Excel limit)
                const sheetName = ud.nama_ud.substring(0, 31);
                XLSX.utils.book_append_sheet(wb, wsUD, sheetName);
            });

            // Save
            const fileName = `Laporan_Penjualan_${formatDateShort(new Date()).replace(/\//g, '-')}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success('Laporan Excel berhasil dibuat');
        } catch (error) {
            toast.error('Gagal membuat laporan Excel');
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const itemsByUD = getItemsByUD();
    const totalJual = itemsByUD.reduce((sum, ud) => sum + ud.totalJual, 0);
    const totalKeuntungan = itemsByUD.reduce((sum, ud) => sum + ud.totalKeuntungan, 0);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
                <p className="text-gray-500 mt-1">Generate nota PDF dan laporan Excel</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Filter Data</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Periode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                        <select
                            value={filterPeriode}
                            onChange={(e) => setFilterPeriode(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua Periode</option>
                            {periodeList.map((p) => (
                                <option key={p._id} value={p._id}>{p.nama_periode}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dapur */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dapur</label>
                        <select
                            value={filterDapur}
                            onChange={(e) => setFilterDapur(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua Dapur</option>
                            {dapurList.map((d) => (
                                <option key={d._id} value={d._id}>{d.nama_dapur}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Filter className="w-5 h-5" />
                        )}
                        Cari Data
                    </button>
                </div>
            </div>

            {/* Summary */}
            {transactions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-1">Total Transaksi</p>
                        <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-1">Total Penjualan</p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalJual)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-1">Total Keuntungan</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(totalKeuntungan)}</p>
                    </div>
                </div>
            )}

            {/* Data per UD */}
            {itemsByUD.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Data per UD</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-4 py-3">UD</th>
                                    <th className="text-right px-4 py-3">Jumlah Item</th>
                                    <th className="text-right px-4 py-3">Total Penjualan</th>
                                    <th className="text-right px-4 py-3">Total Keuntungan</th>
                                    <th className="text-center px-4 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsByUD.map((ud) => (
                                    <tr key={ud._id} className="border-t border-gray-100">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{ud.nama_ud}</p>
                                            <p className="text-sm text-gray-500">{ud.kode_ud}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">{ud.items.length}</td>
                                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(ud.totalJual)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(ud.totalKeuntungan)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => generateNotaPDF(ud)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                            >
                                                <FileText className="w-4 h-4" />
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Generate Actions */}
            {transactions.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Generate Laporan</h3>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={generateAllNotas}
                            disabled={generating}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg
                       hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {generating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <FileText className="w-5 h-5" />
                            )}
                            Generate Semua Nota PDF
                        </button>
                        <button
                            onClick={generateExcel}
                            disabled={generating}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg
                       hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {generating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-5 h-5" />
                            )}
                            Generate Laporan Excel
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && transactions.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileBarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Data</h3>
                    <p className="text-gray-500">Pilih filter dan klik "Cari Data" untuk memuat transaksi</p>
                </div>
            )}
        </div>
    );
}
