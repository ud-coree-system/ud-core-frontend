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
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort, toDateInputValue, toLocalDate, formatDateFilename } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportLaporanExcel } from '@/utils/excel/exportLaporan';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function LaporanPage() {
    const { toast } = useToast();

    // Options
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);
    const [udList, setUdList] = useState([]);
    const [barangList, setBarangList] = useState([]);

    // Filters
    const [filterPeriode, setFilterPeriode] = useState('');
    const [filterDapur, setFilterDapur] = useState('');

    // Data
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, []);

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

                    // Client-side Dapur cross-check (optional but safe)
                    const matchesDapur = filterDapur ? (trx.dapur_id?._id || trx.dapur_id) === filterDapur : true;

                    return isCompleted && isInRange && matchesDapur;
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

    const getItemsByUD = () => {
        const barangMap = new Map(barangList.map(b => [b._id, b]));
        const udMap = {}; // We need a fresh map for grouping results, the udList map is for lookup

        const udLookupMap = new Map(udList.map(u => [u._id, u]));

        transactions.forEach((trx) => {
            trx.items?.forEach((item) => {
                const bId = item.barang_id?._id || item.barang_id;
                const uId = item.ud_id?._id || item.ud_id;

                // Strict filtering by Dapur
                const trxDapurId = trx.dapur_id?._id || trx.dapur_id;
                if (filterDapur && trxDapurId !== filterDapur) return;

                const barang = barangMap.get(bId);
                const ud = udLookupMap.get(uId);

                const udIdKey = uId || 'unknown';
                const udName = ud?.nama_ud || item.ud_id?.nama_ud || 'Unknown UD';
                const udKode = ud?.kode_ud || item.ud_id?.kode_ud || '';

                if (!udMap[udIdKey]) {
                    udMap[udIdKey] = {
                        _id: udIdKey,
                        nama_ud: udName,
                        kode_ud: udKode,
                        items: [],
                        totalJual: 0,
                        totalModal: 0,
                        totalKeuntungan: 0,
                    };
                }

                const actualJual = item.harga_jual ?? barang?.harga_jual;
                const actualModal = item.harga_modal ?? barang?.harga_modal;

                udMap[udIdKey].items.push({
                    ...item,
                    barang_id: barang || item.barang_id,
                    ud_id: ud || item.ud_id,
                    harga_jual: actualJual,
                    harga_modal: actualModal,
                    transaksi: trx.kode_transaksi,
                    dapur: trx.dapur_id?.nama_dapur,
                    tanggal: trx.tanggal,
                });
                udMap[udIdKey].totalJual += (item.subtotal_jual || 0);
                udMap[udIdKey].totalModal += (item.subtotal_modal || 0);
                udMap[udIdKey].totalKeuntungan += (item.keuntungan || 0);
            });
        });
        return Object.values(udMap);
    };

    // Helper to format date in Indonesian
    const formatIndoDate = (date) => {
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date(date));
    };

    // Generate Excel Report
    const generateExcel = async () => {
        if (transactions.length === 0) {
            toast.warning('Tidak ada data untuk dibuat laporan');
            return;
        }

        const itemsByUD = getItemsByUD();
        const period = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;
        const periodName = period ? period.nama_periode : 'Semua Periode';
        const selectedDapur = filterDapur ? dapurList.find(d => d._id === filterDapur) : null;

        // Calculate global totals
        const totalJualAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.subtotal_jual, 0) || 0), 0);
        const totalModalAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.subtotal_modal, 0) || 0), 0);
        const totalUntungAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.keuntungan, 0) || 0), 0);

        setGenerating(true);
        try {
            const periodClean = periodName.replace(/\s+/g, '_');
            const dapurName = selectedDapur ? selectedDapur.nama_dapur.replace(/\s+/g, '_') : '';
            const timestamp = formatDateFilename();

            let fileNamePrefix = 'Laporan_Rekap_Penjualan';
            let fileNameSuffix = '';

            if (dapurName) {
                fileNamePrefix = 'Rekap_Penjualan';
                fileNameSuffix += `_Dapur_${dapurName}`;
            }

            const fileName = `${fileNamePrefix}${fileNameSuffix}_${periodClean}_${timestamp}.xlsx`;

            const periodRange = period ? `(${formatDateShort(period.tanggal_mulai)} - ${formatDateShort(period.tanggal_selesai)})` : '';
            const dapurLabel = selectedDapur ? ` - DAPUR: ${selectedDapur.nama_dapur.toUpperCase()}` : '';
            const periodeLabel = `${periodName.toUpperCase()} ${periodRange}${dapurLabel}`;

            await exportLaporanExcel({
                transactions,
                itemsByUD,
                periodeLabel,
                totalJualAll,
                totalModalAll,
                totalUntungAll,
                barangList,
                udList,
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

    // Generate PDF Rekap (All UDs)
    const generateRekapPDF = () => {
        if (transactions.length === 0) {
            toast.warning('Tidak ada data untuk dibuat laporan');
            return;
        }

        setGenerating(true);
        try {
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
            const pageWidth = doc.internal.pageSize.getWidth();

            // Period Info
            const period = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;
            const periodName = period ? period.nama_periode : 'Semua Periode';
            const periodRange = period ? `(${formatDateShort(period.tanggal_mulai)} - ${formatDateShort(period.tanggal_selesai)})` : '';
            const selectedDapur = filterDapur ? dapurList.find(d => d._id === filterDapur) : null;

            const dapurLabel = selectedDapur ? ` - DAPUR: ${selectedDapur.nama_dapur.toUpperCase()}` : '';
            const periodeLabel = `${periodName.toUpperCase()} ${periodRange}${dapurLabel}`;
            const printTimestamp = `Dicetak pada: ${new Date().toLocaleString('id-ID')}`;

            // Filename logic
            const periodClean = periodName.replace(/\s+/g, '_');
            const dapurName = selectedDapur ? selectedDapur.nama_dapur.replace(/\s+/g, '_') : '';
            const timestamp = formatDateFilename();

            let fileNamePrefix = 'Laporan_Rekap_Penjualan';
            let fileNameSuffix = '';

            if (dapurName) {
                fileNamePrefix = 'Rekap_Penjualan';
                fileNameSuffix += `_Dapur_${dapurName}`;
            }

            const fileName = `${fileNamePrefix}${fileNameSuffix}_${periodClean}_${timestamp}.pdf`;
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(`LAPORAN REKAP PENJUALAN`, pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(12);
            doc.text(periodeLabel, pageWidth / 2, 22, { align: 'center' });

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(printTimestamp, pageWidth - 14, 10, { align: 'right' });

            // Calculate global totals
            const totalJualAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.subtotal_jual, 0) || 0), 0);
            const totalModalAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.subtotal_modal, 0) || 0), 0);
            const totalUntungAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.keuntungan, 0) || 0), 0);

            // Summary Table
            autoTable(doc, {
                startY: 30,
                head: [['Ringkasan Periode', 'Total Penjualan', 'Total Modal', 'Total Keuntungan']],
                body: [[
                    '',
                    formatCurrency(totalJualAll),
                    formatCurrency(totalModalAll),
                    formatCurrency(totalUntungAll)
                ]],
                theme: 'grid',
                styles: { fontSize: 10, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], halign: 'center', valign: 'middle' },
            });

            // Create lookup maps for enrichment
            const barangMap = new Map(barangList.map(b => [b._id, b]));
            const udLookupMap = new Map(udList.map(u => [u._id, u]));

            // Group by date THEN by UD
            const groupedData = {};
            transactions.forEach(trx => {
                const dateKey = toLocalDate(trx.tanggal);
                if (!groupedData[dateKey]) groupedData[dateKey] = { tanggal: dateKey, uds: {} };

                trx.items?.forEach(item => {
                    const bId = item.barang_id?._id || item.barang_id;
                    const uId = item.ud_id?._id || item.ud_id;
                    const barang = barangMap.get(bId);
                    const ud = udLookupMap.get(uId);

                    const enrichedItem = {
                        ...item,
                        nama_barang: item.nama_barang || barang?.nama_barang || item.barang_id?.nama_barang,
                        satuan: item.satuan || barang?.satuan || item.barang_id?.satuan
                    };

                    const udId = uId || 'unknown';
                    const udName = ud?.nama_ud || item.ud_id?.nama_ud || 'Unknown UD';
                    if (!groupedData[dateKey].uds[udId]) {
                        groupedData[dateKey].uds[udId] = {
                            nama_ud: udName,
                            items: []
                        };
                    }
                    groupedData[dateKey].uds[udId].items.push(enrichedItem);
                });
            });

            const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(a) - new Date(b));
            let currentY = doc.lastAutoTable.finalY + 10;

            sortedDates.forEach((dateKey, dateIdx) => {
                const dayData = groupedData[dateKey];
                const udGroups = dayData.uds;

                // Date Sub-header
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                if (currentY > 180) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.text(formatIndoDate(dateKey).toUpperCase(), 14, currentY);
                currentY += 5;

                const tableRows = [];
                const sortedUdIds = Object.keys(udGroups).sort((a, b) => udGroups[a].nama_ud.localeCompare(udGroups[b].nama_ud));

                let dateJual = 0;
                let dateModal = 0;
                let dateProfit = 0;

                sortedUdIds.forEach(udId => {
                    const group = udGroups[udId];
                    // UD Row (Styled as header)
                    tableRows.push([
                        { content: group.nama_ud.toUpperCase(), colSpan: 9, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }
                    ]);

                    let udJual = 0;
                    let udModal = 0;
                    let udProfit = 0;

                    group.items.forEach((item, idx) => {
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
                        udJual += item.subtotal_jual;
                        udModal += item.subtotal_modal;
                        udProfit += item.keuntungan;
                    });

                    // UD Subtotal
                    tableRows.push([
                        { content: `Subtotal ${group.nama_ud}`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: formatCurrency(udJual), styles: { fontStyle: 'bold' } },
                        '',
                        { content: formatCurrency(udModal), styles: { fontStyle: 'bold' } },
                        { content: formatCurrency(udProfit), styles: { fontStyle: 'bold' } }
                    ]);

                    dateJual += udJual;
                    dateModal += udModal;
                    dateProfit += udProfit;
                });

                // Date Total Row
                tableRows.push([
                    { content: `TOTAL ${formatDateShort(dateKey)}`, colSpan: 5, styles: { halign: 'right', fillColor: [226, 232, 240], fontStyle: 'bold' } },
                    { content: formatCurrency(dateJual), styles: { fillColor: [226, 232, 240], fontStyle: 'bold' } },
                    { content: '', styles: { fillColor: [226, 232, 240] } },
                    { content: formatCurrency(dateModal), styles: { fillColor: [226, 232, 240], fontStyle: 'bold' } },
                    { content: formatCurrency(dateProfit), styles: { fillColor: [226, 232, 240], fontStyle: 'bold' } }
                ]);

                autoTable(doc, {
                    startY: currentY,
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
                    didDrawPage: (data) => {
                        // Footer on each page
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
                        doc.text(printTimestamp, 14, doc.internal.pageSize.getHeight() - 10);
                    }
                });

                currentY = doc.lastAutoTable.finalY + 10;
            });

            // Final Recap Block
            if (currentY > 180) {
                doc.addPage();
                currentY = 20;
            }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('GRAND TOTAL KESELURUHAN', 14, currentY);
            currentY += 8;

            autoTable(doc, {
                startY: currentY,
                body: [
                    ['Total Penjualan', formatCurrency(totalJualAll)],
                    ['Total Modal', formatCurrency(totalModalAll)],
                    ['Total Keuntungan', formatCurrency(totalUntungAll)]
                ],
                theme: 'plain',
                styles: { fontSize: 12, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                columnStyles: {
                    1: { halign: 'right' }
                }
            });

            // --- Individual UD Pages ---
            itemsByUD.forEach((ud) => {
                doc.addPage();

                // Header UD
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(`LAPORAN DETAIL UD: ${ud.nama_ud.toUpperCase()}`, 14, 20);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');

                // Get full UD details from udList
                const fullUdInfo = udList.find(u => u._id === ud._id);

                doc.text(`Pemilik: ${fullUdInfo?.nama_pemilik || '-'}`, 14, 28);
                doc.text(`Rekening: ${fullUdInfo?.bank || ''} - ${fullUdInfo?.no_rekening || '-'}`, 14, 33);
                doc.text(`KBLI: ${(fullUdInfo?.kbli || []).join(', ')}`, 14, 38);
                doc.text(`Periode: ${periodeLabel}`, 14, 43);

                doc.setFontSize(8);
                doc.text(printTimestamp, pageWidth - 14, 15, { align: 'right' });

                // Group items by date for this UD
                const udGroupedByDate = {};
                ud.items.forEach(item => {
                    const dateKey = item.tanggal.split('T')[0];
                    if (!udGroupedByDate[dateKey]) udGroupedByDate[dateKey] = [];
                    udGroupedByDate[dateKey].push(item);
                });

                const sortedUdDates = Object.keys(udGroupedByDate).sort((a, b) => new Date(a) - new Date(b));
                const udTableRows = [];

                sortedUdDates.forEach(dateKey => {
                    // Date Header Row
                    udTableRows.push([
                        { content: formatDateShort(dateKey).toUpperCase(), colSpan: 10, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }
                    ]);

                    let dailyJual = 0;
                    let dailyModal = 0;
                    let dailyProfit = 0;

                    udGroupedByDate[dateKey].forEach((item, idx) => {
                        udTableRows.push([
                            idx + 1,
                            formatDateShort(item.tanggal),
                            item.nama_barang || item.barang_id?.nama_barang || '-',
                            item.qty,
                            item.satuan || item.barang_id?.satuan || '-',
                            formatCurrency(item.harga_jual),
                            formatCurrency(item.subtotal_jual),
                            formatCurrency(item.harga_modal),
                            formatCurrency(item.subtotal_modal),
                            formatCurrency(item.keuntungan)
                        ]);
                        dailyJual += item.subtotal_jual;
                        dailyModal += item.subtotal_modal;
                        dailyProfit += item.keuntungan;
                    });

                    // Daily Subtotal Row
                    udTableRows.push([
                        { content: `Subtotal ${formatDateShort(dateKey)}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } },
                        { content: formatCurrency(dailyJual), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
                        '',
                        { content: formatCurrency(dailyModal), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
                        { content: formatCurrency(dailyProfit), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }
                    ]);
                });

                autoTable(doc, {
                    startY: 50,
                    head: [['No', 'Tanggal', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual Suplier', 'Total Jual Suplier', 'Harga Modal Suplier', 'Total Modal Suplier', 'Keuntungan']],
                    body: udTableRows,
                    theme: 'grid',
                    styles: { fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], halign: 'center', valign: 'middle' },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center' },
                        1: { cellWidth: 20 },
                        3: { cellWidth: 12, halign: 'center' },
                        4: { cellWidth: 20, halign: 'center' },
                        5: { halign: 'right' },
                        6: { halign: 'right' },
                        7: { halign: 'right' },
                        8: { halign: 'right' },
                        9: { halign: 'right' },
                    },
                    foot: [[
                        { content: 'GRAND TOTAL UD', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: formatCurrency(ud.totalJual), styles: { fontStyle: 'bold' } },
                        '',
                        { content: formatCurrency(ud.totalModal), styles: { fontStyle: 'bold' } },
                        { content: formatCurrency(ud.totalKeuntungan), styles: { fontStyle: 'bold' } }
                    ]],
                    footStyles: { fillColor: [226, 232, 240], textColor: [0, 0, 0] }
                });
            });

            doc.save(fileName);
            toast.success('Laporan PDF Rekap berhasil dibuat');
        } catch (error) {
            toast.error('Gagal membuat laporan PDF');
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const generateRekapHarianPDF = () => {
        if (transactions.length === 0) {
            toast.warning('Tidak ada data untuk dibuat laporan');
            return;
        }

        setGenerating(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4'); // Change to Portrait orientation
            const pageWidth = doc.internal.pageSize.getWidth();

            // Find selected period info
            const period = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;
            const periodName = period ? period.nama_periode : 'Semua Periode';
            const periodRange = period ? `${formatDateShort(period.tanggal_mulai)} - ${formatDateShort(period.tanggal_selesai)}` : '';
            const selectedDapur = filterDapur ? dapurList.find(d => d._id === filterDapur) : null;
            const printTimestamp = new Date().toLocaleString('id-ID');

            // Filename logic
            const periodClean = periodName.replace(/\s+/g, '_');
            const dapurName = selectedDapur ? selectedDapur.nama_dapur.replace(/\s+/g, '_') : '';
            const timestamp = formatDateFilename();

            let fileNamePrefix = 'Rekap_Data_Penjualan';
            let fileNameSuffix = '';

            if (dapurName) {
                if (dapurName) fileNameSuffix += `_Dapur_${dapurName}`;
            }

            const fileName = `${fileNamePrefix}${fileNameSuffix}_${periodClean}_${timestamp}.pdf`;

            // Header Section
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('LAPORAN DATA PENJUALAN', pageWidth / 2, 12, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Laporan Periode: ${periodName}`, 14, 22);
            let currentY = 27;
            if (periodRange) {
                doc.text(`Rentang Waktu: ${periodRange}`, 14, currentY);
                currentY += 5;
            }
            if (selectedDapur) {
                doc.text(`Dapur: ${selectedDapur.nama_dapur}`, 14, currentY);
                currentY += 5;
            }
            doc.text(`Dicetak pada: ${printTimestamp}`, 14, currentY);

            // Create lookup maps for enrichment
            const barangMap = new Map(barangList.map(b => [b._id, b]));
            const udLookupMap = new Map(udList.map(u => [u._id, u]));

            // Group by date
            const groupedByDate = {};
            transactions.forEach(trx => {
                const dateKey = toLocalDate(trx.tanggal);
                if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];

                trx.items?.forEach(item => {
                    const bId = item.barang_id?._id || item.barang_id;
                    const uId = item.ud_id?._id || item.ud_id;
                    const barang = barangMap.get(bId);
                    const ud = udLookupMap.get(uId);

                    groupedByDate[dateKey].push({
                        ...item,
                        nama_barang: item.nama_barang || barang?.nama_barang || item.barang_id?.nama_barang,
                        satuan: item.satuan || barang?.satuan || item.barang_id?.satuan,
                        ud_id_key: uId || 'unknown'
                    });
                });
            });

            const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));

            let grandTotalJual = 0;
            let grandTotalModal = 0;
            let grandTotalUntung = 0;

            const allTableRows = [];

            sortedDates.forEach((dateKey) => {
                const dayItems = groupedByDate[dateKey];

                // Sort dayItems by UD to group them for numbering reset
                dayItems.sort((a, b) => a.ud_id_key.localeCompare(b.ud_id_key));

                // Date Header Row
                allTableRows.push([
                    { content: formatIndoDate(dateKey), colSpan: 9, styles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } }
                ]);

                let lastUdId = null;
                let currentNo = 0;
                let dailyJual = 0;
                let dailyModal = 0;
                let dailyUntung = 0;

                dayItems.forEach((item) => {
                    if (item.ud_id_key !== lastUdId) {
                        currentNo = 1;
                        lastUdId = item.ud_id_key;
                    } else {
                        currentNo++;
                    }

                    allTableRows.push([
                        currentNo,
                        item.nama_barang,
                        item.qty,
                        item.satuan,
                        formatCurrency(item.harga_jual),
                        formatCurrency(item.subtotal_jual),
                        formatCurrency(item.harga_modal),
                        formatCurrency(item.subtotal_modal),
                        formatCurrency(item.keuntungan)
                    ]);

                    dailyJual += (item.subtotal_jual || 0);
                    dailyModal += (item.subtotal_modal || 0);
                    dailyUntung += (item.keuntungan || 0);
                });

                grandTotalJual += dailyJual;
                grandTotalModal += dailyModal;
                grandTotalUntung += dailyUntung;

                // Daily Total Row
                allTableRows.push([
                    { content: 'TOTAL HARGA', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } },
                    { content: formatCurrency(dailyJual), styles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } },
                    { content: '', styles: { lineWidth: 0.1, lineColor: [0, 0, 0] } },
                    { content: formatCurrency(dailyModal), styles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } },
                    { content: formatCurrency(dailyUntung), styles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } }
                ]);
            });

            // Grand Total Row
            allTableRows.push([
                { content: 'TOTAL KESELURUHAN', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } },
                { content: formatCurrency(grandTotalJual), styles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } },
                { content: '', styles: { lineWidth: 0.1, lineColor: [0, 0, 0] } },
                { content: formatCurrency(grandTotalModal), styles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } },
                { content: formatCurrency(grandTotalUntung), styles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] } }
            ]);

            autoTable(doc, {
                startY: periodRange ? 40 : 35,
                head: [
                    ['No', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual Suplier', 'Total Jual Suplier', 'Harga Modal Suplier', 'Total Modal Suplier', 'Keuntungan']
                ],
                body: allTableRows,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 7, halign: 'center' },
                    2: { cellWidth: 10, halign: 'center' },
                    3: { cellWidth: 20, halign: 'center' },
                    4: { cellWidth: 20, halign: 'right' },
                    5: { cellWidth: 25, halign: 'right' },
                    6: { cellWidth: 20, halign: 'right' },
                    7: { cellWidth: 25, halign: 'right' },
                    8: { cellWidth: 20, halign: 'right' },
                },
                margin: { top: 15, bottom: 15 },
                tableLineColor: [0, 0, 0],
                tableLineWidth: 0.1,
            });

            doc.save(fileName);
            toast.success('Laporan PDF Periode berhasil dibuat');
        } catch (error) {
            toast.error('Gagal membuat laporan PDF');
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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-4 md:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Pilih Periode
                        </label>
                        <SearchableSelect
                            value={filterPeriode}
                            onChange={(e) => setFilterPeriode(e.target.value)}
                            options={[
                                { value: '', label: 'Semua Periode' },
                                ...periodeList.map(p => ({
                                    value: p._id,
                                    label: `${p.nama_periode} (${formatDateShort(p.tanggal_mulai)} - ${formatDateShort(p.tanggal_selesai)})`
                                }))
                            ]}
                            placeholder="Semua Periode"
                            searchPlaceholder="Cari periode..."
                        />
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                            <ChefHat className="w-4 h-4 text-gray-400" />
                            Filter Dapur (Opsional)
                        </label>
                        <SearchableSelect
                            value={filterDapur}
                            onChange={(e) => setFilterDapur(e.target.value)}
                            options={[
                                { value: '', label: 'Semua Dapur' },
                                ...dapurList.map(d => ({
                                    value: d._id,
                                    label: d.nama_dapur
                                }))
                            ]}
                            placeholder="Semua Dapur"
                            searchPlaceholder="Cari dapur..."
                        />
                    </div>



                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-widest">Total Transaksi</p>
                        <p className="text-xl md:text-2xl font-black text-gray-900 mt-1">{transactions.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-widest">Total Penjualan</p>
                        <p className="text-xl md:text-2xl font-black text-blue-600 mt-1">{formatCurrency(totalJual)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-widest">Total Keuntungan</p>
                        <p className="text-xl md:text-2xl font-black text-green-600 mt-1">{formatCurrency(totalKeuntungan)}</p>
                    </div>
                </div>
            )}

            {/* Data per UD */}
            {itemsByUD.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">Data per UD</h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{itemsByUD.length} Unit</span>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">UD</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Jumlah Item</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Penjualan</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Modal</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Keuntungan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {itemsByUD.map((ud) => (
                                    <tr key={ud._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{ud.nama_ud}</p>
                                            <p className="text-xs text-gray-500 font-medium">{ud.kode_ud}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-600">{ud.items.length}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(ud.totalJual)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(ud.totalModal)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(ud.totalKeuntungan)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50/80 font-black">
                                <tr>
                                    <td className="px-6 py-4 text-right uppercase text-sm" colSpan={4}>TOTAL KEUNTUNGAN PERIODE INI</td>
                                    <td className="px-6 py-4 text-right text-lg text-green-700">{formatCurrency(totalKeuntungan)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden p-4 space-y-4 divide-y divide-gray-100 print:hidden">
                        {itemsByUD.map((ud) => (
                            <div key={`mobile-ud-${ud._id}`} className="pt-4 first:pt-0 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-black text-gray-900 uppercase tracking-tight">{ud.nama_ud}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ud.kode_ud}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg">{ud.items.length} Item</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Jual</p>
                                        <p className="text-sm font-black text-gray-900">{formatCurrency(ud.totalJual)}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                                        <p className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest mb-1">Untung</p>
                                        <p className="text-sm font-black text-green-700">{formatCurrency(ud.totalKeuntungan)}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] px-2">
                                    <span className="font-bold text-gray-400 uppercase">Total Modal</span>
                                    <span className="font-bold text-gray-600">{formatCurrency(ud.totalModal)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Generate Actions */}
            {transactions.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Download className="w-4 h-4 text-gray-400" />
                        Generate Laporan
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={generateExcel}
                            disabled={generating}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-lg shadow-green-500/20
                       hover:bg-green-700 transition-all disabled:opacity-50 text-sm"
                        >
                            {generating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-5 h-5" />
                            )}
                            Excel Report
                        </button>
                        <button
                            onClick={generateRekapPDF}
                            disabled={generating}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl font-medium shadow-lg shadow-slate-500/20
                       hover:bg-slate-800 transition-all disabled:opacity-50 text-sm"
                        >
                            {generating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <FileText className="w-5 h-5" />
                            )}
                            Rekap PDF
                        </button>
                        <button
                            onClick={generateRekapHarianPDF}
                            disabled={generating}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20
                       hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
                        >
                            {generating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                            Rekap Data Penjualan
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
