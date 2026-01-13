'use client';

import { useState, useEffect, Fragment } from 'react';
import {
    ClipboardList,
    Search,
    Loader2,
    Filter,
    Calendar,
    Printer,
    Building2,
    Briefcase,
    MapPin,
    CreditCard,
    FileText,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { periodeAPI, transaksiAPI, udAPI, barangAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function LaporanRekapPage() {
    const { toast } = useToast();

    // Options
    const [periodeList, setPeriodeList] = useState([]);
    const [udList, setUdList] = useState([]);
    const [barangList, setBarangList] = useState([]);

    // Filters
    const [filterPeriode, setFilterPeriode] = useState('');
    const [filterUD, setFilterUD] = useState('');

    // Data
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [groupedData, setGroupedData] = useState({});
    const [selectedUDData, setSelectedUDData] = useState(null);

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const [periodeRes, udRes, barangRes] = await Promise.all([
                periodeAPI.getAll({ limit: 50 }),
                udAPI.getAll({ limit: 100, isActive: true }),
                barangAPI.getAll({ limit: 1000 })
            ]);

            if (periodeRes.data.success) {
                setPeriodeList(periodeRes.data.data);
            }
            if (udRes.data.success) {
                setUdList(udRes.data.data);
            }
            if (barangRes.data.success) {
                setBarangList(barangRes.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch options:', error);
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

                // Update selected UD data if UD filter is active
                if (filterUD) {
                    const udInfo = udList.find(u => u._id === filterUD);
                    setSelectedUDData(udInfo);
                } else {
                    setSelectedUDData(null);
                }

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

            // Filter by UD if filter is active
            const filteredItems = filterUD
                ? trx.items?.filter(item => {
                    const itemUdId = item.ud_id?._id || item.ud_id;
                    return itemUdId === filterUD;
                })
                : trx.items;

            if (!filteredItems || filteredItems.length === 0) return;

            if (!grouped[dateStr]) {
                grouped[dateStr] = {
                    date: trx.tanggal,
                    uds: {},
                    subtotalJual: 0,
                    subtotalModal: 0,
                    subtotalKeuntungan: 0,
                    subtotalBudget: 0, // For specialized view
                };
            }

            const barangMap = new Map(barangList.map(b => [b._id, b]));
            const udLookupMap = new Map(udList.map(u => [u._id, u]));

            console.log('🔍 Enrichment Debug:', {
                barangListCount: barangList.length,
                udListCount: udList.length,
                filteredItemsCount: filteredItems.length,
                sampleItem: filteredItems[0]
            });

            filteredItems.forEach((item) => {
                const bId = item.barang_id?._id || item.barang_id;
                const uId = item.ud_id?._id || item.ud_id;

                const barang = barangMap.get(bId);
                const ud = udLookupMap.get(uId);

                const udName = ud?.nama_ud || item.ud_id?.nama_ud || 'Tanpa UD';

                if (!grouped[dateStr].uds[uId || 'none']) {
                    grouped[dateStr].uds[uId || 'none'] = {
                        name: udName,
                        items: [],
                        totalJual: 0,
                        totalModal: 0,
                        totalKeuntungan: 0,
                        totalBudget: 0,
                    };
                }

                // Snapshotted prices from transaction item
                const actualJual = item.harga_jual ?? (barang?.harga_jual || item.barang_id?.harga_jual);
                const actualModal = item.harga_modal ?? (barang?.harga_modal || item.barang_id?.harga_modal);

                // Catalog price from Master Data (for Budget Dapur reference)
                const masterPrice = barang?.harga_jual || item.barang_id?.harga_jual || actualJual;
                const itemBudgetTotal = item.qty * masterPrice;

                grouped[dateStr].uds[uId || 'none'].items.push({
                    ...item,
                    barang_id: barang || item.barang_id,
                    ud_id: ud || item.ud_id,
                    nama_barang: item.nama_barang || barang?.nama_barang || item.barang_id?.nama_barang,
                    satuan: item.satuan || barang?.satuan || item.barang_id?.satuan,
                    harga_jual: actualJual,
                    harga_modal: actualModal,
                    masterPrice: masterPrice,
                    itemBudgetTotal: itemBudgetTotal
                });

                grouped[dateStr].uds[uId || 'none'].totalJual += item.subtotal_jual;
                grouped[dateStr].uds[uId || 'none'].totalModal += item.subtotal_modal;
                grouped[dateStr].uds[uId || 'none'].totalKeuntungan += item.keuntungan;
                grouped[dateStr].uds[uId || 'none'].totalBudget += itemBudgetTotal;

                grouped[dateStr].subtotalJual += item.subtotal_jual;
                grouped[dateStr].subtotalModal += item.subtotal_modal;
                grouped[dateStr].subtotalKeuntungan += item.keuntungan;
                grouped[dateStr].subtotalBudget += itemBudgetTotal;
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
    const grandTotalBudget = Object.values(groupedData).reduce((sum, day) => sum + day.subtotalBudget, 0);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        if (Object.keys(groupedData).length === 0) {
            toast.warning('Tidak ada data untuk dibuat laporan');
            return;
        }

        setGenerating(true);
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            // Period Info
            const period = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;
            const periodName = period ? period.nama_periode : 'Semua Periode';
            const periodRange = period ? `(${formatDateShort(period.tanggal_mulai)} - ${formatDateShort(period.tanggal_selesai)})` : '';
            const periodeLabel = `${periodName.toUpperCase()} ${periodRange}`;
            const printTimestamp = `Dicetak pada: ${new Date().toLocaleString('id-ID')}`;

            // Check if it's UD specific view
            const isUDSpecific = filterUD && selectedUDData;

            if (isUDSpecific) {
                // UD Specific Report Header
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text(`LAPORAN REKAP PENJUALAN UD`, pageWidth / 2, 15, { align: 'center' });
                doc.setFontSize(14);
                doc.text(selectedUDData.nama_ud, pageWidth / 2, 22, { align: 'center' });

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(`Pemilik: ${selectedUDData.nama_pemilik || '-'}`, 14, 30);
                doc.text(`Rekening: ${selectedUDData.bank || ''} - ${selectedUDData.no_rekening || '-'}`, 14, 35);
                doc.text(`KBLI: ${(selectedUDData.kbli || []).join(', ')}`, 14, 40);
                doc.text(`Periode: ${periodeLabel}`, 14, 45);
                doc.text(printTimestamp, pageWidth - 14, 30, { align: 'right' });

                const tableRows = [];
                Object.keys(groupedData).forEach((dateStr) => {
                    const dayData = groupedData[dateStr];
                    const udData = dayData.uds[filterUD];
                    if (!udData) return;

                    // Date Row
                    tableRows.push([
                        { content: dateStr, colSpan: 10, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }
                    ]);

                    udData.items.forEach((item) => {
                        tableRows.push([
                            item.nama_barang || item.barang_id?.nama_barang || '-',
                            item.qty,
                            item.satuan || item.barang_id?.satuan || '-',
                            formatCurrency(item.masterPrice),
                            formatCurrency(item.itemBudgetTotal),
                            formatCurrency(item.harga_jual),
                            formatCurrency(item.subtotal_jual),
                            formatCurrency(item.harga_modal),
                            formatCurrency(item.subtotal_modal),
                            formatCurrency(item.keuntungan)
                        ]);
                    });

                    // Subtotal Row
                    tableRows.push([
                        { content: `Subtotal ${dateStr}`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                        '',
                        { content: formatCurrency(udData.totalBudget), styles: { fontStyle: 'bold' } },
                        '',
                        { content: formatCurrency(udData.totalJual), styles: { fontStyle: 'bold' } },
                        '',
                        { content: formatCurrency(udData.totalModal), styles: { fontStyle: 'bold' } },
                        { content: formatCurrency(udData.totalKeuntungan), styles: { fontStyle: 'bold' } }
                    ]);
                });

                // Grand Total Row
                tableRows.push([
                    { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'right', fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } },
                    { content: '', styles: { fillColor: [30, 41, 59] } },
                    { content: formatCurrency(grandTotalBudget), styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } },
                    { content: '', styles: { fillColor: [30, 41, 59] } },
                    { content: formatCurrency(grandTotalJual), styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } },
                    { content: '', styles: { fillColor: [30, 41, 59] } },
                    { content: formatCurrency(grandTotalModal), styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } },
                    { content: formatCurrency(grandTotalKeuntungan), styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } }
                ]);

                autoTable(doc, {
                    startY: 55,
                    head: [[
                        { content: 'Nama Barang', rowSpan: 2 },
                        { content: 'Qty', rowSpan: 2 },
                        { content: 'Satuan', rowSpan: 2 },
                        { content: 'Budget Dapur', colSpan: 2, styles: { halign: 'center' } },
                        { content: 'Jual Suplier', colSpan: 2, styles: { halign: 'center' } },
                        { content: 'Modal Suplier', colSpan: 2, styles: { halign: 'center' } },
                        { content: 'Untung', rowSpan: 2 }
                    ], [
                        'Harga', 'Total', 'Harga', 'Total', 'Harga', 'Total'
                    ]],
                    body: tableRows,
                    theme: 'grid',
                    styles: { fontSize: 7 },
                    headStyles: { fillColor: [59, 130, 246] },
                    columnStyles: {
                        3: { halign: 'right' },
                        4: { halign: 'right' },
                        5: { halign: 'right' },
                        6: { halign: 'right' },
                        7: { halign: 'right' },
                        8: { halign: 'right' },
                        9: { halign: 'right' },
                    }
                });
            } else {
                // Global Rekap Header
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text(`LAPORAN REKAP PENJUALAN`, pageWidth / 2, 15, { align: 'center' });
                doc.setFontSize(12);
                doc.text(periodeLabel, pageWidth / 2, 22, { align: 'center' });

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(printTimestamp, pageWidth - 14, 10, { align: 'right' });

                // Summary Table
                autoTable(doc, {
                    startY: 30,
                    head: [['Ringkasan Periode', 'Total Penjualan', 'Total Modal', 'Total Keuntungan']],
                    body: [[
                        '',
                        formatCurrency(grandTotalJual),
                        formatCurrency(grandTotalModal),
                        formatCurrency(grandTotalKeuntungan)
                    ]],
                    theme: 'grid',
                    styles: { fontSize: 10, fontStyle: 'bold' },
                    headStyles: { fillColor: [71, 85, 105] },
                });

                const tableRows = [];
                Object.keys(groupedData).forEach((dateStr) => {
                    const dayData = groupedData[dateStr];

                    // Date Header
                    tableRows.push([
                        { content: dateStr.toUpperCase(), colSpan: 9, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }
                    ]);

                    Object.values(dayData.uds).forEach((ud) => {
                        // UD Sub-header
                        tableRows.push([
                            { content: ud.name, colSpan: 9, styles: { fillColor: [248, 250, 252], fontStyle: 'italic', textColor: [59, 130, 246] } }
                        ]);

                        ud.items.forEach((item, idx) => {
                            tableRows.push([
                                idx + 1,
                                item.nama_barang || item.barang_id?.nama_barang || '-',
                                item.qty,
                                item.satuan || item.barang_id?.satuan || '-',
                                formatCurrency(item.harga_jual),
                                formatCurrency(item.subtotal_jual),
                                formatCurrency(item.harga_modal),
                                formatCurrency(item.subtotal_modal),
                                formatCurrency(item.keuntungan)
                            ]);
                        });

                        // UD Subtotal
                        tableRows.push([
                            { content: `Subtotal ${ud.name}`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
                            { content: formatCurrency(ud.totalJual), styles: { fontStyle: 'bold' } },
                            '',
                            { content: formatCurrency(ud.totalModal), styles: { fontStyle: 'bold' } },
                            { content: formatCurrency(ud.totalKeuntungan), styles: { fontStyle: 'bold' } }
                        ]);
                    });

                    // Day Total
                    tableRows.push([
                        { content: `TOTAL ${dateStr}`, colSpan: 5, styles: { halign: 'right', fillColor: [226, 232, 240], fontStyle: 'bold' } },
                        { content: formatCurrency(dayData.subtotalJual), styles: { fillColor: [226, 232, 240], fontStyle: 'bold' } },
                        '',
                        { content: formatCurrency(dayData.subtotalModal), styles: { fillColor: [226, 232, 240], fontStyle: 'bold' } },
                        { content: formatCurrency(dayData.subtotalKeuntungan), styles: { fillColor: [226, 232, 240], fontStyle: 'bold' } }
                    ]);
                });

                autoTable(doc, {
                    startY: doc.lastAutoTable.finalY + 10,
                    head: [['No', 'Nama Barang', 'Qty', 'Sat', 'Harga Jual', 'Total Jual', 'Hrg Modal', 'Tot Modal', 'Untung']],
                    body: tableRows,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [59, 130, 246] },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center' },
                        2: { cellWidth: 12, halign: 'center' },
                        3: { cellWidth: 15, halign: 'center' },
                        4: { halign: 'right' },
                        5: { halign: 'right' },
                        6: { halign: 'right' },
                        7: { halign: 'right' },
                        8: { halign: 'right' },
                    },
                    margin: { top: 20 },
                });

                // Grand Total Final
                const finalY = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('GRAND TOTAL KESELURUHAN', 14, finalY);

                autoTable(doc, {
                    startY: finalY + 5,
                    body: [
                        ['Total Penjualan', formatCurrency(grandTotalJual)],
                        ['Total Modal', formatCurrency(grandTotalModal)],
                        ['Total Keuntungan', formatCurrency(grandTotalKeuntungan)]
                    ],
                    theme: 'plain',
                    styles: { fontSize: 12, fontStyle: 'bold' },
                    columnStyles: {
                        1: { halign: 'right' }
                    }
                });
            }

            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = isUDSpecific
                ? `Rekap_${selectedUDData.nama_ud.replace(/\s+/g, '_')}_${periodName.replace(/\s+/g, '_')}_${timestamp}.pdf`
                : `Laporan_Rekap_${periodName.replace(/\s+/g, '_')}_${timestamp}.pdf`;

            doc.save(fileName);
            toast.success('Laporan PDF berhasil dibuat');
        } catch (error) {
            console.error('PDF Generation Error:', error);
            toast.error('Gagal membuat laporan PDF');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Laporan Rekap Penjualan</h1>
                <p className="text-gray-500 mt-1">Data penjualan terperinci berdasarkan periode</p>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-sm print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4">
                    <div className="w-full">
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
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            Filter UD (Opsional)
                        </label>
                        <select
                            value={filterUD}
                            onChange={(e) => setFilterUD(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Semua UD</option>
                            {udList.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.nama_ud}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchTransactions}
                            disabled={loading}
                            className="flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Search className="w-5 h-5" />
                            )}
                            Cari Data
                        </button>
                        {Object.keys(groupedData).length > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generating}
                                    className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 disabled:opacity-50"
                                    title="Generate PDF"
                                >
                                    {generating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <FileText className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {filterUD && selectedUDData ? (
                /* Specialized UD Report View (Matches Reference Image) */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 print:space-y-0 print:m-0">
                    {/* UD Header Details */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm print:shadow-none print:border-none print:p-0">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 print:flex-row">
                            <div className="space-y-4 flex-1">
                                <div>
                                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest print:text-black">UD Details</h2>
                                    <h3 className="text-3xl font-black text-gray-900 mt-1 print:text-2xl">{selectedUDData.nama_ud}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg print:hidden">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase print:text-black">Pemilik (An.)</p>
                                            <p className="text-sm font-bold text-gray-800 print:text-black">{selectedUDData.nama_pemilik || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-50 rounded-lg print:hidden">
                                            <CreditCard className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase print:text-black">No Rekening</p>
                                            <p className="text-sm font-bold text-gray-800 font-mono print:text-black">{selectedUDData.bank} : {selectedUDData.no_rekening || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 sm:col-span-2">
                                        <div className="p-2 bg-purple-50 rounded-lg print:hidden">
                                            <MapPin className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase print:text-black">Alamat</p>
                                            <p className="text-sm font-medium text-gray-700 print:text-black">{selectedUDData.alamat || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="md:w-64 space-y-4 print:text-right">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase print:text-black">KBLI Meliputi</p>
                                    <div className="flex flex-wrap gap-1 mt-2 print:justify-end">
                                        {selectedUDData.kbli?.map((k, idx) => (
                                            <span key={idx} className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-bold uppercase print:bg-transparent print:border print:border-black print:text-black">{k}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100 print:border-black">
                                    <p className="text-xs font-semibold text-gray-400 uppercase print:text-black">Periode Laporan</p>
                                    <p className="text-sm font-bold text-gray-800 print:text-black">
                                        {periodeList.find(p => p._id === filterPeriode)?.nama_periode}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Specialized Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm print:shadow-none print:border-black">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 print:bg-gray-200">
                                    <tr>
                                        <th rowSpan={2} className="px-4 py-4 border-b border-gray-200 font-bold text-gray-900 border-r print:border-black">Nama Barang</th>
                                        <th rowSpan={2} className="px-3 py-4 border-b border-gray-200 font-bold text-gray-900 border-r print:border-black">Qty</th>
                                        <th rowSpan={2} className="px-3 py-4 border-b border-gray-200 font-bold text-gray-900 border-r print:border-black">Satuan</th>
                                        <th colSpan={2} className="px-4 py-2 border-b border-gray-200 font-bold text-center text-blue-700 border-r print:border-black print:text-black">Budget Dapur</th>
                                        <th colSpan={2} className="px-4 py-2 border-b border-gray-200 font-bold text-center text-orange-700 border-r print:border-black print:text-black">Jual Suplier</th>
                                        <th colSpan={2} className="px-4 py-2 border-b border-gray-200 font-bold text-center text-purple-700 border-r print:border-black print:text-black">Modal Suplier</th>
                                        <th rowSpan={2} className="px-4 py-4 border-b border-gray-200 font-bold text-right text-green-700 print:border-black print:text-black">Keuntungan</th>
                                    </tr>
                                    <tr className="bg-gray-50/50 print:bg-gray-100">
                                        <th className="px-4 py-2 border-b border-gray-200 font-bold text-right text-xs print:border-black">Harga</th>
                                        <th className="px-4 py-2 border-b border-gray-200 font-bold text-right text-xs border-r print:border-black">Total</th>
                                        <th className="px-4 py-2 border-b border-gray-200 font-bold text-right text-xs print:border-black">Harga</th>
                                        <th className="px-4 py-2 border-b border-gray-200 font-bold text-right text-xs border-r print:border-black">Total</th>
                                        <th className="px-4 py-2 border-b border-gray-200 font-bold text-right text-xs print:border-black">Harga</th>
                                        <th className="px-4 py-2 border-b border-gray-200 font-bold text-right text-xs border-r print:border-black">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedData).map((dateStr) => {
                                        const dayData = groupedData[dateStr];
                                        const udData = dayData.uds[filterUD];
                                        if (!udData) return null;

                                        return (
                                            <Fragment key={dateStr}>
                                                {/* Date Row */}
                                                <tr className="bg-blue-50/30 print:bg-gray-50">
                                                    <td colSpan={10} className="px-4 py-2 font-bold text-blue-700 border-b print:border-black print:text-black">
                                                        {dateStr}
                                                    </td>
                                                </tr>
                                                {udData.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 print:hover:bg-transparent transition-colors border-b last:border-b-0 print:border-black">
                                                        <td className="px-4 py-2.5 font-medium text-gray-900 border-r print:border-black">{item.nama_barang || item.barang_id?.nama_barang || '-'}</td>
                                                        <td className="px-3 py-2.5 text-center text-gray-700 border-r print:border-black">{item.qty}</td>
                                                        <td className="px-3 py-2.5 text-center text-gray-500 border-r print:border-black">{item.satuan || item.barang_id?.satuan || '-'}</td>
                                                        {/* Budget */}
                                                        <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(item.masterPrice)}</td>
                                                        <td className="px-4 py-2.5 text-right font-medium text-blue-800 border-r print:border-black print:text-black">{formatCurrency(item.itemBudgetTotal)}</td>
                                                        {/* Jual */}
                                                        <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(item.harga_jual)}</td>
                                                        <td className="px-4 py-2.5 text-right font-medium text-orange-800 border-r print:border-black print:text-black">{formatCurrency(item.subtotal_jual)}</td>
                                                        {/* Modal */}
                                                        <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(item.harga_modal)}</td>
                                                        <td className="px-4 py-2.5 text-right font-medium text-purple-800 border-r print:border-black print:text-black">{formatCurrency(item.subtotal_modal)}</td>
                                                        {/* Profit */}
                                                        <td className="px-4 py-2.5 text-right font-bold text-green-700">{formatCurrency(item.keuntungan)}</td>
                                                    </tr>
                                                ))}
                                                {/* Daily Subtotal for this UD */}
                                                <tr className="bg-gray-50/50 font-bold print:bg-transparent">
                                                    <td colSpan={3} className="px-4 py-3 text-right uppercase text-xs text-gray-500 border-r print:border-black print:text-black">Subtotal {dateStr}</td>
                                                    <td colSpan={2} className="px-4 py-3 text-right text-blue-800 border-r print:border-black print:text-black">{formatCurrency(udData.totalBudget)}</td>
                                                    <td colSpan={2} className="px-4 py-3 text-right text-orange-800 border-r print:border-black print:text-black">{formatCurrency(udData.totalJual)}</td>
                                                    <td colSpan={2} className="px-4 py-3 text-right text-purple-800 border-r print:border-black print:text-black">{formatCurrency(udData.totalModal)}</td>
                                                    <td className="px-4 py-3 text-right text-green-800">{formatCurrency(udData.totalKeuntungan)}</td>
                                                </tr>
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-900 text-white font-bold print:bg-black print:text-white">
                                    <tr className="text-lg">
                                        <td colSpan={3} className="px-4 py-6 text-right uppercase tracking-widest text-sm text-gray-400 print:text-white">GRAND TOTAL</td>
                                        <td colSpan={2} className="px-4 py-6 text-right whitespace-nowrap">{formatCurrency(grandTotalBudget)}</td>
                                        <td colSpan={2} className="px-4 py-6 text-right whitespace-nowrap text-orange-400 print:text-white">{formatCurrency(grandTotalJual)}</td>
                                        <td colSpan={2} className="px-4 py-6 text-right whitespace-nowrap text-purple-400 print:text-white">{formatCurrency(grandTotalModal)}</td>
                                        <td className="px-4 py-6 text-right whitespace-nowrap text-green-400 print:text-white">{formatCurrency(grandTotalKeuntungan)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* Standard Grouped Laporan Table */
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Summary Cards */}
                    {Object.keys(groupedData).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
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

                    {Object.keys(groupedData).map((dateStr) => {
                        const dayData = groupedData[dateStr];
                        return (
                            <div key={dateStr} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm print:shadow-none print:border-black">
                                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex justify-between items-center print:bg-gray-100 print:border-black">
                                    <h2 className="text-lg font-bold text-gray-900">{dateStr}</h2>
                                    <div className="flex gap-4 text-sm print:hidden">
                                        <span className="text-gray-600">Jual: <span className="font-bold text-gray-900">{formatCurrency(dayData.subtotalJual)}</span></span>
                                        <span className="text-gray-600">Modal: <span className="font-bold text-gray-900">{formatCurrency(dayData.subtotalModal)}</span></span>
                                        <span className="text-gray-600">Keuntungan: <span className="font-bold text-green-600">{formatCurrency(dayData.subtotalKeuntungan)}</span></span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/30 text-xs font-semibold text-gray-500 uppercase tracking-wider print:bg-gray-50">
                                                <th className="px-6 py-3 text-left border-b border-gray-200 w-12 print:border-black">No</th>
                                                <th className="px-6 py-3 text-left border-b border-gray-200 print:border-black">Nama Barang</th>
                                                <th className="px-6 py-3 text-center border-b border-gray-200 print:border-black">Qty</th>
                                                <th className="px-6 py-3 text-center border-b border-gray-200 print:border-black">Satuan</th>
                                                <th className="px-6 py-3 text-right border-b border-gray-200 print:border-black">Harga Jual</th>
                                                <th className="px-6 py-3 text-right border-b border-gray-200 print:border-black">Total Jual</th>
                                                <th className="px-6 py-3 text-right border-b border-gray-200 print:border-black">Harga Modal</th>
                                                <th className="px-6 py-3 text-right border-b border-gray-200 print:border-black">Total Modal</th>
                                                <th className="px-6 py-3 text-right border-b border-gray-200 print:border-black">Keuntungan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 print:divide-black">
                                            {Object.values(dayData.uds).map((ud, udIdx) => (
                                                <Fragment key={`ud-group-${dateStr}-${udIdx}`}>
                                                    {/* UD Sub-header */}
                                                    <tr key={`ud-${udIdx}`} className="bg-blue-50/30 print:bg-gray-50">
                                                        <td colSpan={9} className="px-6 py-2 text-sm font-bold text-blue-700 italic border-b border-blue-100 print:text-black print:border-black">
                                                            {ud.name}
                                                        </td>
                                                    </tr>
                                                    {/* Items */}
                                                    {ud.items.map((item, itemIdx) => (
                                                        <tr key={`${dateStr}-${udIdx}-${itemIdx}`} className="hover:bg-gray-50/50 transition-colors print:border-black">
                                                            <td className="px-6 py-3 text-sm text-gray-500">{itemIdx + 1}</td>
                                                            <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.nama_barang || item.barang_id?.nama_barang || '-'}</td>
                                                            <td className="px-6 py-3 text-sm text-center font-semibold text-blue-600 print:text-black">{item.qty}</td>
                                                            <td className="px-6 py-3 text-sm text-center text-gray-500">{item.satuan || item.barang_id?.satuan || '-'}</td>
                                                            <td className="px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(item.harga_jual)}</td>
                                                            <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(item.subtotal_jual)}</td>
                                                            <td className="px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(item.harga_modal)}</td>
                                                            <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(item.subtotal_modal)}</td>
                                                            <td className="px-6 py-3 text-sm text-right font-bold text-green-600 print:text-black">{formatCurrency(item.keuntungan)}</td>
                                                        </tr>
                                                    ))}
                                                    {/* UD Totals */}
                                                    <tr className="bg-gray-50/20 print:bg-transparent">
                                                        <td colSpan={5} className="px-6 py-3 text-xs font-bold text-gray-400 text-right uppercase tracking-wider print:text-black">Subtotal {ud.name}</td>
                                                        <td className="px-6 py-3 text-sm text-right font-bold text-gray-900 border-t border-gray-200 print:border-black">{formatCurrency(ud.totalJual)}</td>
                                                        <td className="px-6 py-3 border-t border-gray-200 print:border-transparent"></td>
                                                        <td className="px-6 py-3 text-sm text-right font-bold text-gray-900 border-t border-gray-200 print:border-black">{formatCurrency(ud.totalModal)}</td>
                                                        <td className="px-6 py-3 text-sm text-right font-bold text-green-700 border-t border-gray-200 print:border-black">{formatCurrency(ud.totalKeuntungan)}</td>
                                                    </tr>
                                                </Fragment>
                                            ))}
                                            {/* Day Totals */}
                                            <tr className="bg-gray-100/50 print:bg-gray-200">
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

                    {/* Grand Total Row */}
                    {Object.keys(groupedData).length > 0 && (
                        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 flex flex-col md:flex-row justify-between items-center gap-6 print:bg-black print:text-white print:shadow-none">
                            <div className="text-center md:text-left">
                                <h3 className="text-xl font-bold">TOTAL KESELURUHAN</h3>
                                <p className="text-blue-100 text-sm opacity-80 mt-1 print:hidden">Rekapitulasi seluruh periode yang dipilih</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
                                <div>
                                    <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-1 print:text-white">Total Jual</p>
                                    <p className="text-2xl font-black">{formatCurrency(grandTotalJual)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-1 print:text-white">Total Modal</p>
                                    <p className="text-2xl font-black">{formatCurrency(grandTotalModal)}</p>
                                </div>
                                <div className="bg-white/10 px-6 py-3 rounded-xl backdrop-blur-md border border-white/20 print:bg-transparent">
                                    <p className="text-xs font-medium text-green-300 uppercase tracking-widest mb-1 print:text-white">Total Untung</p>
                                    <p className="text-2xl font-black text-green-400 print:text-white">{formatCurrency(grandTotalKeuntungan)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!loading && Object.keys(groupedData).length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center shadow-sm print:hidden">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <ClipboardList className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Data</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">Pilih periode dan klik tombol cari untuk memuat laporan rekap penjualan.</p>
                </div>
            )}
        </div>
    );
}

