'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart,
    Search,
    Trash2,
    Plus,
    Loader2,
    Save,
    CheckCircle,
    ArrowLeft,
    X,
    Upload,
    FileSpreadsheet,
    AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { transaksiAPI, periodeAPI, dapurAPI, barangAPI, udAPI } from '@/lib/api';
import DatePicker from '@/components/ui/DatePicker';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, formatDateShort, normalizeId, debounce } from '@/lib/utils';
import CurrencyInput from '@/components/ui/CurrencyInput';
import SearchableSelect from '@/components/ui/SearchableSelect';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const COLUMN_ALIASES = {
    'Nama Barang': ['nama barang', 'nama', 'barang', 'item', 'product'],
    'Qty': ['qty', 'jumlah', 'quantity', 'kuantitas'],
    'Satuan': ['satuan', 'unit', 'uom'],
    'Harga Jual': ['harga jual', 'harga jual suplier', 'jual', 'selling price', 'price'],
    'Harga Modal': ['harga modal', 'harga modal suplier', 'modal', 'cost', 'buying price'],
};

const normalizeColumnName = (name) => {
    const normalized = name?.toString().toLowerCase().trim();
    for (const [standard, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.includes(normalized)) {
            return standard;
        }
    }
    return name;
};

export default function BulkTransaksiPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Form state
    const [periodeId, setPeriodeId] = useState('');
    const [dapurId, setDapurId] = useState('');
    const [tanggal, setTanggal] = useState(new Date());
    const [items, setItems] = useState([]);

    // Options state
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);
    const [udList, setUdList] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [parsing, setParsing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [tableSearch, setTableSearch] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);

    // Search state for inline item editing
    const [activeSearchIdx, setActiveSearchIdx] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Confirm Modal state
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [missingItemsCount, setMissingItemsCount] = useState(0);
    const [groupingMode, setGroupingMode] = useState('ud');

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            setLoading(true);
            const [periodeRes, dapurRes, udRes] = await Promise.all([
                periodeAPI.getAll({ limit: 50, isClosed: false }),
                dapurAPI.getAll({ limit: 100, isActive: true }),
                udAPI.getAll({ limit: 100 }),
            ]);

            if (periodeRes.data.success) setPeriodeList(periodeRes.data.data);
            if (dapurRes.data.success) setDapurList(dapurRes.data.data);
            if (udRes.data.success) setUdList(udRes.data.data);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const searchBarang = useCallback(
        debounce(async (query, idx) => {
            if (!query || query.length < 2) {
                setSearchResults([]);
                return;
            }

            try {
                setSearchLoading(true);
                // Search across all UDs or filtered if we want
                const response = await barangAPI.search({ q: query, limit: 10 });
                if (response.data.success) {
                    setSearchResults(response.data.data);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 300),
        []
    );

    const handleSearchChange = (e, idx) => {
        const val = e.target.value;
        setSearchQuery(val);
        searchBarang(val, idx);
    };

    const handleSelectBarang = (idx, barang) => {
        setItems(prev => prev.map((item, i) => i === idx ? {
            ...item,
            barang_id: barang._id,
            nama_barang: barang.nama_barang,
            satuan: barang.satuan,
            harga_jual: barang.harga_jual,
            harga_modal: barang.harga_modal || 0,
            ud_id: normalizeId(barang.ud_id),
            ud_nama: barang.ud_id?.nama_ud,
            ud_kode: barang.ud_id?.kode_ud,
            isNew: false
        } : item));
        setActiveSearchIdx(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const processFile = async (selectedFile) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.xlsx?$/i)) {
            toast.error('File harus berformat Excel (.xlsx atau .xls)');
            return;
        }

        setFile(selectedFile);
        setParsing(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rawRecords = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (rawRecords.length < 2) {
                    toast.error('File Excel harus memiliki minimal header dan satu baris data');
                    setParsing(false);
                    return;
                }

                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(10, rawRecords.length); i++) {
                    const row = rawRecords[i].map(cell => normalizeColumnName(cell));
                    if (row.includes('Nama Barang') || row.includes('Qty')) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    toast.error('Header "Nama Barang" tidak ditemukan dalam file');
                    setParsing(false);
                    return;
                }

                const headers = rawRecords[headerRowIndex].map(h => normalizeColumnName(h));
                const dataRows = rawRecords.slice(headerRowIndex + 1);

                const colIndex = {
                    namaBarang: headers.indexOf('Nama Barang'),
                    qty: headers.indexOf('Qty'),
                    satuan: headers.indexOf('Satuan'),
                    hargaJual: headers.indexOf('Harga Jual'),
                    hargaModal: headers.indexOf('Harga Modal'),
                };

                // Fetch ALL barangs to match by name across any UD
                const barangRes = await barangAPI.getAll({ limit: 2000 });
                const existingBarangs = barangRes.data.success ? barangRes.data.data : [];

                const parsedItems = [];
                dataRows.forEach((row, idx) => {
                    const namaRaw = row[colIndex.namaBarang]?.toString().trim();
                    if (!namaRaw || row.every(c => c === '')) return;

                    const qty = parseFloat(row[colIndex.qty]) || 0;
                    if (qty === 0) return;

                    const satuan = row[colIndex.satuan]?.toString().trim() || 'pcs';
                    const hargaJual = parseFloat(String(row[colIndex.hargaJual]).replace(/[^0-9.-]/g, '')) || 0;
                    const hargaModal = parseFloat(String(row[colIndex.hargaModal]).replace(/[^0-9.-]/g, '')) || 0;

                    // Match with existing barang
                    const matched = existingBarangs.find(b =>
                        b.nama_barang.toLowerCase() === namaRaw.toLowerCase()
                    );

                    parsedItems.push({
                        barang_id: matched?._id || null,
                        nama_barang: matched?.nama_barang || namaRaw,
                        satuan: matched?.satuan || satuan,
                        harga_jual: matched?.harga_jual || hargaJual,
                        harga_modal: matched?.harga_modal || hargaModal,
                        ud_id: matched ? normalizeId(matched.ud_id) : '',
                        ud_nama: matched?.ud_id?.nama_ud || '',
                        ud_kode: matched?.ud_id?.kode_ud || '',
                        qty: qty,
                        isNew: !matched
                    });
                });

                if (parsedItems.length === 0) {
                    toast.warning('Tidak ada data barang yang valid ditemukan dalam file');
                } else {
                    setItems(parsedItems);
                    const missingUd = parsedItems.filter(item => !item.ud_id).length;
                    if (missingUd > 0) {
                        toast.info(`${missingUd} barang memerlukan pemilihan Unit Dagang (UD)`);
                    } else {
                        toast.success(`Berhasil memuat ${parsedItems.length} barang`);
                    }
                }

            } catch (error) {
                console.error('Parse error:', error);
                toast.error('Gagal membaca file: ' + error.message);
            } finally {
                setParsing(false);
            }
        };
        reader.onerror = () => {
            toast.error('Gagal membaca file');
            setParsing(false);
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
    };

    const handleQtyChange = (idx, qty) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, qty } : item));
    };

    const handleHargaJualChange = (idx, harga) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, harga_jual: parseInt(harga) || 0 } : item));
    };

    const handleHargaModalChange = (idx, harga) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, harga_modal: parseInt(harga) || 0 } : item));
    };

    const handleSatuanChange = (idx, value) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, satuan: value } : item));
    };

    const handleUdChange = (idx, udId) => {
        const selectedUd = udList.find(ud => ud._id === udId);
        setItems(prev => prev.map((item, i) => i === idx ? {
            ...item,
            ud_id: udId,
            ud_nama: selectedUd?.nama_ud || '',
            ud_kode: selectedUd?.kode_ud || ''
        } : item));
    };

    const handleRemoveItem = (idx) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleAddItemManual = () => {
        setItems(prev => [
            {
                barang_id: null,
                nama_barang: '',
                satuan: 'pcs',
                harga_jual: 0,
                harga_modal: 0,
                ud_id: '',
                ud_nama: '',
                ud_kode: '',
                qty: 1,
                isNew: true
            },
            ...prev
        ]);
        // Open search for the new item immediately
        setActiveSearchIdx(0);
        setSearchQuery('');
        setTableSearch(''); // Clear filter to see the new item
    };

    const calculateSubtotal = (item) => (parseFloat(item.qty) || 0) * item.harga_jual;
    const calculateTotal = () => items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
    const calculateTotalModal = () => items.reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * item.harga_modal), 0);

    const handleSubmit = async (complete = false) => {
        if (!periodeId) { toast.warning('Pilih periode terlebih dahulu'); return; }
        if (!dapurId) { toast.warning('Pilih dapur terlebih dahulu'); return; }
        if (items.length === 0) { toast.warning('Tambahkan minimal satu barang'); return; }

        const missingUd = items.filter(item => !item.ud_id);
        if (missingUd.length > 0) {
            toast.warning(`Terdapat ${missingUd.length} barang yang belum dipilih Unit Dagangnya`);
            return;
        }

        const missingIds = items.filter(item => !item.barang_id);
        if (missingIds.length > 0) {
            setMissingItemsCount(missingIds.length);
            setIsCompleting(complete);
            setConfirmModalOpen(true);
            return;
        }

        await handleConfirmSave(complete);
    };

    const handleConfirmSave = async (complete = false) => {
        setConfirmModalOpen(false);
        try {
            setSubmitting(true);

            const updatedItems = [...items];
            for (let i = 0; i < updatedItems.length; i++) {
                if (!updatedItems[i].barang_id) {
                    try {
                        const createRes = await barangAPI.create({
                            nama_barang: updatedItems[i].nama_barang,
                            satuan: updatedItems[i].satuan,
                            harga_jual: updatedItems[i].harga_jual,
                            harga_modal: updatedItems[i].harga_modal,
                            ud_id: updatedItems[i].ud_id,
                            isActive: true
                        });
                        if (createRes.data.success) {
                            updatedItems[i].barang_id = createRes.data.data._id;
                        }
                    } catch (err) {
                        console.error(`Failed to auto-create barang: ${updatedItems[i].nama_barang}`, err);
                    }
                }
            }

            const payload = {
                periode_id: periodeId,
                dapur_id: dapurId,
                tanggal: tanggal.toISOString(),
                items: updatedItems.filter(item => item.barang_id).map((item) => ({
                    barang_id: item.barang_id,
                    qty: parseFloat(item.qty),
                    harga_jual: item.harga_jual,
                    harga_modal: item.harga_modal,
                    satuan: item.satuan,
                    nama_barang: item.nama_barang,
                    ud_nama: item.ud_nama,
                    ud_kode: item.ud_kode,
                })),
            };

            const createRes = await transaksiAPI.create(payload);

            if (!createRes.data.success) throw new Error(createRes.data.message);

            if (complete) {
                await transaksiAPI.complete(createRes.data.data._id);
                toast.success('Transaksi berhasil disimpan dan selesai');
            } else {
                toast.success('Transaksi berhasil disimpan sebagai draft');
            }

            router.push('/admin/transaksi');
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Memuat data...</p>
                </div>
            </div>
        );
    }

    const itemsWithIndex = items.map((item, index) => ({ ...item, originalIndex: index }));
    const filteredItems = itemsWithIndex.filter(item =>
        item.nama_barang.toLowerCase().includes(tableSearch.toLowerCase()) ||
        item.ud_nama?.toLowerCase().includes(tableSearch.toLowerCase())
    );

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-0">
            {/* Header */}
            <div className="flex items-center gap-3 md:gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Bulk Upload Transaksi</h1>
                    <p className="text-sm md:text-gray-500 mt-0.5">Upload file Excel untuk input transaksi sekaligus</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                {/* Header Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Periode <span className="text-red-500">*</span></label>
                        <SearchableSelect
                            value={periodeId}
                            onChange={(e) => setPeriodeId(e.target.value)}
                            options={periodeList.map(p => ({
                                value: p._id,
                                label: `${p.nama_periode} (${formatDateShort(p.tanggal_mulai)} - ${formatDateShort(p.tanggal_selesai)})`
                            }))}
                            placeholder="Pilih Periode"
                            searchPlaceholder="Cari periode..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dapur <span className="text-red-500">*</span></label>
                        <SearchableSelect
                            value={dapurId}
                            onChange={(e) => setDapurId(e.target.value)}
                            options={dapurList.map(d => ({ value: d._id, label: d.nama_dapur }))}
                            placeholder="Pilih Dapur"
                            searchPlaceholder="Cari dapur..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                        <DatePicker
                            selected={tanggal}
                            onChange={(date) => setTanggal(date)}
                            placeholder="Pilih tanggal"
                        />
                    </div>
                </div>

                {/* Upload Zone */}
                {!items.length ? (
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            }`}
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    >
                        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={parsing} />
                        {parsing ? (
                            <div className="space-y-3">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                                <p className="text-gray-600 font-medium">Membaca file Excel...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                                    <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-gray-900">Drag & drop file Excel di sini</p>
                                    <p className="text-sm text-gray-500 mt-1">atau klik untuk browse file</p>
                                </div>
                                <div className="pt-4 border-t border-gray-100 mt-6">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleAddItemManual(); }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Mulai Input Manual
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-gray-900">Preview Data ({items.length} Barang)</h2>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Mode Tampilan:</label>
                                    <select
                                        value={groupingMode}
                                        onChange={(e) => setGroupingMode(e.target.value)}
                                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                                    >
                                        <option value="ud">Group per UD</option>
                                        <option value="none">Tanpa Grouping</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={handleAddItemManual}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Tambah Barang
                                    </button>
                                    <button onClick={() => { setItems([]); setFile(null); }} className="text-sm text-red-600 hover:underline whitespace-nowrap">Hapus Data & Upload Ulang</button>
                                </div>
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                placeholder="Filter preview..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                            />
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-x-auto min-h-[400px]">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Barang</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit Dagang (UD)</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Satuan</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Qty</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Modal</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Jual</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-12 text-gray-500">
                                                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                <p className="text-lg font-medium">Barang tidak ditemukan</p>
                                                <p className="text-sm">Tidak ada barang yang cocok dengan filter</p>
                                            </td>
                                        </tr>
                                    ) : groupingMode === 'none' ? (
                                        filteredItems.map((item) => (
                                            <tr key={item.originalIndex} className={`hover:bg-gray-50 ${item.isNew ? 'bg-amber-50/30' : ''}`}>
                                                <td className="px-4 py-3 text-sm text-gray-500">{item.originalIndex + 1}</td>
                                                <td className="px-4 py-3 min-w-[200px] relative">
                                                    {activeSearchIdx === item.originalIndex ? (
                                                        <div className="fixed sm:absolute z-50 left-4 right-4 sm:left-0 sm:right-0 sm:w-64 bg-white border border-gray-200 rounded-lg shadow-xl -mt-1 p-2">
                                                            <div className="flex items-center gap-2 mb-2 p-1 border-b">
                                                                <Search className="w-4 h-4 text-gray-400" />
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={searchQuery}
                                                                    onChange={(e) => handleSearchChange(e, item.originalIndex)}
                                                                    placeholder="Cari item master..."
                                                                    className="flex-1 text-sm outline-none"
                                                                />
                                                                <button onClick={() => setActiveSearchIdx(null)}><X className="w-4 h-4" /></button>
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto">
                                                                {searchLoading && <div className="p-2 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>}
                                                                {searchResults.map(b => (
                                                                    <button
                                                                        key={b._id}
                                                                        onClick={() => handleSelectBarang(item.originalIndex, b)}
                                                                        className="w-full p-2 text-left text-xs hover:bg-blue-50 border-b last:border-0"
                                                                    >
                                                                        <p className="font-bold">{b.nama_barang}</p>
                                                                        <p className="text-gray-500">{b.ud_id?.nama_ud} • {b.satuan}</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setActiveSearchIdx(item.originalIndex); setSearchQuery(item.nama_barang); searchBarang(item.nama_barang, item.originalIndex); }}
                                                            className="text-left w-full group"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-medium text-gray-900 group-hover:text-blue-600">{item.nama_barang}</p>
                                                                <Search className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                                                            </div>
                                                            {item.isNew && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Mungkin Baru</span>}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 min-w-[150px]">
                                                    <select
                                                        value={item.ud_id}
                                                        onChange={(e) => handleUdChange(item.originalIndex, e.target.value)}
                                                        className={`w-full text-xs p-1.5 border rounded focus:ring-1 ${!item.ud_id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}
                                                    >
                                                        <option value="">Pilih UD</option>
                                                        {udList.map(ud => <option key={ud._id} value={ud._id}>{ud.nama_ud}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input type="text" value={item.satuan} onChange={e => handleSatuanChange(item.originalIndex, e.target.value)} className="w-16 px-2 py-1 text-xs border rounded text-center" />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input type="number" value={item.qty} onChange={e => handleQtyChange(item.originalIndex, e.target.value)} className="w-20 px-2 py-1 border rounded text-center" />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <CurrencyInput value={item.harga_modal} onChange={e => handleHargaModalChange(item.originalIndex, e.target.value)} className="!w-24 !px-2 !py-1 text-xs" />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <CurrencyInput value={item.harga_jual} onChange={e => handleHargaJualChange(item.originalIndex, e.target.value)} className="!w-24 !px-2 !py-1 text-xs" />
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium">{formatCurrency(calculateSubtotal(item))}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => handleRemoveItem(item.originalIndex)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        (() => {
                                            // Grouping items by UD ID
                                            const grouped = filteredItems.reduce((acc, item) => {
                                                const udId = item.ud_id || 'unassigned';
                                                if (!acc[udId]) {
                                                    acc[udId] = {
                                                        nama_ud: item.ud_nama || 'Belum Pilih UD',
                                                        items: []
                                                    };
                                                }
                                                acc[udId].items.push(item);
                                                return acc;
                                            }, {});

                                            return Object.entries(grouped).map(([udId, group]) => (
                                                <Fragment key={udId}>
                                                    <tr className="bg-blue-50/50">
                                                        <td colSpan={9} className="px-4 py-2 border-y border-blue-100">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">{group.nama_ud}</span>
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold">{group.items.length} Item</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {group.items.map((item, idxInGroup) => (
                                                        <tr key={item.originalIndex} className={`hover:bg-gray-50 ${item.isNew ? 'bg-amber-50/30' : ''}`}>
                                                            <td className="px-4 py-3 text-sm text-gray-500">{idxInGroup + 1}</td>
                                                            <td className="px-4 py-3 min-w-[200px] relative">
                                                                {activeSearchIdx === item.originalIndex ? (
                                                                    <div className="fixed sm:absolute z-50 left-4 right-4 sm:left-0 sm:right-0 sm:w-64 bg-white border border-gray-200 rounded-lg shadow-xl -mt-1 p-2">
                                                                        <div className="flex items-center gap-2 mb-2 p-1 border-b">
                                                                            <Search className="w-4 h-4 text-gray-400" />
                                                                            <input
                                                                                autoFocus
                                                                                type="text"
                                                                                value={searchQuery}
                                                                                onChange={(e) => handleSearchChange(e, item.originalIndex)}
                                                                                placeholder="Cari item master..."
                                                                                className="flex-1 text-sm outline-none"
                                                                            />
                                                                            <button onClick={() => setActiveSearchIdx(null)}><X className="w-4 h-4" /></button>
                                                                        </div>
                                                                        <div className="max-h-48 overflow-y-auto">
                                                                            {searchLoading && <div className="p-2 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>}
                                                                            {searchResults.map(b => (
                                                                                <button
                                                                                    key={b._id}
                                                                                    onClick={() => handleSelectBarang(item.originalIndex, b)}
                                                                                    className="w-full p-2 text-left text-xs hover:bg-blue-50 border-b last:border-0"
                                                                                >
                                                                                    <p className="font-bold">{b.nama_barang}</p>
                                                                                    <p className="text-gray-500">{b.ud_id?.nama_ud} • {b.satuan}</p>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => { setActiveSearchIdx(item.originalIndex); setSearchQuery(item.nama_barang); searchBarang(item.nama_barang, item.originalIndex); }}
                                                                        className="text-left w-full group"
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="font-medium text-gray-900 group-hover:text-blue-600">{item.nama_barang}</p>
                                                                            <Search className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                                                                        </div>
                                                                        {item.isNew && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Mungkin Baru</span>}
                                                                    </button>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 min-w-[150px]">
                                                                <select
                                                                    value={item.ud_id}
                                                                    onChange={(e) => handleUdChange(item.originalIndex, e.target.value)}
                                                                    className={`w-full text-xs p-1.5 border rounded focus:ring-1 ${!item.ud_id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}
                                                                >
                                                                    <option value="">Pilih UD</option>
                                                                    {udList.map(ud => <option key={ud._id} value={ud._id}>{ud.nama_ud}</option>)}
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input type="text" value={item.satuan} onChange={e => handleSatuanChange(item.originalIndex, e.target.value)} className="w-16 px-2 py-1 text-xs border rounded text-center" />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input type="number" value={item.qty} onChange={e => handleQtyChange(item.originalIndex, e.target.value)} className="w-20 px-2 py-1 border rounded text-center" />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <CurrencyInput value={item.harga_modal} onChange={e => handleHargaModalChange(item.originalIndex, e.target.value)} className="!w-24 !px-2 !py-1 text-xs" />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <CurrencyInput value={item.harga_jual} onChange={e => handleHargaJualChange(item.originalIndex, e.target.value)} className="!w-24 !px-2 !py-1 text-xs" />
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(calculateSubtotal(item))}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button onClick={() => handleRemoveItem(item.originalIndex)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ));
                                        })()
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Summary Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:relative md:rounded-xl md:border md:shadow-none">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-1">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Item</p>
                            <p className="text-lg font-bold text-gray-900">{items.length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Modal</p>
                            <p className="text-lg font-bold text-gray-900 text-amber-600">{formatCurrency(calculateTotalModal())}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Jual</p>
                            <p className="text-lg font-bold text-blue-600">{formatCurrency(calculateTotal())}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Keuntungan</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(calculateTotal() - calculateTotalModal())}</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting || items.length === 0}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Simpan Draft
                        </button>
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={submitting || items.length === 0}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            Selesai & Simpan
                        </button>
                    </div>
                </div>
            </div>
            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={() => handleConfirmSave(isCompleting)}
                title="Barang Baru Terdeteksi"
                message={`${missingItemsCount} barang tidak terdaftar di master data. Sistem akan mencoba membuat barang baru secara otomatis untuk Unit Dagang yang telah dipilih. Apakah Anda yakin ingin melanjutkan?`}
                confirmText="Ya, Lanjutkan"
                type="warning"
            />
        </div>
    );
}
