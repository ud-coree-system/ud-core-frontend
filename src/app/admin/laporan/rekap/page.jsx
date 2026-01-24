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
    const [lastFilterHash, setLastFilterHash] = useState('');

    useEffect(() => {
        fetchOptions();
    }, []);

    // Clear data when filters change to prevent stale display
    useEffect(() => {
        setTransactions([]);
        setGroupedData({});
        setSelectedUDData(null);
    }, [filterPeriode, filterUD]);

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
        const selectedPeriode = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;

        try {
            setLoading(true);
            const params = {
                limit: 2000,
                status: 'completed',
                periode_id: filterPeriode || undefined,
            };

            const response = await transaksiAPI.getAll(params);
            if (response.data.success) {
                // Fetch full details for each transaction to get items and UD info
                const detailedTransactions = (await Promise.all(
                    response.data.data.map(async (trx) => {
                        const detailRes = await transaksiAPI.getById(trx._id);
                        return detailRes.data.success ? detailRes.data.data : trx;
                    })
                )).filter(trx => {
                    const isCompleted = trx.status === 'completed';
                    if (!selectedPeriode) return isCompleted;

                    // Unified local date string helper
                    const toLocalDate = (dateStr) => {
                        const d = new Date(dateStr);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    };

                    const trxDate = toLocalDate(trx.tanggal);
                    const startDate = toLocalDate(selectedPeriode.tanggal_mulai);
                    const endDate = toLocalDate(selectedPeriode.tanggal_selesai);

                    const isInRange = trxDate >= startDate && trxDate <= endDate;
                    return isCompleted && isInRange;
                });

                processGroupedData(detailedTransactions);
                setTransactions(detailedTransactions);

                // Update selected UD data if UD filter is active
                if (filterUD) {
                    const udInfo = udList.find(u => u._id === filterUD);
                    setSelectedUDData(udInfo);
                } else {
                    setSelectedUDData(null);
                }

                if (detailedTransactions.length === 0) {
                    toast.info('Tidak ditemukan transaksi pada kriteria ini');
                } else {
                    toast.success(`Ditemukan ${detailedTransactions.length} transaksi`);
                }
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

        const sortedGrouped = Object.fromEntries(
            Object.entries(grouped).sort((a, b) => new Date(a[1].date) - new Date(b[1].date))
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
                        { content: 'Keuntungan', rowSpan: 2 }
                    ], [
                        'Harga', 'Total', 'Harga', 'Total', 'Harga', 'Total'
                    ]],
                    body: tableRows,
                    theme: 'grid',
                    styles: { fontSize: 7, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], halign: 'center', valign: 'middle' },
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
                    styles: { fontSize: 10, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], halign: 'center', valign: 'middle' },
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
                    head: [['No', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual Suplier', 'Total Jual Suplier', 'Harga Modal Suplier', 'Total Modal Suplier', 'Keuntungan']],
                    body: tableRows,
                    theme: 'grid',
                    styles: { fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], halign: 'center', valign: 'middle' },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center' },
                        2: { cellWidth: 12, halign: 'center' },
                        3: { cellWidth: 20, halign: 'center' },
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
                    styles: { fontSize: 12, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-4 md:p-6 shadow-sm print:hidden">
                <div className="flex flex-col md:grid md:grid-cols-3 items-end gap-4">
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Pilih Periode
                        </label>
                        <select
                            value={filterPeriode}
                            onChange={(e) => setFilterPeriode(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer text-sm"
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
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="">Semua UD</option>
                            {udList.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.nama_ud}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex w-full gap-2">
                        <button
                            onClick={fetchTransactions}
                            disabled={loading}
                            className="flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Search className="w-5 h-5" />
                            )}
                            Cari Data
                        </button>
                        {Object.keys(groupedData).length > 0 && (
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
                        )}
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {filterUD && selectedUDData ? (
                /* Specialized UD Report View (Matches Reference Image) */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 print:space-y-0 print:m-0">
                    {/* UD Header Details */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-sm print:shadow-none print:border-none print:p-0">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 print:flex-row">
                            <div className="space-y-4 flex-1">
                                <div>
                                    <h2 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest print:text-black">UD Details</h2>
                                    <h3 className="text-xl md:text-3xl font-black text-gray-900 mt-1 print:text-2xl">{selectedUDData.nama_ud}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg print:hidden shrink-0">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase print:text-black">Pemilik (An.)</p>
                                            <p className="text-xs md:text-sm font-bold text-gray-800 print:text-black">{selectedUDData.nama_pemilik || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-50 rounded-lg print:hidden shrink-0">
                                            <CreditCard className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase print:text-black">No Rekening</p>
                                            <p className="text-xs md:text-sm font-bold text-gray-800 font-mono print:text-black">{selectedUDData.bank} : {selectedUDData.no_rekening || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 sm:col-span-2">
                                        <div className="p-2 bg-purple-50 rounded-lg print:hidden shrink-0">
                                            <MapPin className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase print:text-black">Alamat</p>
                                            <p className="text-xs md:text-sm font-medium text-gray-700 print:text-black">{selectedUDData.alamat || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="md:w-64 space-y-4 print:text-right">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase print:text-black">KBLI Meliputi</p>
                                    <div className="flex flex-wrap gap-1 mt-1 md:mt-2 print:justify-end">
                                        {selectedUDData.kbli?.map((k, idx) => (
                                            <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[10px] font-bold uppercase print:bg-transparent print:border print:border-black print:text-black">{k}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-3 md:pt-4 border-t border-gray-100 print:border-black">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase print:text-black">Periode Laporan</p>
                                    <p className="text-xs md:text-sm font-bold text-gray-800 print:text-black">
                                        {periodeList.find(p => p._id === filterPeriode)?.nama_periode}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Specialized View - Desktop Table */}
                    <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm print:block print:shadow-none print:border-black">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 print:bg-gray-200">
                                    <tr>
                                        <th rowSpan={2} className="px-3 md:px-4 py-4 border-b border-gray-200 font-bold text-gray-900 border-r print:border-black">Nama Barang</th>
                                        <th rowSpan={2} className="px-2 md:px-3 py-4 border-b border-gray-200 font-bold text-gray-900 border-r print:border-black">Qty</th>
                                        <th rowSpan={2} className="hidden lg:table-cell px-2 md:px-3 py-4 border-b border-gray-200 font-bold text-gray-900 border-r print:border-black">Satuan</th>
                                        <th colSpan={2} className="px-2 md:px-3 py-2 border-b border-gray-200 font-bold text-center text-blue-700 border-r print:border-black print:text-black">Budget Dapur</th>
                                        <th colSpan={2} className="px-2 md:px-3 py-2 border-b border-gray-200 font-bold text-center text-orange-700 border-r print:border-black print:text-black">Jual Suplier</th>
                                        <th colSpan={2} className="px-2 md:px-3 py-2 border-b border-gray-200 font-bold text-center text-purple-700 border-r print:border-black print:text-black hover:hidden">Modal Suplier</th>
                                        <th rowSpan={2} className="px-3 md:px-4 py-4 border-b border-gray-200 font-bold text-right text-green-700 print:border-black print:text-black">Keuntungan</th>
                                    </tr>
                                    <tr className="bg-gray-50/50 print:bg-gray-100">
                                        <th className="hidden xl:table-cell px-3 py-2 border-b border-gray-200 font-bold text-right text-xs print:border-black">Harga</th>
                                        <th className="px-2 md:px-3 py-2 border-b border-gray-200 font-bold text-right text-xs border-r print:border-black">Total</th>
                                        <th className="hidden xl:table-cell px-3 py-2 border-b border-gray-200 font-bold text-right text-xs print:border-black">Harga</th>
                                        <th className="px-2 md:px-3 py-2 border-b border-gray-200 font-bold text-right text-xs border-r print:border-black">Total</th>
                                        <th className="hidden xl:table-cell px-3 py-2 border-b border-gray-200 font-bold text-right text-xs print:border-black">Harga</th>
                                        <th className="px-2 md:px-3 py-2 border-b border-gray-200 font-bold text-right text-xs border-r print:border-black">Total</th>
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
                                                        <td className="px-3 md:px-4 py-2.5 font-medium text-gray-900 border-r print:border-black">
                                                            <p className="line-clamp-2">{item.nama_barang || item.barang_id?.nama_barang || '-'}</p>
                                                        </td>
                                                        <td className="px-2 md:px-3 py-2.5 text-center text-gray-700 border-r print:border-black">{item.qty}</td>
                                                        <td className="hidden lg:table-cell px-2 md:px-3 py-2.5 text-center text-gray-500 border-r print:border-black">{item.satuan || item.barang_id?.satuan || '-'}</td>
                                                        {/* Budget */}
                                                        <td className="hidden xl:table-cell px-3 py-2.5 text-right text-gray-600">{formatCurrency(item.masterPrice)}</td>
                                                        <td className="px-2 md:px-3 py-2.5 text-right font-medium text-blue-800 border-r print:border-black print:text-black">{formatCurrency(item.itemBudgetTotal)}</td>
                                                        {/* Jual */}
                                                        <td className="hidden xl:table-cell px-3 py-2.5 text-right text-gray-600">{formatCurrency(item.harga_jual)}</td>
                                                        <td className="px-2 md:px-3 py-2.5 text-right font-medium text-orange-800 border-r print:border-black print:text-black">{formatCurrency(item.subtotal_jual)}</td>
                                                        {/* Modal */}
                                                        <td className="hidden xl:table-cell px-3 py-2.5 text-right text-gray-600">{formatCurrency(item.harga_modal)}</td>
                                                        <td className="px-2 md:px-3 py-2.5 text-right font-medium text-purple-800 border-r print:border-black print:text-black">{formatCurrency(item.subtotal_modal)}</td>
                                                        {/* Profit */}
                                                        <td className="px-2 md:px-3 py-2.5 text-right font-bold text-green-700">{formatCurrency(item.keuntungan)}</td>
                                                    </tr>
                                                ))}
                                                {/* Daily Subtotal for this UD */}
                                                <tr className="bg-gray-50/50 font-bold print:bg-transparent">
                                                    <td colSpan={2} className="px-3 md:px-4 py-3 text-right uppercase text-[10px] md:text-xs text-gray-500 border-r print:border-black print:text-black whitespace-pre-line">Subtotal {dateStr}</td>
                                                    <td className="hidden lg:table-cell px-2 md:px-3 py-3 border-r print:border-black"></td>
                                                    {/* Budget */}
                                                    <td className="hidden xl:table-cell px-3 py-3"></td>
                                                    <td className="px-2 md:px-3 py-3 text-right text-blue-800 border-r print:border-black print:text-black">{formatCurrency(udData.totalBudget)}</td>
                                                    {/* Jual */}
                                                    <td className="hidden xl:table-cell px-3 py-3"></td>
                                                    <td className="px-2 md:px-3 py-3 text-right text-orange-800 border-r print:border-black print:text-black">{formatCurrency(udData.totalJual)}</td>
                                                    {/* Modal */}
                                                    <td className="hidden xl:table-cell px-3 py-3"></td>
                                                    <td className="px-2 md:px-3 py-3 text-right text-purple-800 border-r print:border-black print:text-black">{formatCurrency(udData.totalModal)}</td>
                                                    {/* Profit */}
                                                    <td className="px-2 md:px-3 py-3 text-right text-green-800">{formatCurrency(udData.totalKeuntungan)}</td>
                                                </tr>
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-900 text-white font-bold print:bg-black print:text-white">
                                    <tr className="text-sm md:text-lg">
                                        <td colSpan={2} className="px-3 md:px-4 py-4 md:py-6 text-right uppercase tracking-wider text-[10px] md:text-sm text-gray-400 print:text-white">GRAND TOTAL</td>
                                        <td className="hidden lg:table-cell px-2 md:px-3 py-4 md:py-6"></td>
                                        {/* Budget */}
                                        <td className="hidden xl:table-cell px-3 py-4 md:py-6"></td>
                                        <td className="px-2 md:px-3 py-4 md:py-6 text-right whitespace-nowrap">{formatCurrency(grandTotalBudget)}</td>
                                        {/* Jual */}
                                        <td className="hidden xl:table-cell px-3 py-4 md:py-6"></td>
                                        <td className="px-2 md:px-3 py-4 md:py-6 text-right whitespace-nowrap text-orange-400 print:text-white">{formatCurrency(grandTotalJual)}</td>
                                        {/* Modal */}
                                        <td className="hidden xl:table-cell px-3 py-4 md:py-6"></td>
                                        <td className="px-2 md:px-3 py-4 md:py-6 text-right whitespace-nowrap text-purple-400 print:text-white">{formatCurrency(grandTotalModal)}</td>
                                        {/* Profit */}
                                        <td className="px-2 md:px-3 py-4 md:py-6 text-right whitespace-nowrap text-green-400 print:text-white">{formatCurrency(grandTotalKeuntungan)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Specialized View - Mobile Cards */}
                    <div className="lg:hidden space-y-6 print:hidden">
                        {Object.keys(groupedData).map((dateStr) => {
                            const dayData = groupedData[dateStr];
                            const udData = dayData.uds[filterUD];
                            if (!udData) return null;

                            return (
                                <div key={dateStr} className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="h-px flex-1 bg-gray-200"></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{dateStr}</span>
                                        <div className="h-px flex-1 bg-gray-200"></div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {udData.items.map((item, idx) => (
                                            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{item.nama_barang || item.barang_id?.nama_barang || '-'}</h4>
                                                        <p className="text-xs text-gray-500">{item.qty} {item.satuan || item.barang_id?.satuan || '-'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Keuntungan</p>
                                                        <p className="text-sm font-bold text-green-600">{formatCurrency(item.keuntungan)}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-blue-600 uppercase">Budget</p>
                                                        <p className="text-xs font-bold text-gray-900">{formatCurrency(item.itemBudgetTotal)}</p>
                                                        <p className="text-[8px] text-gray-400">@{formatCurrency(item.masterPrice)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-orange-600 uppercase">Jual</p>
                                                        <p className="text-xs font-bold text-gray-900">{formatCurrency(item.subtotal_jual)}</p>
                                                        <p className="text-[8px] text-gray-400">@{formatCurrency(item.harga_jual)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-purple-600 uppercase">Modal</p>
                                                        <p className="text-xs font-bold text-gray-900">{formatCurrency(item.subtotal_modal)}</p>
                                                        <p className="text-[8px] text-gray-400">@{formatCurrency(item.harga_modal)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Mobile Subtotal Card */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Subtotal {dateStr}</p>
                                        <div className="grid grid-cols-2 gap-y-3">
                                            <div>
                                                <p className="text-[10px] text-gray-500">Total Budget</p>
                                                <p className="text-sm font-bold text-blue-700">{formatCurrency(udData.totalBudget)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500">Total Jual</p>
                                                <p className="text-sm font-bold text-orange-700">{formatCurrency(udData.totalJual)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500">Total Modal</p>
                                                <p className="text-sm font-bold text-purple-700">{formatCurrency(udData.totalModal)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500">Keuntungan</p>
                                                <p className="text-sm font-bold text-green-700">{formatCurrency(udData.totalKeuntungan)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Standard Grouped Laporan Table */
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Summary Cards */}
                    {Object.keys(groupedData).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 print:hidden">
                            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-sm">
                                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Penjualan</p>
                                <p className="text-xl md:text-2xl font-black text-gray-900 break-words">{formatCurrency(grandTotalJual)}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-sm">
                                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Modal</p>
                                <p className="text-xl md:text-2xl font-black text-gray-900 break-words">{formatCurrency(grandTotalModal)}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-sm group md:col-span-2 lg:col-span-1">
                                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Keuntungan</p>
                                <p className="text-xl md:text-2xl font-black text-green-600 break-words">{formatCurrency(grandTotalKeuntungan)}</p>
                            </div>
                        </div>
                    )}

                    {Object.keys(groupedData).map((dateStr) => {
                        const dayData = groupedData[dateStr];
                        return (
                            <div key={dateStr} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm print:shadow-none print:border-black">
                                <div className="bg-gray-50/50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 print:bg-gray-100 print:border-black">
                                    <h2 className="text-md md:text-lg font-bold text-gray-900">{dateStr}</h2>
                                    <div className="flex flex-wrap gap-2 md:gap-4 text-[10px] md:text-sm print:hidden">
                                        <span className="text-gray-600">Jual: <span className="font-bold text-gray-900">{formatCurrency(dayData.subtotalJual)}</span></span>
                                        <span className="text-gray-600">Modal: <span className="font-bold text-gray-900">{formatCurrency(dayData.subtotalModal)}</span></span>
                                        <span className="text-gray-600">Keuntungan: <span className="font-bold text-green-600">{formatCurrency(dayData.subtotalKeuntungan)}</span></span>
                                    </div>
                                </div>
                                <div className="hidden lg:block overflow-x-auto print:block">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/30 text-xs font-semibold text-gray-500 uppercase tracking-wider print:bg-gray-50">
                                                <th className="px-3 md:px-4 lg:px-6 py-3 text-left border-b border-gray-200 w-12 print:border-black">No</th>
                                                <th className="px-3 md:px-4 lg:px-6 py-3 text-left border-b border-gray-200 print:border-black">Nama Barang</th>
                                                <th className="px-3 md:px-4 lg:px-6 py-3 text-center border-b border-gray-200 print:border-black">Qty</th>
                                                <th className="hidden lg:table-cell px-6 py-3 text-center border-b border-gray-200 print:border-black">Satuan</th>
                                                <th className="hidden xl:table-cell px-6 py-3 text-right border-b border-gray-200 print:border-black">Harga Jual Suplier</th>
                                                <th className="px-3 md:px-4 lg:px-6 py-3 text-right border-b border-gray-200 print:border-black">Total Jual Suplier</th>
                                                <th className="hidden xl:table-cell px-6 py-3 text-right border-b border-gray-200 print:border-black">Harga Modal Suplier</th>
                                                <th className="px-3 md:px-4 lg:px-6 py-3 text-right border-b border-gray-200 print:border-black">Total Modal Suplier</th>
                                                <th className="px-3 md:px-4 lg:px-6 py-3 text-right border-b border-gray-200 print:border-black">Keuntungan</th>
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
                                                            <td className="px-3 md:px-4 lg:px-6 py-3 text-sm text-gray-500">{itemIdx + 1}</td>
                                                            <td className="px-3 md:px-4 lg:px-6 py-3 text-sm font-medium text-gray-900 leading-tight">
                                                                <p className="line-clamp-2 md:line-clamp-1">{item.nama_barang || item.barang_id?.nama_barang || '-'}</p>
                                                            </td>
                                                            <td className="px-3 md:px-4 lg:px-6 py-3 text-sm text-center font-semibold text-blue-600 print:text-black">{item.qty}</td>
                                                            <td className="hidden lg:table-cell px-6 py-3 text-sm text-center text-gray-500">{item.satuan || item.barang_id?.satuan || '-'}</td>
                                                            <td className="hidden xl:table-cell px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(item.harga_jual)}</td>
                                                            <td className="px-3 md:px-4 lg:px-6 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(item.subtotal_jual)}</td>
                                                            <td className="hidden xl:table-cell px-6 py-3 text-sm text-right text-gray-600">{formatCurrency(item.harga_modal)}</td>
                                                            <td className="px-3 md:px-4 lg:px-6 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(item.subtotal_modal)}</td>
                                                            <td className="px-3 md:px-4 lg:px-6 py-3 text-sm text-right font-bold text-green-600 print:text-black">{formatCurrency(item.keuntungan)}</td>
                                                        </tr>
                                                    ))}
                                                    {/* UD Totals */}
                                                    <tr className="bg-gray-50/20 print:bg-transparent">
                                                        <td colSpan={2} className="px-3 md:px-4 lg:px-6 py-3 text-xs font-bold text-gray-400 text-right uppercase tracking-wider print:text-black whitespace-pre-line">Subtotal {ud.name}</td>
                                                        <td className="px-3 md:px-4 lg:px-6 py-3 border-t border-gray-200 print:border-black"></td>
                                                        <td className="hidden lg:table-cell px-6 py-3 border-t border-gray-200 print:border-black"></td>
                                                        <td className="hidden xl:table-cell px-6 py-3 border-t border-gray-200 print:border-black"></td>
                                                        <td className="px-3 md:px-4 lg:px-6 py-3 text-sm text-right font-bold text-gray-900 border-t border-gray-200 print:border-black">{formatCurrency(ud.totalJual)}</td>
                                                        <td className="hidden xl:table-cell px-6 py-3 border-t border-gray-200 print:border-black"></td>
                                                        <td className="px-3 md:px-4 lg:px-6 py-3 text-sm text-right font-bold text-gray-900 border-t border-gray-200 print:border-black">{formatCurrency(ud.totalModal)}</td>
                                                        <td className="px-3 md:px-4 lg:px-6 py-3 text-sm text-right font-bold text-green-700 border-t border-gray-200 print:border-black">{formatCurrency(ud.totalKeuntungan)}</td>
                                                    </tr>
                                                </Fragment>
                                            ))}
                                            {/* Day Totals */}
                                            <tr className="bg-gray-100/50 print:bg-gray-200">
                                                <td colSpan={2} className="px-3 md:px-4 lg:px-6 py-4 text-sm font-extrabold text-gray-900 text-right uppercase whitespace-pre-line">Total {dateStr}</td>
                                                <td className="px-3 md:px-4 lg:px-6 py-4"></td>
                                                <td className="hidden lg:table-cell px-6 py-4"></td>
                                                <td className="hidden xl:table-cell px-6 py-4"></td>
                                                <td className="px-3 md:px-4 lg:px-6 py-4 text-sm text-right font-extrabold text-gray-900">{formatCurrency(dayData.subtotalJual)}</td>
                                                <td className="hidden xl:table-cell px-6 py-4"></td>
                                                <td className="px-3 md:px-4 lg:px-6 py-4 text-sm text-right font-extrabold text-gray-900">{formatCurrency(dayData.subtotalModal)}</td>
                                                <td className="px-3 md:px-4 lg:px-6 py-4 text-sm text-right font-extrabold text-green-700">{formatCurrency(dayData.subtotalKeuntungan)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Standard View - Mobile Cards */}
                                <div className="lg:hidden divide-y divide-gray-100 print:hidden">
                                    {Object.values(dayData.uds).map((ud, udIdx) => (
                                        <div key={`ud-mobile-${dateStr}-${udIdx}`} className="p-4 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase italic">{ud.name}</span>
                                                <div className="h-px flex-1 bg-blue-50"></div>
                                            </div>

                                            <div className="space-y-3">
                                                {ud.items.map((item, itemIdx) => (
                                                    <div key={`item-mobile-${itemIdx}`} className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-sm font-bold text-gray-900">{item.nama_barang || item.barang_id?.nama_barang || '-'}</h4>
                                                            <span className="text-xs font-bold text-green-600">{formatCurrency(item.keuntungan)}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                            <div>
                                                                <p className="text-gray-500 uppercase">Qty</p>
                                                                <p className="font-bold">{item.qty} {item.satuan || item.barang_id?.satuan || '-'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-gray-500 uppercase">Jual</p>
                                                                <p className="font-bold">{formatCurrency(item.subtotal_jual)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500 uppercase">Hrg Jual</p>
                                                                <p className="font-medium text-gray-600">{formatCurrency(item.harga_jual)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-gray-500 uppercase">Hrg Modal</p>
                                                                <p className="font-medium text-gray-600">{formatCurrency(item.harga_modal)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* UD Subtotal Mobile */}
                                            <div className="flex justify-between items-center py-2 border-t border-dashed border-gray-200">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Subtotal {ud.name}</span>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-gray-900">{formatCurrency(ud.totalJual)}</p>
                                                    <p className="text-[10px] font-bold text-green-600">{formatCurrency(ud.totalKeuntungan)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Grand Total Row */}
                    {Object.keys(groupedData).length > 0 && (
                        <div className="bg-blue-600 rounded-2xl p-5 md:p-8 text-white shadow-xl shadow-blue-500/20 flex flex-col xl:flex-row justify-between items-center gap-6 print:bg-black print:text-white print:shadow-none">
                            <div className="text-center xl:text-left">
                                <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase">Total Keseluruhan</h3>
                                <p className="text-blue-100 text-xs md:text-sm font-medium opacity-80 mt-1 print:hidden">Rekapitulasi seluruh periode yang dipilih</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 xl:gap-8 text-center w-full xl:w-auto">
                                <div className="bg-white/5 xl:bg-transparent p-4 xl:p-0 rounded-2xl flex flex-col items-center xl:items-end">
                                    <p className="text-[10px] md:text-xs font-bold text-blue-200 uppercase tracking-widest mb-1 md:mb-1.5 print:text-white leading-none">Total Jual</p>
                                    <p className="text-lg md:text-xl xl:text-2xl font-black leading-none">{formatCurrency(grandTotalJual)}</p>
                                </div>
                                <div className="bg-white/5 xl:bg-transparent p-4 xl:p-0 rounded-2xl flex flex-col items-center xl:items-end">
                                    <p className="text-[10px] md:text-xs font-bold text-blue-200 uppercase tracking-widest mb-1 md:mb-1.5 print:text-white leading-none">Total Modal</p>
                                    <p className="text-lg md:text-xl xl:text-2xl font-black leading-none">{formatCurrency(grandTotalModal)}</p>
                                </div>
                                <div className="bg-white/10 px-4 md:px-6 py-3 md:py-4 rounded-2xl backdrop-blur-md border border-white/20 print:bg-transparent flex flex-col items-center xl:items-end">
                                    <p className="text-[10px] md:text-xs font-bold text-green-300 uppercase tracking-widest mb-1 md:mb-1.5 print:text-white leading-none">Total Untung</p>
                                    <p className="text-lg md:text-xl xl:text-2xl font-black text-green-400 print:text-white leading-none">{formatCurrency(grandTotalKeuntungan)}</p>
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

