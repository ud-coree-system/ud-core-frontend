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
    ChefHat,
} from 'lucide-react';
import { transaksiAPI, periodeAPI, dapurAPI, udAPI, barangAPI } from '@/lib/api';
import DatePicker from '@/components/ui/DatePicker';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort, toDateInputValue, toLocalDate } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportLaporanExcel } from '@/utils/dapurexcelpdf/exportLaporan';

export default function LaporanDapurPage() {
    const { toast } = useToast();

    // Options
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);
    const [udList, setUdList] = useState([]);
    const [barangList, setBarangList] = useState([]);

    // Filters
    const [filterPeriode, setFilterPeriode] = useState('');
    const [filterDapur, setFilterDapur] = useState('');
    const [filterTanggal, setFilterTanggal] = useState(null);

    // Data
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        setFilterTanggal(null);
    }, [filterPeriode]);

    const fetchOptions = async () => {
        try {
            const [periodeRes, dapurRes, udRes, barangRes] = await Promise.all([
                periodeAPI.getAll({ limit: 50 }),
                dapurAPI.getAll({ limit: 100 }),
                udAPI.getAll({ limit: 100 }),
                barangAPI.getAll({ limit: 1000 }),
            ]);

            if (periodeRes.data.success) setPeriodeList(periodeRes.data.data);
            if (dapurRes.data.success) setDapurList(dapurRes.data.data);
            if (udRes.data.success) setUdList(udRes.data.data);
            if (barangRes.data.success) setBarangList(barangRes.data.data);
        } catch (error) {
            console.error('Failed to fetch options:', error);
        }
    };


    const fetchTransactions = async () => {
        if (!filterDapur) {
            toast.warning('Silakan pilih dapur terlebih dahulu');
            return;
        }

        try {
            setLoading(true);
            const params = {
                limit: 1000,
                status: 'completed',
                periode_id: filterPeriode || undefined,
                dapur_id: filterDapur || undefined,
            };
            const response = await transaksiAPI.getAll(params);
            if (response.data.success) {
                const selectedPeriode = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;

                // Fetch full details for each transaction
                const detailedTransactions = (await Promise.all(
                    response.data.data.map(async (trx) => {
                        const detailRes = await transaksiAPI.getById(trx._id);
                        return detailRes.data.success ? detailRes.data.data : trx;
                    })
                )).filter(trx => {
                    const isCompleted = trx.status === 'completed';
                    if (!selectedPeriode) return isCompleted;

                    const trxDate = toLocalDate(trx.tanggal);
                    const startDate = toLocalDate(selectedPeriode.tanggal_mulai);
                    const endDate = toLocalDate(selectedPeriode.tanggal_selesai);

                    const isInRange = trxDate >= startDate && trxDate <= endDate;
                    const matchesDate = filterTanggal ? trxDate === toLocalDate(filterTanggal) : true;

                    return isCompleted && isInRange && matchesDate;
                });
                setTransactions(detailedTransactions);
                toast.success(`Ditemukan ${detailedTransactions.length} transaksi`);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const getItemsByDate = () => {
        const barangMap = new Map(barangList.map(b => [b._id, b]));
        const grouped = {};

        transactions.forEach((trx) => {
            const dateKey = toLocalDate(trx.tanggal);
            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    tanggal: dateKey,
                    items: []
                };
            }

            trx.items?.forEach((item) => {
                const bId = item.barang_id?._id || item.barang_id;
                const barang = barangMap.get(bId);

                grouped[dateKey].items.push({
                    ...item,
                    barang_id: barang || item.barang_id,
                    nama_barang: item.nama_barang || barang?.nama_barang || item.barang_id?.nama_barang || '-',
                    satuan: item.satuan || barang?.satuan || item.barang_id?.satuan || '-',
                    transaksi: trx.kode_transaksi,
                });
            });
        });

        return Object.values(grouped).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    };

    const formatIndoDate = (date) => {
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date(date));
    };

    const generateExcel = async () => {
        if (transactions.length === 0) {
            toast.warning('Tidak ada data untuk dibuat laporan');
            return;
        }

        const itemsByDate = getItemsByDate();
        const period = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;
        const periodName = period ? period.nama_periode : 'Semua Periode';
        const periodRange = period ? `(${formatDateShort(period.tanggal_mulai)} - ${formatDateShort(period.tanggal_selesai)})` : '';
        const selectedDapur = dapurList.find(d => d._id === filterDapur);
        const dapurLabel = selectedDapur ? `DAPUR: ${selectedDapur.nama_dapur.toUpperCase()}` : '';
        const tanggalLabel = filterTanggal ? `TANGGAL: ${formatDateShort(filterTanggal)}` : '';
        const periodeLabel = `${periodName.toUpperCase()} ${periodRange} ${dapurLabel} ${tanggalLabel}`;

        setGenerating(true);
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            const datePart = filterTanggal ? `_${toLocalDate(filterTanggal)}` : '';
            const fileName = `Laporan_Dapur_${selectedDapur?.nama_dapur.replace(/\s+/g, '_')}_${periodName.replace(/\s+/g, '_')}${datePart}_${timestamp}.xlsx`;

            await exportLaporanExcel({
                transactions,
                itemsByDate,
                dapurName: selectedDapur?.nama_dapur,
                periodName: periodName,
                periodRange: periodRange,
                selectedDate: filterTanggal ? formatDateShort(filterTanggal) : null,
                udList,
                barangList,
                fileName
            });

            toast.success('Laporan Excel berhasil dibuat');
        } catch (error) {
            toast.error('Gagal membuat laporan Excel');
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const generateRekapPDF = () => {
        if (transactions.length === 0) return;
        setGenerating(true);
        try {
            const doc = new jsPDF();
            const selectedDapur = dapurList.find(d => d._id === filterDapur);
            const selectedPeriode = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;

            // Report Header
            doc.setFontSize(18);
            doc.text('LAPORAN PESANAN DAPUR', 105, 15, { align: 'center' });

            doc.setFontSize(11);
            doc.text(`Dapur: ${selectedDapur?.nama_dapur || 'Semua Dapur'}`, 14, 25);
            doc.text(`Periode: ${selectedPeriode?.nama_periode || 'Semua Periode'} (${selectedPeriode ? `${formatDateShort(selectedPeriode.tanggal_mulai)} - ${formatDateShort(selectedPeriode.tanggal_selesai)}` : '-'})`, 14, 30);
            if (filterTanggal) {
                doc.text(`Tanggal: ${formatDateShort(filterTanggal)}`, 14, 35);
            }

            const tableData = [];
            const itemsByDate = getItemsByDate();

            itemsByDate.forEach((group) => {
                // Date Header Row
                tableData.push([
                    { content: formatIndoDate(group.tanggal).toUpperCase(), colSpan: 6, styles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' } }
                ]);

                group.items.forEach((item, idx) => {
                    tableData.push([
                        idx + 1,
                        item.nama_barang,
                        item.qty,
                        item.satuan,
                        formatCurrency(item.harga_jual),
                        formatCurrency(item.subtotal_jual)
                    ]);
                });
                const dailyTotal = group.items.reduce((sum, i) => sum + i.subtotal_jual, 0);
                tableData.push([
                    { content: `TOTAL ${formatDateShort(group.tanggal).toUpperCase()}`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
                    { content: formatCurrency(dailyTotal), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
                ]);
            });

            autoTable(doc, {
                startY: filterTanggal ? 40 : 35,
                head: [['No', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual', 'Total Harga']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [71, 85, 105] },
                columnStyles: {
                    0: { cellWidth: 10 },
                    2: { cellWidth: 15 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 35, halign: 'right' },
                    5: { cellWidth: 35, halign: 'right' },
                }
            });

            const fileName = `laporan-dapur-${selectedDapur?.nama_dapur || 'all'}-${new Date().getTime()}.pdf`;
            doc.save(fileName);
            toast.success('PDF berhasil dibuat');
        } catch (error) {
            console.error('PDF Error:', error);
            toast.error('Gagal membuat PDF');
        } finally {
            setGenerating(false);
        }
    };

    const itemsByDate = getItemsByDate();
    const totalJual = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.subtotal_jual, 0) || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <ChefHat className="w-6 h-6 text-white" />
                        </div>
                        LAPORAN DAPUR
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-2 uppercase tracking-widest pl-12">Monitor Pesanan & Distribusi Barang</p>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 md:p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <ChefHat className="w-3 h-3" />
                            Target Dapur
                        </label>
                        <select
                            value={filterDapur}
                            onChange={(e) => setFilterDapur(e.target.value)}
                            className="w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        >
                            <option value="">Pilih Dapur</option>
                            {dapurList.map((d) => (
                                <option key={d._id} value={d._id}>{d.nama_dapur}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <Calendar className="w-3 h-3" />
                            Pilih Periode
                        </label>
                        <select
                            value={filterPeriode}
                            onChange={(e) => setFilterPeriode(e.target.value)}
                            className="w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        >
                            <option value="">Semua Periode</option>
                            {periodeList.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.nama_periode} ({formatDateShort(p.tanggal_mulai)} - {formatDateShort(p.tanggal_selesai)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <Calendar className="w-3 h-3" />
                            Pilih Tanggal & Waktu
                        </label>
                        <DatePicker
                            selected={filterTanggal}
                            onChange={(date) => setFilterTanggal(date)}
                            placeholder="Pilih Tanggal (Opsional)"
                            showTimeSelect
                            dateFormat="Pp"
                            className="w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                            minDate={filterPeriode ? new Date(periodeList.find(p => p._id === filterPeriode)?.tanggal_mulai) : null}
                            maxDate={filterPeriode ? new Date(periodeList.find(p => p._id === filterPeriode)?.tanggal_selesai) : null}
                        />
                    </div>

                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl h-[48px] px-8 font-black text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Filter className="w-5 h-5" />}
                        Cari Data
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <p className="font-bold text-gray-400 uppercase tracking-widest">Sedang Memuat Data...</p>
                </div>
            ) : transactions.length > 0 ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Summary Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Transaksi</p>
                            <p className="text-3xl font-black text-gray-900">{transactions.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Penjualan</p>
                            <p className="text-3xl font-black text-blue-600">{formatCurrency(totalJual)}</p>
                        </div>
                    </div>

                    {/* Report Content */}
                    {itemsByDate.map((group) => (
                        <div key={group.tanggal} className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-black text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    {formatIndoDate(group.tanggal)}
                                </h3>
                                <span className="bg-white px-3 py-1 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 tracking-widest">
                                    {group.items.length} ITEMS
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50/30 text-gray-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 text-left w-16">No</th>
                                            <th className="px-6 py-4 text-left">Nama Barang</th>
                                            <th className="px-6 py-4 text-center">Qty</th>
                                            <th className="px-6 py-4 text-center">Satuan</th>
                                            <th className="px-6 py-4 text-right">Harga Jual</th>
                                            <th className="px-6 py-4 text-right">Total Harga</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {group.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 text-gray-400 font-bold">{idx + 1}</td>
                                                <td className="px-6 py-4 font-black text-gray-900">{item.nama_barang}</td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-700">{item.qty}</td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-500 uppercase text-[10px] tracking-widest">{item.satuan}</td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-600">{formatCurrency(item.harga_jual)}</td>
                                                <td className="px-6 py-4 text-right font-black text-blue-600">{formatCurrency(item.subtotal_jual)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-blue-50/30 border-t border-blue-100">
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-right font-black text-gray-500 uppercase tracking-widest text-xs">Total {formatDateShort(group.tanggal)}</td>
                                            <td className="px-6 py-4 text-right font-black text-blue-700 text-lg">
                                                {formatCurrency(group.items.reduce((sum, i) => sum + i.subtotal_jual, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Export Actions */}
                    <div className="bg-gray-900 rounded-3xl p-6 md:p-10 shadow-2xl shadow-gray-900/20">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase">Simpan Laporan</h3>
                                <p className="text-gray-400 text-sm font-medium mt-1">Ekspor data ke format PDF atau Excel untuk dokumentasi</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={generateExcel}
                                    disabled={generating}
                                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                                >
                                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                                    Excel Report
                                </button>
                                <button
                                    onClick={generateRekapPDF}
                                    disabled={generating}
                                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl font-black transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                                >
                                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                                    PDF Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 py-24 text-center flex flex-col items-center">
                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                        <FileBarChart2 className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Tidak Ada Data</h3>
                    <p className="text-gray-400 font-medium text-sm mt-1 max-w-xs mx-auto text-center px-6">Pilih dapur dan filter periode yang diinginkan, kemudian klik tombol Cari Data.</p>
                </div>
            )}
        </div>
    );
}
