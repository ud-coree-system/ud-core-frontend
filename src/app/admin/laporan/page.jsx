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
import { transaksiAPI, periodeAPI, dapurAPI, udAPI, barangAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort, toDateInputValue } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as XLSX_STYLE from 'xlsx-js-style';

export default function LaporanPage() {
    const { toast } = useToast();

    // Options
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);
    const [udList, setUdList] = useState([]);
    const [barangList, setBarangList] = useState([]);

    // Filters
    const [filterPeriode, setFilterPeriode] = useState('');

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

    const getItemsByUD = () => {
        const barangMap = new Map(barangList.map(b => [b._id, b]));
        const udMap = {}; // We need a fresh map for grouping results, the udList map is for lookup

        const udLookupMap = new Map(udList.map(u => [u._id, u]));

        transactions.forEach((trx) => {
            trx.items?.forEach((item) => {
                const bId = item.barang_id?._id || item.barang_id;
                const uId = item.ud_id?._id || item.ud_id;

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
    const generateExcel = () => {
        const itemsByUD = getItemsByUD();
        if (transactions.length === 0) {
            toast.warning('Tidak ada data untuk dibuat laporan');
            return;
        }

        setGenerating(true);
        try {
            const wb = XLSX_STYLE.utils.book_new();

            // Find selected period info
            const period = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;
            const periodName = period ? period.nama_periode : 'Semua Periode';
            const periodRange = period ? `(${formatDateShort(period.tanggal_mulai)} - ${formatDateShort(period.tanggal_selesai)})` : '';
            const periodeLabel = `${periodName.toUpperCase()} ${periodRange}`;

            // Calculate global totals
            const totalJualAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.subtotal_jual, 0) || 0), 0);
            const totalModalAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.subtotal_modal, 0) || 0), 0);
            const totalUntungAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.keuntungan, 0) || 0), 0);

            // --- Sheet 1: DATA PESANAN (Styled) ---
            const allOrdersAOA = [
                [`DATA PENJUALAN ${periodeLabel}`],
                [''],
                ['RINGKASAN PERIODE'],
                ['Total Penjualan', totalJualAll],
                ['Total Modal', totalModalAll],
                ['Total Keuntungan', totalUntungAll],
                [''],
                ['----------------------------------------------------------------------------------------------------------------']
            ];

            // Group by date THEN by UD for strict clustering
            const groupedData = {};
            transactions.forEach(trx => {
                const dateKey = trx.tanggal.split('T')[0];
                if (!groupedData[dateKey]) groupedData[dateKey] = { tanggal: dateKey, uds: {} };

                trx.items?.forEach(item => {
                    const bId = item.barang_id?._id || item.barang_id;
                    const uId = item.ud_id?._id || item.ud_id;
                    const barang = barangList.find(b => b._id === bId);
                    const ud = udList.find(u => u._id === uId);

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

            // Sort dates descending
            const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a));

            sortedDates.forEach(dateKey => {
                const dayData = groupedData[dateKey];
                const udGroups = dayData.uds;

                // Calculate date totals
                let dateJual = 0;
                let dateModal = 0;
                let dateProfit = 0;
                Object.values(udGroups).forEach(g => {
                    g.items.forEach(i => {
                        dateJual += i.subtotal_jual;
                        dateModal += i.subtotal_modal;
                        dateProfit += i.keuntungan;
                    });
                });

                // Date Summary Header (Styled)
                allOrdersAOA.push(['']);
                allOrdersAOA.push([formatIndoDate(dateKey).toUpperCase()]);
                allOrdersAOA.push([`Penjualan: `, dateJual]);
                allOrdersAOA.push([`Modal: `, dateModal]);
                allOrdersAOA.push([`Keuntungan: `, dateProfit]);

                // Table Header
                allOrdersAOA.push(['No', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual', 'Total Jual', 'Harga Modal', 'Total Modal', 'Keuntungan']);

                const sortedUdIds = Object.keys(udGroups).sort((a, b) => udGroups[a].nama_ud.localeCompare(udGroups[b].nama_ud));

                sortedUdIds.forEach(udId => {
                    const group = udGroups[udId];
                    allOrdersAOA.push([group.nama_ud.toUpperCase()]); // UD cluster header

                    let udJual = 0;
                    let udModal = 0;
                    let udProfit = 0;

                    group.items.forEach((item, idx) => {
                        allOrdersAOA.push([
                            idx + 1,
                            item.nama_barang || item.barang_id?.nama_barang || '-',
                            item.qty,
                            item.satuan || item.barang_id?.satuan || '-',
                            item.harga_jual,
                            item.subtotal_jual,
                            item.harga_modal,
                            item.subtotal_modal,
                            item.keuntungan
                        ]);
                        udJual += item.subtotal_jual;
                        udModal += item.subtotal_modal;
                        udProfit += item.keuntungan;
                    });

                    // UD Subtotal
                    allOrdersAOA.push([`Subtotal ${group.nama_ud}`, '', '', '', '', udJual, '', udModal, udProfit]);
                });

                // Date Footer Row
                allOrdersAOA.push([`TOTAL ${formatDateShort(dateKey)}`, '', '', '', '', dateJual, '', dateModal, dateProfit]);
                allOrdersAOA.push(['----------------------------------------------------------------------------------------------------------------']);
            });

            // Final Recap Block
            allOrdersAOA.push(['']);
            allOrdersAOA.push(['GRAND TOTAL KESELURUHAN']);
            allOrdersAOA.push(['Rekapitulasi seluruh periode yang dipilih']);
            allOrdersAOA.push(['Total Penjualan', totalJualAll]);
            allOrdersAOA.push(['Total Modal', totalModalAll]);
            allOrdersAOA.push(['Total Keuntungan', totalUntungAll]);

            const ws1 = XLSX_STYLE.utils.aoa_to_sheet(allOrdersAOA);

            // --- Merge & Styling DATA PESANAN ---
            ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
            ws1['!cols'] = [
                { wch: 30 }, { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 15 }
            ];

            // Apply global alignment and title style
            Object.keys(ws1).forEach(key => {
                if (!key.startsWith('!')) {
                    if (!ws1[key].s) ws1[key].s = {};
                    ws1[key].s.alignment = { vertical: 'center' };

                    const row = parseInt(key.replace(/[A-Z]/g, '')) - 1;
                    if (row === 0) { // Title
                        ws1[key].s.font = { bold: true, sz: 14 };
                        ws1[key].s.alignment.horizontal = 'center';
                    }
                }
            });

            XLSX_STYLE.utils.book_append_sheet(wb, ws1, 'DATA PESANAN');

            // --- Sheets per UD (Styled) ---
            itemsByUD.forEach((ud) => {
                const udAOA = [
                    [`NOTE : ${ud.nama_ud.toUpperCase()}`],
                    [`AN. ${ud.items[0]?.ud_id?.nama_pemilik || '-'}`],
                    [`NO REK ${ud.items[0]?.ud_id?.bank || ''} : ${ud.items[0]?.ud_id?.no_rekening || '-'}`],
                    [''],
                    [`KBLI MELIPUTI : ${(ud.items[0]?.ud_id?.kbli || []).join(', ')}`],
                    [''],
                    ['No.', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual Suplier', 'Total Harga Jual Suplier', 'Harga Modal Suplier', 'Jumlah Modal Suplier', 'Keuntungan']
                ];

                ud.items.forEach((item, idx) => {
                    udAOA.push([
                        idx + 1,
                        item.nama_barang || item.barang_id?.nama_barang || '-',
                        item.qty,
                        item.satuan || item.barang_id?.satuan || '-',
                        item.harga_jual,
                        item.subtotal_jual,
                        item.harga_modal,
                        item.subtotal_modal,
                        item.keuntungan
                    ]);
                });

                udAOA.push([
                    '', 'TOTAL', '', '', '', ud.totalJual, '', ud.totalModal, ud.totalKeuntungan
                ]);

                const wsUD = XLSX_STYLE.utils.aoa_to_sheet(udAOA);
                wsUD['!cols'] = [
                    { wch: 5 }, { wch: 35 }, { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 15 }
                ];

                wsUD['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];

                Object.keys(wsUD).forEach(key => {
                    if (!key.startsWith('!')) {
                        if (!wsUD[key].s) wsUD[key].s = {};
                        wsUD[key].s.alignment = { vertical: 'center' };
                    }
                });

                let sheetName = `LAP. UD. ${ud.nama_ud}`.substring(0, 31).replace(/[\[\]\*\?\/\\]/g, '');
                XLSX_STYLE.utils.book_append_sheet(wb, wsUD, sheetName);
            });

            // Save using styles
            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = `Laporan_Penjualan_${periodName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
            XLSX_STYLE.writeFile(wb, fileName);
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

            // Find selected period info
            const period = filterPeriode ? periodeList.find(p => p._id === filterPeriode) : null;
            const periodName = period ? period.nama_periode : 'Semua Periode';
            const periodRange = period ? `(${formatDateShort(period.tanggal_mulai)} - ${formatDateShort(period.tanggal_selesai)})` : '';
            const periodeLabel = `${periodName.toUpperCase()} ${periodRange}`;
            const printTimestamp = `Dicetak pada: ${new Date().toLocaleString('id-ID')}`;

            // Header
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
                styles: { fontSize: 10, fontStyle: 'bold' },
                headStyles: { fillColor: [71, 85, 105] },
            });

            // Create lookup maps for enrichment
            const barangMap = new Map(barangList.map(b => [b._id, b]));
            const udLookupMap = new Map(udList.map(u => [u._id, u]));

            // Group by date THEN by UD
            const groupedData = {};
            transactions.forEach(trx => {
                const dateKey = trx.tanggal.split('T')[0];
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

            const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a));
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
            if (currentY > 200) {
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
                styles: { fontSize: 12, fontStyle: 'bold' },
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

                const sortedUdDates = Object.keys(udGroupedByDate).sort((a, b) => new Date(b) - new Date(a));
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
                    head: [['No', 'Tanggal', 'Nama Barang', 'Qty', 'Sat', 'Hrg Jual', 'Tot Jual', 'Hrg Modal', 'Tot Modal', 'Untung']],
                    body: udTableRows,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [30, 41, 59] },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center' },
                        1: { cellWidth: 20 },
                        3: { cellWidth: 12, halign: 'center' },
                        4: { cellWidth: 12, halign: 'center' },
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

            const timestamp = new Date().toISOString().split('T')[0];
            doc.save(`Laporan_Rekap_${periodName.replace(/\s+/g, '_')}_${timestamp}.pdf`);
            toast.success('Laporan PDF Rekap berhasil dibuat');
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Filter Data</h3>
                {/* Periode */}
                <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                    <select
                        value={filterPeriode}
                        onChange={(e) => setFilterPeriode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                        <option value="">Semua Periode</option>
                        {periodeList.map((p) => (
                            <option key={p._id} value={p._id}>
                                {p.nama_periode} ({formatDateShort(p.tanggal_mulai)} - {formatDateShort(p.tanggal_selesai)})
                            </option>
                        ))}
                    </select>
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
                                    <th className="text-right px-4 py-3">Total Jual</th>
                                    <th className="text-right px-4 py-3">Total Modal</th>
                                    <th className="text-right px-4 py-3">Total Untung</th>
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
                                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(ud.totalModal)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(ud.totalKeuntungan)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td className="px-4 py-3 text-right" colSpan={4}>TOTAL KEUNTUNGAN PERIODE INI</td>
                                    <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totalKeuntungan)}</td>
                                </tr>
                            </tfoot>
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
                        <button
                            onClick={generateRekapPDF}
                            disabled={generating}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg
                       hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            {generating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <FileText className="w-5 h-5" />
                            )}
                            Generate Rekap PDF
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
