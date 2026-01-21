'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
} from 'lucide-react';
import { transaksiAPI, periodeAPI, dapurAPI, barangAPI, udAPI } from '@/lib/api';
import DatePicker from '@/components/ui/DatePicker';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, debounce } from '@/lib/utils';

const SATUAN_OPTIONS = [
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'ltr', label: 'Liter (ltr)' },
    { value: 'dus', label: 'Dus' },
    { value: 'tray', label: 'Tray' },
    { value: 'gln', label: 'Galon (gln)' },
    { value: 'unit', label: 'Unit' },
    { value: 'lainnya', label: 'Lainnya (Custom)' },
];

export default function EditTransaksiPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const searchInputRef = useRef(null);

    // Form state
    const [periodeId, setPeriodeId] = useState('');
    const [dapurId, setDapurId] = useState('');
    const [tanggal, setTanggal] = useState(new Date());
    const [items, setItems] = useState([]);
    const [kodeTransaksi, setKodeTransaksi] = useState('');

    // Options state
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);
    const [udList, setUdList] = useState([]);
    const [selectedUdId, setSelectedUdId] = useState('');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Loading state
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [tableSearch, setTableSearch] = useState('');

    // Create Barang Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBarang, setNewBarang] = useState({
        nama_barang: '',
        satuan: 'pcs',
        custom_satuan: '',
        harga_jual: '',
        harga_modal: '',
        ud_id: ''
    });
    const [creatingBarang, setCreatingBarang] = useState(false);

    useEffect(() => {
        fetchOptions();
        if (params.id) {
            fetchTransaksiDetail();
        }
    }, [params.id]);

    const fetchOptions = async () => {
        try {
            const [periodeRes, dapurRes] = await Promise.all([
                periodeAPI.getAll({ limit: 50 }), // List all including closed if needed for old trx
                dapurAPI.getAll({ limit: 100, isActive: true }),
            ]);

            if (periodeRes.data.success) {
                setPeriodeList(periodeRes.data.data);
            }
            if (dapurRes.data.success) {
                setDapurList(dapurRes.data.data);
            }
            const udRes = await udAPI.getAll({ limit: 100 });
            if (udRes.data.success) {
                setUdList(udRes.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch options:', error);
        }
    };

    const fetchTransaksiDetail = async () => {
        try {
            setFetchingData(true);
            const [response, barangRes, udRes] = await Promise.all([
                transaksiAPI.getById(params.id),
                barangAPI.getAll({ limit: 1000 }),
                udAPI.getAll({ limit: 1000 })
            ]);

            if (response.data.success) {
                let trx = response.data.data;

                // Enrich items if IDs are just strings
                if (trx.items && barangRes.data.success && udRes.data.success) {
                    const barangMap = new Map(barangRes.data.data.map(b => [b._id, b]));
                    const udMap = new Map(udRes.data.data.map(u => [u._id, u]));

                    trx.items = trx.items.map(item => {
                        const bId = item.barang_id?._id || item.barang_id;
                        const uId = item.ud_id?._id || item.ud_id;
                        const barang = barangMap.get(bId);
                        const ud = udMap.get(uId);

                        return {
                            ...item,
                            barang_id: barang || item.barang_id,
                            ud_id: ud || item.ud_id
                        };
                    });
                }

                // Only draft transactions can be edited per API docs
                if (trx.status !== 'draft') {
                    toast.error('Hanya transaksi draft yang dapat diedit');
                    router.push(`/admin/transaksi/${params.id}`);
                    return;
                }

                setKodeTransaksi(trx.kode_transaksi);
                setPeriodeId(trx.periode_id?._id || '');
                setDapurId(trx.dapur_id?._id || '');
                setTanggal(new Date(trx.tanggal));

                // Format items for the UI
                const formattedItems = trx.items.map(item => ({
                    barang_id: item.barang_id?._id || item.barang_id,
                    nama_barang: item.nama_barang || item.barang_id?.nama_barang,
                    satuan: item.satuan || item.barang_id?.satuan,
                    harga_jual: item.harga_jual,
                    harga_modal: item.harga_modal,
                    ud_id: item.ud_id?._id || item.ud_id,
                    ud_nama: item.ud_id?.nama_ud,
                    ud_kode: item.ud_id?.kode_ud,
                    qty: item.qty,
                }));
                setItems(formattedItems);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
            router.push('/admin/transaksi');
        } finally {
            setFetchingData(false);
            setLoading(false);
        }
    };

    // Debounced search function
    const searchBarang = useCallback(
        debounce(async (query, udId) => {
            if (!query || query.length < 2) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }

            try {
                setSearchLoading(true);
                const params = { q: query, limit: 10 };
                if (udId) {
                    params.ud_id = udId;
                }
                const response = await barangAPI.search(params);
                if (response.data.success) {
                    setSearchResults(response.data.data);
                    setShowDropdown(true);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 300),
        []
    );

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        searchBarang(value, selectedUdId);
    };

    const handleSelectBarang = (barang) => {
        if (items.some((item) => item.barang_id === barang._id)) {
            toast.warning('Barang sudah ada dalam daftar');
            return;
        }

        setItems((prev) => [
            ...prev,
            {
                barang_id: barang._id,
                nama_barang: barang.nama_barang,
                satuan: barang.satuan,
                harga_jual: barang.harga_jual,
                harga_modal: barang.harga_modal || 0,
                ud_id: barang.ud_id?._id,
                ud_nama: barang.ud_id?.nama_ud,
                ud_kode: barang.ud_id?.kode_ud,
                qty: 1,
            },
        ]);

        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        searchInputRef.current?.focus();
    };

    const handleCreateBarang = async (e) => {
        e.preventDefault();
        try {
            if (!newBarang.nama_barang || !newBarang.satuan || !newBarang.ud_id) {
                toast.warning('Mohon isi semua field yang wajib');
                return;
            }

            setCreatingBarang(true);

            const payload = {
                ...newBarang,
                satuan: newBarang.satuan === 'lainnya' ? newBarang.custom_satuan.trim() : newBarang.satuan,
                harga_jual: parseInt(newBarang.harga_jual) || 0,
                harga_modal: parseInt(newBarang.harga_modal) || 0,
            };
            delete payload.custom_satuan;

            const response = await barangAPI.create(payload);

            if (response.data.success) {
                const createdBarang = response.data.data;
                toast.success('Barang berhasil dibuat');

                // Add to items
                setItems((prev) => [
                    ...prev,
                    {
                        barang_id: createdBarang._id,
                        nama_barang: createdBarang.nama_barang,
                        satuan: createdBarang.satuan,
                        harga_jual: createdBarang.harga_jual,
                        harga_modal: createdBarang.harga_modal || 0,
                        ud_id: createdBarang.ud_id?._id || createdBarang.ud_id,
                        ud_nama: udList.find(ud => ud._id === (createdBarang.ud_id?._id || createdBarang.ud_id))?.nama_ud,
                        ud_kode: udList.find(ud => ud._id === (createdBarang.ud_id?._id || createdBarang.ud_id))?.kode_ud,
                        qty: 1,
                    },
                ]);

                // Reset modal and clear search
                setShowCreateModal(false);
                setNewBarang({
                    nama_barang: '',
                    satuan: 'pcs',
                    custom_satuan: '',
                    harga_jual: '',
                    harga_modal: '',
                    ud_id: ''
                });
                setSearchQuery('');
                setSearchResults([]);
                setShowDropdown(false);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setCreatingBarang(false);
        }
    };

    const handleQtyChange = (barangId, qty) => {
        setItems((prev) =>
            prev.map((item) => (item.barang_id === barangId ? { ...item, qty: qty } : item))
        );
    };

    const handleQtyBlur = (barangId) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.barang_id === barangId) {
                    const parsedQty = parseFloat(item.qty);
                    const finalQty = parsedQty > 0 ? parsedQty : 0.01;
                    return { ...item, qty: finalQty };
                }
                return item;
            })
        );
    };

    const handleHargaJualChange = (barangId, harga) => {
        const newHarga = Math.max(0, parseInt(harga) || 0);
        setItems((prev) =>
            prev.map((item) => (item.barang_id === barangId ? { ...item, harga_jual: newHarga } : item))
        );
    };

    const handleHargaModalChange = (barangId, harga) => {
        const newHarga = Math.max(0, parseInt(harga) || 0);
        setItems((prev) =>
            prev.map((item) => (item.barang_id === barangId ? { ...item, harga_modal: newHarga } : item))
        );
    };

    const handleSatuanChange = (barangId, value) => {
        setItems((prev) =>
            prev.map((item) => (item.barang_id === barangId ? { ...item, satuan: value } : item))
        );
    };

    const handleRemoveItem = (barangId) => {
        setItems((prev) => prev.filter((item) => item.barang_id !== barangId));
    };

    const calculateSubtotal = (item) => {
        const qty = parseFloat(item.qty) || 0;
        return qty * item.harga_jual;
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
    };

    const calculateTotalModal = () => {
        return items.reduce((sum, item) => {
            const qty = parseFloat(item.qty) || 0;
            return sum + (qty * item.harga_modal);
        }, 0);
    };

    const handleSubmit = async (complete = false) => {
        if (!periodeId) {
            toast.warning('Pilih periode terlebih dahulu');
            return;
        }
        if (!dapurId) {
            toast.warning('Pilih dapur terlebih dahulu');
            return;
        }
        if (items.length === 0) {
            toast.warning('Tambahkan minimal satu barang');
            return;
        }

        // Validate quantities
        const invalidQty = items.some(item => (parseFloat(item.qty) || 0) <= 0);
        if (invalidQty) {
            toast.warning('Semua barang harus memiliki jumlah (qty) lebih dari 0');
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                periode_id: periodeId,
                dapur_id: dapurId,
                tanggal: tanggal.toISOString(),
                items: items.map((item) => ({
                    barang_id: item.barang_id,
                    qty: parseFloat(item.qty),
                    harga_jual: item.harga_jual,
                    harga_modal: item.harga_modal,
                    satuan: item.satuan,
                })),
            };

            const updateRes = await transaksiAPI.update(params.id, payload);

            if (!updateRes.data.success) {
                throw new Error(updateRes.data.message);
            }

            if (complete) {
                const completeRes = await transaksiAPI.complete(params.id);
                if (completeRes.data.success) {
                    toast.success('Transaksi berhasil diupdate dan selesai');
                }
            } else {
                toast.success('Transaksi berhasil diupdate sebagai draft');
            }

            router.push('/admin/transaksi');
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = items.filter((item) =>
        item.nama_barang.toLowerCase().includes(tableSearch.toLowerCase()) ||
        item.ud_nama?.toLowerCase().includes(tableSearch.toLowerCase())
    );

    if (loading || fetchingData) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Memuat data transaksi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-0">
            {/* Page Header */}
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Edit Transaksi</h1>
                    <p className="text-sm md:text-gray-500 font-mono mt-0.5">{kodeTransaksi}</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                {/* Header Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Periode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Periode <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={periodeId}
                            onChange={(e) => setPeriodeId(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-900"
                        >
                            <option value="">Pilih Periode</option>
                            {periodeList.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.nama_periode}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Dapur */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dapur <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={dapurId}
                            onChange={(e) => setDapurId(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-900"
                        >
                            <option value="">Pilih Dapur</option>
                            {dapurList.map((d) => (
                                <option key={d._id} value={d._id}>
                                    {d.nama_dapur}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tanggal */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tanggal
                        </label>
                        <DatePicker
                            selected={tanggal}
                            onChange={(date) => setTanggal(date)}
                            placeholder="Pilih tanggal"
                        />
                    </div>
                </div>

                {/* Filter UD */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Filter Unit Dagang (UD)
                    </label>
                    <select
                        value={selectedUdId}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSelectedUdId(val);
                            if (searchQuery.length >= 2) {
                                searchBarang(searchQuery, val);
                            }
                        }}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-900"
                    >
                        <option value="">Semua UD (Tanpa Filter)</option>
                        {udList.map((ud) => (
                            <option key={ud._id} value={ud._id}>
                                {ud.nama_ud} ({ud.kode_ud})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search Barang */}
                <div className="relative mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cari & Tambah Barang
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                            placeholder="Ketik nama barang..."
                            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        {searchLoading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                        )}
                    </div>

                    {/* Dropdown Results */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {searchResults.map((barang) => (
                                <button
                                    key={barang._id}
                                    onClick={() => handleSelectBarang(barang)}
                                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{barang.nama_barang}</p>
                                            <p className="text-sm text-gray-500">
                                                {barang.ud_id?.nama_ud} • {barang.satuan}
                                            </p>
                                        </div>
                                        <p className="font-medium text-blue-600">
                                            {formatCurrency(barang.harga_jual)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {showDropdown && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                            <p className="text-gray-500 mb-3">Tidak ada barang ditemukan</p>
                            <button
                                onClick={() => {
                                    setNewBarang(prev => ({ ...prev, nama_barang: searchQuery, ud_id: selectedUdId }));
                                    setShowCreateModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah "{searchQuery}" Baru
                            </button>
                        </div>
                    )}
                </div>

                {/* Items List */}
                <div className="space-y-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900">Daftar Barang</h2>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                placeholder="Filter barang di tabel..."
                                className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            {tableSearch && (
                                <button
                                    onClick={() => setTableSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-2 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-8">No</th>
                                        <th className="text-left px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Barang & UD</th>
                                        <th className="text-center px-2 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-16">Satuan</th>
                                        <th className="text-center px-2 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-16">Qty</th>
                                        <th className="text-right px-2 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-28">Modal</th>
                                        <th className="text-right px-2 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-28">Jual</th>
                                        <th className="text-right px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-28">Subtotal</th>
                                        <th className="text-center px-2 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-12">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-12 text-gray-500">
                                                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                {tableSearch ? (
                                                    <>
                                                        <p className="text-lg font-medium">Barang tidak ditemukan</p>
                                                        <p className="text-sm">Tidak ada barang yang cocok dengan "{tableSearch}"</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-lg font-medium">Belum ada barang ditambahkan</p>
                                                        <p className="text-sm">Cari dan pilih barang dari kolom pencarian di atas</p>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item, index) => (
                                            <tr key={item.barang_id} className="hover:bg-blue-50/20 transition-colors border-b border-gray-100 last:border-0">
                                                <td className="px-2 py-4 text-[10px] font-bold text-gray-400">{(index + 1).toString().padStart(2, '0')}</td>
                                                <td className="px-3 py-4 max-w-[150px] lg:max-w-xs">
                                                    <p className="font-bold text-gray-900 text-sm truncate leading-tight" title={item.nama_barang}>
                                                        {item.nama_barang}
                                                    </p>
                                                    <div className="flex flex-col mt-0.5">
                                                        <span className="text-[10px] text-blue-600 font-bold leading-none truncate">{item.ud_nama}</span>
                                                        <span className="text-[8px] text-gray-400 font-medium leading-none mt-0.5">{item.ud_kode}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-4 text-center">
                                                    <input
                                                        type="text"
                                                        value={item.satuan}
                                                        onChange={(e) => handleSatuanChange(item.barang_id, e.target.value)}
                                                        className="w-14 px-1 py-1.5 border border-gray-200 rounded-md text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-[10px] font-bold uppercase"
                                                    />
                                                </td>
                                                <td className="px-2 py-4">
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => handleQtyChange(item.barang_id, e.target.value)}
                                                        onBlur={() => handleQtyBlur(item.barang_id)}
                                                        onFocus={(e) => e.target.select()}
                                                        step="any"
                                                        className="w-16 px-1 py-1.5 border border-gray-200 rounded-md text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-bold"
                                                    />
                                                </td>
                                                <td className="px-2 py-4">
                                                    <input
                                                        type="number"
                                                        value={item.harga_modal}
                                                        onChange={(e) => handleHargaModalChange(item.barang_id, e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        min="0"
                                                        className="w-24 px-2 py-1.5 border border-gray-200 rounded-md text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-medium"
                                                    />
                                                </td>
                                                <td className="px-2 py-4">
                                                    <input
                                                        type="number"
                                                        value={item.harga_jual}
                                                        onChange={(e) => handleHargaJualChange(item.barang_id, e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        min="0"
                                                        className="w-24 px-2 py-1.5 border border-gray-200 rounded-md text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-bold text-gray-900"
                                                    />
                                                </td>
                                                <td className="px-3 py-4 text-right font-black text-blue-600 text-xs whitespace-nowrap">
                                                    {formatCurrency(calculateSubtotal(item))}
                                                </td>
                                                <td className="px-2 py-4 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.barang_id)}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                        title="Hapus Barang"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden">
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-12 px-4 text-gray-500">
                                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    {tableSearch ? (
                                        <>
                                            <p className="text-lg font-medium">Barang tidak ditemukan</p>
                                            <p className="text-sm">Tidak ada yang cocok dengan "{tableSearch}"</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-lg font-medium">Belum ada barang</p>
                                            <p className="text-sm">Cari dan pilih barang di atas</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredItems.map((item, index) => (
                                        <div key={item.barang_id} className="p-4 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-gray-900 leading-tight">{item.nama_barang}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs text-gray-500">{item.ud_nama} •</p>
                                                        <input
                                                            type="text"
                                                            value={item.satuan}
                                                            onChange={(e) => handleSatuanChange(item.barang_id, e.target.value)}
                                                            className="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-[10px] font-medium focus:ring-1 focus:ring-blue-500/20 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveItem(item.barang_id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty</label>
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => handleQtyChange(item.barang_id, e.target.value)}
                                                        onBlur={() => handleQtyBlur(item.barang_id)}
                                                        onFocus={(e) => e.target.select()}
                                                        step="any"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subtotal</label>
                                                    <p className="py-2 font-bold text-blue-600">
                                                        {formatCurrency(calculateSubtotal(item))}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga Modal</label>
                                                    <input
                                                        type="number"
                                                        value={item.harga_modal}
                                                        onChange={(e) => handleHargaModalChange(item.barang_id, e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga Jual</label>
                                                    <input
                                                        type="number"
                                                        value={item.harga_jual}
                                                        onChange={(e) => handleHargaJualChange(item.barang_id, e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Section (Mobile Optimized) */}
                    {items.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Total Modal</span>
                                <span className="text-gray-900 font-medium">{formatCurrency(calculateTotalModal())}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Estimasi Keuntungan</span>
                                <span className="text-green-600 font-bold">{formatCurrency(calculateTotal() - calculateTotalModal())}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-base font-bold text-gray-700">TOTAL</span>
                                <span className="text-2xl font-black text-blue-600 tracking-tight">
                                    {formatCurrency(calculateTotal())}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Actions - Desktop */}
                    <div className="hidden md:flex justify-end gap-3 mt-8">
                        <button
                            onClick={() => router.back()}
                            disabled={submitting}
                            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium
                     hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting || items.length === 0}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-600 text-white rounded-lg font-medium
                     hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            Update Draft
                        </button>
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={submitting || items.length === 0}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium
                     hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5" />
                            )}
                            Update & Selesai
                        </button>
                    </div>
                </div>

                {/* Mobile Bottom Action Bar */}
                <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40">
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting || items.length === 0}
                            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 bg-gray-50 text-gray-700 rounded-xl border border-gray-200 disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Draft</span>
                        </button>
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={submitting || items.length === 0}
                            className="flex-[2.5] flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 active:scale-[0.98] transition-transform disabled:opacity-50"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5" />
                            )}
                            Update & Selesai
                        </button>
                    </div>
                </div>
            </div>

            {/* Create Barang Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Tambah Barang Baru</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-white rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBarang} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Nama Barang <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newBarang.nama_barang}
                                    onChange={(e) => setNewBarang({ ...newBarang, nama_barang: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Masukkan nama barang"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Satuan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={newBarang.satuan}
                                        onChange={(e) => setNewBarang({ ...newBarang, satuan: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                                    >
                                        {SATUAN_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Unit Dagang (UD) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={newBarang.ud_id}
                                        onChange={(e) => setNewBarang({ ...newBarang, ud_id: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                                    >
                                        <option value="">Pilih UD</option>
                                        {udList.map((ud) => (
                                            <option key={ud._id} value={ud._id}>
                                                {ud.nama_ud}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {newBarang.satuan === 'lainnya' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Satuan Custom <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newBarang.custom_satuan}
                                        onChange={(e) => setNewBarang({ ...newBarang, custom_satuan: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Contoh: box, pak, bal, dll"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Harga Modal
                                    </label>
                                    <input
                                        type="number"
                                        value={newBarang.harga_modal}
                                        onChange={(e) => setNewBarang({ ...newBarang, harga_modal: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        min="0"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Harga Jual
                                    </label>
                                    <input
                                        type="number"
                                        value={newBarang.harga_jual}
                                        onChange={(e) => setNewBarang({ ...newBarang, harga_jual: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        min="0"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98]"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingBarang}
                                    className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creatingBarang ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            Simpan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
