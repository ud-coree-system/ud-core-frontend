import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { STYLES } from './styles';
import { applyRowStyle, setCurrency, formatIndoDate, formatDateShort, toLocalDate } from './helpers';

export const exportLaporanExcel = async ({
    transactions,
    itemsByDate,
    dapurName,
    periodName,
    periodRange,
    selectedDate,
    udList = [],
    barangList = [],
    fileName = 'laporan-pesanan-dapur.xlsx'
}) => {
    const wb = new ExcelJS.Workbook();
    const ws1 = wb.addWorksheet('DATA PESANAN');

    // Column widths
    ws1.columns = [
        { width: 6 },  // No
        { width: 40 }, // Nama Barang
        { width: 10 }, // Qty
        { width: 12 }, // Satuan
        { width: 18 }, // Harga Jual
        { width: 22 }, // Total Jual
    ];

    // --- Title & Narrative ---
    ws1.mergeCells('A1:F1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = 'LAPORAN DATA PESANAN DAPUR';
    applyRowStyle(ws1.getRow(1), STYLES.title);
    ws1.getRow(1).height = 30;

    ws1.addRow([`DAPUR: ${dapurName?.toUpperCase() || '-'}`]).font = { bold: true };
    ws1.addRow([`PERIODE: ${periodName?.toUpperCase() || '-'} ${periodRange || ''}`]).font = { bold: true };

    if (selectedDate) {
        ws1.addRow([`TANGGAL: ${selectedDate}`]).font = { bold: true };
    } else {
        ws1.addRow([]);
    }

    ws1.addRow([]);

    // Iterate through itemsByDate
    itemsByDate.forEach(group => {
        // Date Header
        const dateRow = ws1.addRow([formatIndoDate(group.tanggal).toUpperCase()]);
        ws1.mergeCells(`A${dateRow.number}:F${dateRow.number}`);
        applyRowStyle(dateRow, STYLES.dateTitle);
        dateRow.height = 20;

        let currentUd = null;
        let udCounter = 0;

        // Table Header
        const headerRow = ws1.addRow(['No', 'Nama Barang', 'Qty', 'Satuan', 'Harga Jual Suplier', 'Total Harga']);
        applyRowStyle(headerRow, STYLES.header);

        group.items.forEach((item) => {
            if (item.nama_ud !== currentUd) {
                currentUd = item.nama_ud;
                udCounter = 0;
            }
            udCounter++;

            const row = ws1.addRow([
                udCounter,
                item.nama_barang,
                item.qty,
                item.satuan,
                item.harga_jual,
                item.subtotal_jual,
            ]);

            applyRowStyle(row, STYLES.normalRow);
            [5, 6].forEach(col => setCurrency(row.getCell(col)));
        });

        // Date Total
        const dailyTotal = group.items.reduce((sum, i) => sum + i.subtotal_jual, 0);
        const totalDateRow = ws1.addRow([`TOTAL ${formatDateShort(group.tanggal).toUpperCase()}`, '', '', '', '', dailyTotal]);
        ws1.mergeCells(`A${totalDateRow.number}:E${totalDateRow.number}`);
        applyRowStyle(totalDateRow, STYLES.totalRow);
        setCurrency(totalDateRow.getCell(6));

        ws1.addRow([]); // Gap between dates
    });

    const totalJualAll = transactions.reduce((sum, trx) => sum + (trx.items?.reduce((s, i) => s + i.subtotal_jual, 0) || 0), 0);

    // Final Recap
    ws1.addRow([]);
    const rowFinalJual = ws1.addRow(['', '', '', '', 'GRAND TOTAL', totalJualAll]);

    // Apply styles to the last two cells only as a "table"
    const celllabel = rowFinalJual.getCell(5);
    const cellValue = rowFinalJual.getCell(6);

    [celllabel, cellValue].forEach(cell => {
        cell.font = { bold: true };
        cell.border = STYLES.header.border;
    });

    celllabel.fill = STYLES.header.fill;
    celllabel.alignment = { horizontal: 'center' };

    setCurrency(cellValue);
    cellValue.alignment = { horizontal: 'right' };

    // Write and save
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};
