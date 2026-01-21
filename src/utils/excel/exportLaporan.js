import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { STYLES } from './styles';
import { applyRowStyle, setCurrency, formatIndoDate, formatDateShort, toLocalDate } from './helpers';

export const exportLaporanExcel = async ({
    transactions,
    itemsByUD,
    periodeLabel,
    totalJualAll,
    totalModalAll,
    totalUntungAll,
    barangList = [],
    udList = [],
    fileName = 'laporan-penjualan.xlsx'
}) => {
    const wb = new ExcelJS.Workbook();

    // --- Sheet 1: DATA PESANAN ---
    const ws1 = wb.addWorksheet('DATA PESANAN');

    // Column widths
    ws1.columns = [
        { width: 6 },  // No
        { width: 35 }, // Nama Barang
        { width: 8 },  // Qty
        { width: 10 }, // Satuan
        { width: 16 }, // Harga Jual
        { width: 18 }, // Total Jual
        { width: 16 }, // Harga Modal
        { width: 18 }, // Total Modal
        { width: 15 }  // Keuntungan
    ];

    // Title
    ws1.mergeCells('A1:I1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = `DATA PENJUALAN ${periodeLabel}`;
    applyRowStyle(ws1.getRow(1), STYLES.title);
    ws1.getRow(1).height = 30;

    ws1.addRow([]); // Blank row

    ws1.addRow([]);

    // Grouping logic (re-implemented from page.jsx for decoupling)
    const groupedData = {};
    const barangMap = new Map(barangList.map(b => [b._id, b]));
    const udLookupMap = new Map(udList.map(u => [u._id, u]));

    transactions.forEach(trx => {
        const dateKey = toLocalDate(trx.tanggal);
        if (!groupedData[dateKey]) groupedData[dateKey] = { tanggal: dateKey, uds: {} };

        trx.items?.forEach(item => {
            const bId = item.barang_id?._id || item.barang_id;
            const uId = item.ud_id?._id || item.ud_id;
            const barang = barangMap.get(bId);
            const ud = udLookupMap.get(uId);

            const udName = ud?.nama_ud || item.ud_id?.nama_ud || 'Unknown UD';
            const udIdKey = uId || 'unknown';

            if (!groupedData[dateKey].uds[udIdKey]) {
                groupedData[dateKey].uds[udIdKey] = {
                    nama_ud: udName,
                    items: []
                };
            }

            const enrichedItem = {
                ...item,
                nama_barang: item.nama_barang || barang?.nama_barang || item.barang_id?.nama_barang || '-',
                satuan: item.satuan || barang?.satuan || item.barang_id?.satuan || '-',
            };

            groupedData[dateKey].uds[udIdKey].items.push(enrichedItem);
        });
    });

    const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(dateKey => {
        const dayData = groupedData[dateKey];
        const udGroups = dayData.uds;

        // Date Header
        const dateRow = ws1.addRow([formatIndoDate(dateKey).toUpperCase()]);
        ws1.mergeCells(`A${dateRow.number}:I${dateRow.number}`);
        applyRowStyle(dateRow, STYLES.dateTitle);
        dateRow.height = 20;

        // Table Header
        const headerRow = ws1.addRow(['No', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual', 'Total Jual', 'Harga Modal', 'Total Modal', 'Keuntungan']);
        applyRowStyle(headerRow, STYLES.header);

        const sortedUdIds = Object.keys(udGroups).sort((a, b) => udGroups[a].nama_ud.localeCompare(udGroups[b].nama_ud));

        let dateJual = 0;
        let dateModal = 0;
        let dateProfit = 0;

        sortedUdIds.forEach(udId => {
            const group = udGroups[udId];
            const udHeaderRow = ws1.addRow([group.nama_ud.toUpperCase()]);
            ws1.mergeCells(`A${udHeaderRow.number}:I${udHeaderRow.number}`);
            applyRowStyle(udHeaderRow, STYLES.udHeader);

            let udJual = 0;
            let udModal = 0;
            let udProfit = 0;

            group.items.forEach((item, idx) => {
                const row = ws1.addRow([
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

                applyRowStyle(row, STYLES.yellowRow);
                [5, 6, 7, 8, 9].forEach(col => setCurrency(row.getCell(col)));

                udJual += item.subtotal_jual;
                udModal += item.subtotal_modal;
                udProfit += item.keuntungan;
            });

            // UD Subtotal
            const subtotalRow = ws1.addRow([`Subtotal ${group.nama_ud}`, '', '', '', '', udJual, '', udModal, udProfit]);
            ws1.mergeCells(`A${subtotalRow.number}:E${subtotalRow.number}`);
            applyRowStyle(subtotalRow, STYLES.subtotalRow);
            [6, 8, 9].forEach(col => setCurrency(subtotalRow.getCell(col)));

            dateJual += udJual;
            dateModal += udModal;
            dateProfit += udProfit;
        });

        // Date Total
        const totalDateRow = ws1.addRow([`TOTAL ${formatDateShort(dateKey)}`, '', '', '', '', dateJual, '', dateModal, dateProfit]);
        ws1.mergeCells(`A${totalDateRow.number}:E${totalDateRow.number}`);
        applyRowStyle(totalDateRow, STYLES.totalRow);
        [6, 8, 9].forEach(col => setCurrency(totalDateRow.getCell(col)));

        ws1.addRow([]); // Gap between dates
    });

    // Final Recap Block for Sheet 1
    ws1.addRow([]);
    ws1.addRow([]);

    const recapHeader = ws1.addRow(['GRAND TOTAL KESELURUHAN']);
    ws1.mergeCells(`A${recapHeader.number}:I${recapHeader.number}`);
    applyRowStyle(recapHeader, STYLES.title);
    recapHeader.height = 25;

    const recapSubHeader = ws1.addRow(['Rekapitulasi seluruh periode yang dipilih']);
    ws1.mergeCells(`A${recapSubHeader.number}:I${recapSubHeader.number}`);
    recapSubHeader.font = { italic: true };
    recapSubHeader.alignment = { horizontal: 'center' };

    ws1.addRow([]);

    // Table Header for Recap
    const recapTableHeader = ws1.addRow(['Keterangan', '', '', '', '', 'Total Nilai (Rp)']);
    ws1.mergeCells(`A${recapTableHeader.number}:E${recapTableHeader.number}`);
    ws1.mergeCells(`F${recapTableHeader.number}:I${recapTableHeader.number}`);
    applyRowStyle(recapTableHeader, STYLES.header);
    recapTableHeader.height = 20;

    // Table Rows
    const rowFinalJual = ws1.addRow(['Total Penjualan Keseluruhan', '', '', '', '', totalJualAll]);
    ws1.mergeCells(`A${rowFinalJual.number}:E${rowFinalJual.number}`);
    ws1.mergeCells(`F${rowFinalJual.number}:I${rowFinalJual.number}`);
    applyRowStyle(rowFinalJual, STYLES.totalRow);
    setCurrency(rowFinalJual.getCell(6));

    const rowFinalModal = ws1.addRow(['Total Modal Keseluruhan', '', '', '', '', totalModalAll]);
    ws1.mergeCells(`A${rowFinalModal.number}:E${rowFinalModal.number}`);
    ws1.mergeCells(`F${rowFinalModal.number}:I${rowFinalModal.number}`);
    applyRowStyle(rowFinalModal, STYLES.totalRow);
    setCurrency(rowFinalModal.getCell(6));

    const rowFinalUntung = ws1.addRow(['Total Keuntungan Keseluruhan', '', '', '', '', totalUntungAll]);
    ws1.mergeCells(`A${rowFinalUntung.number}:E${rowFinalUntung.number}`);
    ws1.mergeCells(`F${rowFinalUntung.number}:I${rowFinalUntung.number}`);
    applyRowStyle(rowFinalUntung, STYLES.totalRow);
    rowFinalUntung.getCell(1).font = { bold: true, color: { argb: 'FF0070C0' } };
    rowFinalUntung.getCell(6).font = { bold: true, color: { argb: 'FF00B050' } }; // Green for profit
    setCurrency(rowFinalUntung.getCell(6));

    // --- Sheets per UD ---
    itemsByUD.forEach((ud) => {
        const sheetName = `LAP. ${ud.nama_ud}`.substring(0, 31).replace(/[\[\]\*\?\/\\]/g, '');
        const wsUD = wb.addWorksheet(sheetName);

        wsUD.columns = [
            { width: 6 },  // No
            { width: 35 }, // Nama Barang
            { width: 10 }, // Qty
            { width: 10 }, // Satuan
            { width: 20 }, // Harga Jual Suplier
            { width: 22 }, // Total Harga Jual Suplier
            { width: 20 }, // Harga Modal Suplier
            { width: 22 }, // Jumlah Modal Suplier
            { width: 15 }  // Keuntungan
        ];

        // UD Header Info
        const noteRow = wsUD.addRow([`NOTE : ${ud.nama_ud.toUpperCase()}`]);
        wsUD.mergeCells(`A${noteRow.number}:I${noteRow.number}`);
        noteRow.font = { bold: true };

        const anRow = wsUD.addRow([`AN. ${ud.items[0]?.ud_id?.nama_pemilik || '-'}`]);
        wsUD.mergeCells(`A${anRow.number}:I${anRow.number}`);

        const rekRow = wsUD.addRow([`NO REK ${ud.items[0]?.ud_id?.bank || ''} : ${ud.items[0]?.ud_id?.no_rekening || '-'}`]);
        wsUD.mergeCells(`A${rekRow.number}:I${rekRow.number}`);

        wsUD.addRow([]);

        const kbliRow = wsUD.addRow([`KBLI MELIPUTI : ${(ud.items[0]?.ud_id?.kbli || []).join(', ')}`]);
        wsUD.mergeCells(`A${kbliRow.number}:I${kbliRow.number}`);
        kbliRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
        // Estimate height based on content length (roughly)
        const kbliLength = (ud.items[0]?.ud_id?.kbli || []).join(', ').length;
        if (kbliLength > 100) kbliRow.height = 30;
        if (kbliLength > 200) kbliRow.height = 45;

        wsUD.addRow([]);

        // Table Header
        const headerRow = wsUD.addRow(['No.', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual Suplier', 'Total Harga Jual Suplier', 'Harga Modal Suplier', 'Jumlah Modal Suplier', 'Keuntungan']);
        applyRowStyle(headerRow, STYLES.header);
        headerRow.height = 30; // Extra height for wrapped text
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const udGroupedByDate = {};
        ud.items.forEach(item => {
            const dateKey = toLocalDate(item.tanggal);
            if (!udGroupedByDate[dateKey]) udGroupedByDate[dateKey] = [];
            udGroupedByDate[dateKey].push(item);
        });

        const sortedUdDates = Object.keys(udGroupedByDate).sort((a, b) => new Date(a) - new Date(b));

        sortedUdDates.forEach(dateKey => {
            // Date Header Row within UD Sheet
            const dateRow = wsUD.addRow([formatIndoDate(dateKey).toUpperCase()]);
            wsUD.mergeCells(`A${dateRow.number}:I${dateRow.number}`);
            applyRowStyle(dateRow, STYLES.dateTitle);

            let dailyJual = 0;
            let dailyModal = 0;
            let dailyProfit = 0;

            udGroupedByDate[dateKey].forEach((item, idx) => {
                const row = wsUD.addRow([
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
                applyRowStyle(row, STYLES.yellowRow);
                [5, 6, 7, 8, 9].forEach(col => setCurrency(row.getCell(col)));

                dailyJual += item.subtotal_jual;
                dailyModal += item.subtotal_modal;
                dailyProfit += item.keuntungan;
            });

            // Daily Subtotal for this UD
            const subtotalRow = wsUD.addRow([`Subtotal ${formatDateShort(dateKey)}`, '', '', '', '', dailyJual, '', dailyModal, dailyProfit]);
            wsUD.mergeCells(`A${subtotalRow.number}:E${subtotalRow.number}`);
            applyRowStyle(subtotalRow, STYLES.subtotalRow);
            [6, 8, 9].forEach(col => setCurrency(subtotalRow.getCell(col)));

            wsUD.addRow([]); // Small gap after each date group
        });

        // Final Total for UD
        const totalRow = wsUD.addRow(['GRAND TOTAL UD', '', '', '', '', ud.totalJual, '', ud.totalModal, ud.totalKeuntungan]);
        wsUD.mergeCells(`A${totalRow.number}:E${totalRow.number}`);
        applyRowStyle(totalRow, STYLES.totalRow);
        [6, 8, 9].forEach(col => setCurrency(totalRow.getCell(col)));
    });

    // Write and save
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};
