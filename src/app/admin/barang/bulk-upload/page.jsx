'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Upload,
    FileSpreadsheet,
    ArrowLeft,
    Download,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Trash2,
    Eye,
    EyeOff,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { barangAPI, udAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import CurrencyInput from '@/components/ui/CurrencyInput';

const EXPECTED_COLUMNS = ['Nama Barang', 'Satuan', 'Harga Jual', 'Harga Modal', 'NAMA UD'];
const COLUMN_ALIASES = {
    'Nama Barang': ['nama barang', 'nama', 'barang', 'item', 'product'],
    'Satuan': ['satuan', 'unit', 'uom'],
    'Harga Jual': ['harga jual', 'harga jual suplier', 'jual', 'selling price', 'price'],
    'Harga Modal': ['harga modal', 'harga modal suplier', 'modal', 'cost', 'buying price'],
    'NAMA UD': ['nama ud', 'ud', 'unit dagang', 'supplier'],
};

// Helper to normalize column names
const normalizeColumnName = (name) => {
    const normalized = name?.toString().toLowerCase().trim();
    for (const [standard, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.includes(normalized)) {
            return standard;
        }
    }
    return name;
};

export default function BulkUploadPage() {
    const router = useRouter();
    const { toast } = useToast();

    // State
    const [udList, setUdList] = useState([]);
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [validData, setValidData] = useState([]);
    const [invalidData, setInvalidData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
    const [showInvalid, setShowInvalid] = useState(true);
    const [dragActive, setDragActive] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Result modal
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const [uploadResult, setUploadResult] = useState({ success: [], failed: [] });

    useEffect(() => {
        fetchUDList();
    }, []);

    const fetchUDList = async () => {
        try {
            const response = await udAPI.getAll({ limit: 100, isActive: true });
            if (response.data.success) {
                setUdList(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch UD list:', error);
        }
    };

    // Find UD by name (fuzzy match)
    const findUDByName = useCallback((name) => {
        if (!name) return null;
        const normalized = name.toString().toLowerCase().trim();

        // Exact match first
        let found = udList.find(ud =>
            ud.nama_ud.toLowerCase() === normalized
        );
        if (found) return found;

        // Partial match (contains)
        found = udList.find(ud =>
            ud.nama_ud.toLowerCase().includes(normalized) ||
            normalized.includes(ud.nama_ud.toLowerCase())
        );
        if (found) return found;

        // Match by kode_ud
        found = udList.find(ud =>
            ud.kode_ud?.toLowerCase() === normalized
        );
        return found || null;
    }, [udList]);

    // Parse Excel file
    const parseExcelFile = useCallback((fileData) => {
        try {
            setLoading(true);
            const workbook = XLSX.read(fileData, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with header detection
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (rawData.length < 2) {
                toast.error('File Excel harus memiliki minimal 1 baris data');
                return;
            }

            // Find header row (first row with recognizable column names)
            let headerRowIndex = 0;
            for (let i = 0; i < Math.min(5, rawData.length); i++) {
                const row = rawData[i];
                const normalizedRow = row.map(cell => normalizeColumnName(cell));
                if (normalizedRow.includes('Nama Barang') || normalizedRow.some(c =>
                    c?.toString().toLowerCase().includes('barang')
                )) {
                    headerRowIndex = i;
                    break;
                }
            }

            const headers = rawData[headerRowIndex].map(h => normalizeColumnName(h));
            const dataRows = rawData.slice(headerRowIndex + 1);

            // Map columns
            const colIndex = {
                namaBarang: headers.indexOf('Nama Barang'),
                satuan: headers.indexOf('Satuan'),
                hargaJual: headers.indexOf('Harga Jual'),
                hargaModal: headers.indexOf('Harga Modal'),
                namaUD: headers.indexOf('NAMA UD'),
            };

            // Parse each row
            const parsed = [];
            const valid = [];
            const invalid = [];

            dataRows.forEach((row, index) => {
                // Skip empty rows
                if (!row || row.every(cell => !cell)) return;

                const namaBarang = row[colIndex.namaBarang]?.toString().trim() || '';
                const satuan = row[colIndex.satuan]?.toString().trim().toLowerCase() || 'pcs';
                const hargaJualRaw = row[colIndex.hargaJual];
                const hargaModalRaw = row[colIndex.hargaModal];
                const namaUD = row[colIndex.namaUD]?.toString().trim() || '';

                // Parse prices (handle various formats)
                const hargaJual = parseFloat(String(hargaJualRaw).replace(/[^0-9.-]/g, '')) || 0;
                const hargaModal = parseFloat(String(hargaModalRaw).replace(/[^0-9.-]/g, '')) || 0;

                // Find UD
                const foundUD = findUDByName(namaUD);

                // Validation
                const errors = [];
                if (!namaBarang) errors.push('Nama barang kosong');
                if (hargaJual <= 0) errors.push('Harga jual tidak valid');
                if (!namaUD) errors.push('Nama UD kosong');
                if (!foundUD && namaUD) errors.push(`UD "${namaUD}" tidak ditemukan`);

                const item = {
                    rowIndex: index + headerRowIndex + 2, // 1-based + header offset
                    namaBarang,
                    satuan,
                    hargaJual,
                    hargaModal,
                    namaUD,
                    ud: foundUD,
                    errors,
                    isValid: errors.length === 0,
                };

                parsed.push(item);
                if (item.isValid) {
                    valid.push(item);
                } else {
                    invalid.push(item);
                }
            });

            setParsedData(parsed);
            setValidData(valid);
            setInvalidData(invalid);

            if (valid.length === 0) {
                toast.warning('Tidak ada data valid yang bisa diupload');
            } else {
                toast.success(`Berhasil membaca ${valid.length} data valid dari ${parsed.length} total baris`);
            }

        } catch (error) {
            console.error('Parse error:', error);
            toast.error('Gagal membaca file Excel: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [findUDByName, toast]);

    // Handle file selection
    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const processFile = (selectedFile) => {
        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.xlsx?$/i)) {
            toast.error('File harus berformat Excel (.xlsx atau .xls)');
            return;
        }

        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            parseExcelFile(e.target.result);
        };
        reader.onerror = () => {
            toast.error('Gagal membaca file');
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    // Drag & drop handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files?.[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    // Download template
    const downloadTemplate = () => {
        const templateData = [
            ['No.', 'Nama Barang', 'Satuan', 'Harga Jual', 'Harga Modal', 'NAMA UD'],
            [1, 'Contoh Barang 1', 'kg', 50000, 45000, 'UD ASM'],
            [2, 'Contoh Barang 2', 'pcs', 25000, 20000, 'UD PPM'],
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'template_bulk_upload_barang.xlsx');
    };

    // Remove item from list
    const removeItem = (rowIndex) => {
        setParsedData(prev => prev.filter(item => item.rowIndex !== rowIndex));
        setValidData(prev => prev.filter(item => item.rowIndex !== rowIndex));
        setInvalidData(prev => prev.filter(item => item.rowIndex !== rowIndex));
    };

    // Update item (inline edit)
    const updateItem = (rowIndex, field, value) => {
        const updateAndRevalidate = (items) => {
            return items.map(item => {
                if (item.rowIndex !== rowIndex) return item;

                // Update the field
                const updated = { ...item };

                if (field === 'namaBarang') {
                    updated.namaBarang = value;
                } else if (field === 'satuan') {
                    updated.satuan = value.toLowerCase();
                } else if (field === 'hargaJual') {
                    updated.hargaJual = parseFloat(value) || 0;
                } else if (field === 'hargaModal') {
                    updated.hargaModal = parseFloat(value) || 0;
                } else if (field === 'ud_id') {
                    const foundUD = udList.find(ud => ud._id === value);
                    updated.ud = foundUD || null;
                    updated.namaUD = foundUD?.nama_ud || '';
                }

                // Re-validate
                const errors = [];
                if (!updated.namaBarang) errors.push('Nama barang kosong');
                if (updated.hargaJual <= 0) errors.push('Harga jual tidak valid');
                if (!updated.ud) errors.push('UD tidak dipilih');

                updated.errors = errors;
                updated.isValid = errors.length === 0;

                return updated;
            });
        };

        const newParsedData = updateAndRevalidate(parsedData);
        setParsedData(newParsedData);

        // Recalculate valid and invalid
        setValidData(newParsedData.filter(item => item.isValid));
        setInvalidData(newParsedData.filter(item => !item.isValid));
    };

    // Clear all data
    const clearData = () => {
        setFile(null);
        setParsedData([]);
        setValidData([]);
        setInvalidData([]);
    };

    // Upload data
    const handleUpload = async () => {
        if (validData.length === 0) {
            toast.warning('Tidak ada data valid untuk diupload');
            return;
        }

        setUploading(true);
        setUploadProgress({ current: 0, total: validData.length, success: 0, failed: 0 });

        const successItems = [];
        const failedItems = [];

        for (let i = 0; i < validData.length; i++) {
            const item = validData[i];
            setUploadProgress(prev => ({ ...prev, current: i + 1 }));

            try {
                const payload = {
                    nama_barang: item.namaBarang,
                    satuan: item.satuan,
                    harga_jual: item.hargaJual,
                    harga_modal: item.hargaModal,
                    ud_id: item.ud._id,
                    isActive: true,
                };

                await barangAPI.create(payload);
                successItems.push(item);
                setUploadProgress(prev => ({ ...prev, success: prev.success + 1 }));

            } catch (error) {
                failedItems.push({
                    ...item,
                    uploadError: getErrorMessage(error),
                });
                setUploadProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
            }

            // Small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        setUploading(false);
        setUploadResult({ success: successItems, failed: failedItems });
        setResultModalOpen(true);

        if (failedItems.length === 0) {
            toast.success(`Berhasil mengupload ${successItems.length} barang`);
        } else {
            toast.warning(`${successItems.length} berhasil, ${failedItems.length} gagal`);
        }
    };

    const displayData = showInvalid ? parsedData : validData;
    const totalPages = Math.ceil(displayData.length / itemsPerPage);
    const paginatedData = displayData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when filter changes
    const handleToggleShowInvalid = () => {
        setShowInvalid(!showInvalid);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/barang"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bulk Upload Barang</h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Upload data barang dari file Excel
                        </p>
                    </div>
                </div>
                <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 
                               text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                    <Download className="w-4 h-4" />
                    Download Template
                </button>
            </div>

            {/* Upload Zone */}
            {!file && (
                <div
                    className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all
                        ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-gray-900">
                                Drag & drop file Excel di sini
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                atau klik untuk browse file
                            </p>
                        </div>
                        <p className="text-xs text-gray-400">
                            Format yang didukung: .xlsx, .xls
                        </p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                    <p className="mt-4 text-gray-600">Membaca file Excel...</p>
                </div>
            )}

            {/* File Info & Data Preview */}
            {file && !loading && parsedData.length > 0 && (
                <>
                    {/* File Info Bar */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleToggleShowInvalid}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 
                                               rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {showInvalid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    {showInvalid ? 'Semua Data' : 'Valid Saja'}
                                </button>
                                <button
                                    onClick={clearData}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus file"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">Total Barang</p>
                            <p className="text-2xl font-bold text-gray-900">{parsedData.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                            <p className="text-sm text-green-600">Valid</p>
                            <p className="text-2xl font-bold text-green-700">{validData.length}</p>
                        </div>
                        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                            <p className="text-sm text-red-600">Error</p>
                            <p className="text-2xl font-bold text-red-700">{invalidData.length}</p>
                        </div>
                    </div>

                    {/* Data Table - Hidden on mobile */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Mobile Message - Show only on small screens */}
                        <div className="sm:hidden p-8 text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Beralih ke Desktop</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Untuk melihat preview dan mengedit data sebelum upload, silakan gunakan perangkat desktop atau laptop.
                            </p>
                            <p className="text-xs text-gray-400">
                                {parsedData.length} data telah dibaca dari file
                            </p>
                        </div>

                        {/* Desktop Table - Hidden on mobile */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-12">
                                            Row
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                            Nama Barang
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            Satuan
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                                            Harga Jual
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                                            Harga Modal
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                            UD
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-16">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-12">

                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedData.map((item) => (
                                        <tr
                                            key={item.rowIndex}
                                            className={`transition-colors ${item.isValid ? 'hover:bg-gray-50' : 'bg-red-50/50 hover:bg-red-50'
                                                }`}
                                        >
                                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                                                {item.rowIndex}
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={item.namaBarang}
                                                    onChange={(e) => updateItem(item.rowIndex, 'namaBarang', e.target.value)}
                                                    className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500
                                                        ${!item.namaBarang ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                                    placeholder="Nama barang"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={item.satuan}
                                                    onChange={(e) => updateItem(item.rowIndex, 'satuan', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-center uppercase"
                                                    placeholder="pcs"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <CurrencyInput
                                                    value={item.hargaJual?.toString() || ''}
                                                    onChange={(e) => updateItem(item.rowIndex, 'hargaJual', e.target.value)}
                                                    className={`!w-full !px-2 !py-1.5 text-sm !rounded-md text-right
                                                        ${item.hargaJual <= 0 ? '!border-red-300 !bg-red-50' : '!border-gray-200'}`}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <CurrencyInput
                                                    value={item.hargaModal?.toString() || ''}
                                                    onChange={(e) => updateItem(item.rowIndex, 'hargaModal', e.target.value)}
                                                    className="!w-full !px-2 !py-1.5 text-sm !border-gray-200 !rounded-md text-right"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <select
                                                    value={item.ud?._id || ''}
                                                    onChange={(e) => updateItem(item.rowIndex, 'ud_id', e.target.value)}
                                                    className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none
                                                        ${!item.ud ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                                >
                                                    <option value="">Pilih UD</option>
                                                    {udList.map((ud) => (
                                                        <option key={ud._id} value={ud._id}>
                                                            {ud.nama_ud}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.isValid ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                                ) : (
                                                    <div className="group relative">
                                                        <XCircle className="w-5 h-5 text-red-500 mx-auto cursor-help" />
                                                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                                                            <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap">
                                                                {item.errors.join(', ')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => removeItem(item.rowIndex)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination - Hidden on mobile */}
                        {displayData.length > itemsPerPage && (
                            <div className="hidden sm:block px-4 py-3 bg-gray-50 border-t border-gray-100">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-xs sm:text-sm text-gray-500">
                                        Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, displayData.length)} dari {displayData.length} baris
                                    </p>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons - Hidden on mobile */}
                    <div className="hidden sm:flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4">
                        <div className="text-sm text-gray-600">
                            <span className="text-green-600 font-medium">{validData.length}</span> data siap diupload
                            {invalidData.length > 0 && (
                                <span className="ml-2">
                                    (<span className="text-red-600">{invalidData.length}</span> akan dilewati)
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/admin/barang"
                                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg 
                                           hover:bg-gray-50 transition-colors font-medium"
                            >
                                Batal
                            </Link>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || validData.length === 0}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg 
                                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed 
                                           transition-colors font-medium"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading {uploadProgress.current}/{uploadProgress.total}...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload {validData.length} Barang
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-700">
                                    Uploading...
                                </span>
                                <span className="text-sm text-blue-600">
                                    {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                                </span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                />
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="text-green-600">✓ {uploadProgress.success} berhasil</span>
                                {uploadProgress.failed > 0 && (
                                    <span className="text-red-600">✗ {uploadProgress.failed} gagal</span>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Empty State */}
            {file && !loading && parsedData.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Tidak ada data yang bisa dibaca</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Pastikan file Excel memiliki header yang benar dan data di bawahnya.
                    </p>
                    <button
                        onClick={clearData}
                        className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        Upload file lain
                    </button>
                </div>
            )}

            {/* Result Modal */}
            <Modal
                isOpen={resultModalOpen}
                onClose={() => {
                    setResultModalOpen(false);
                    if (uploadResult.failed.length === 0) {
                        router.push('/admin/barang');
                    }
                }}
                title="Hasil Upload"
                size="lg"
            >
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
                            <p className="mt-2 text-2xl font-bold text-green-700">{uploadResult.success.length}</p>
                            <p className="text-sm text-green-600">Berhasil</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                            <XCircle className="w-8 h-8 text-red-500 mx-auto" />
                            <p className="mt-2 text-2xl font-bold text-red-700">{uploadResult.failed.length}</p>
                            <p className="text-sm text-red-600">Gagal</p>
                        </div>
                    </div>

                    {/* Failed Items */}
                    {uploadResult.failed.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Daftar yang gagal:</h4>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Row</th>
                                            <th className="px-3 py-2 text-left">Nama Barang</th>
                                            <th className="px-3 py-2 text-left">Error</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {uploadResult.failed.map((item) => (
                                            <tr key={item.rowIndex}>
                                                <td className="px-3 py-2">{item.rowIndex}</td>
                                                <td className="px-3 py-2">{item.namaBarang}</td>
                                                <td className="px-3 py-2 text-red-500">{item.uploadError}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => setResultModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Tutup
                        </button>
                        <Link
                            href="/admin/barang"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Lihat Data Barang
                        </Link>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
