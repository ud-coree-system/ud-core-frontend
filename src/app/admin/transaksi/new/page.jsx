'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { transaksiAPI, periodeAPI, dapurAPI, barangAPI } from '@/lib/api';
import DatePicker from '@/components/ui/DatePicker';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency, toDateInputValue, debounce } from '@/lib/utils';

export default function NewTransaksiPage() {
    const router = useRouter();
    const { toast } = useToast();
    const searchInputRef = useRef(null);

    // Form state
    const [periodeId, setPeriodeId] = useState('');
    const [dapurId, setDapurId] = useState('');
    const [tanggal, setTanggal] = useState(new Date());
    const [items, setItems] = useState([]);

    // Options state
    const [periodeList, setPeriodeList] = useState([]);
    const [dapurList, setDapurList] = useState([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Loading state
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            setLoading(true);
            const [periodeRes, dapurRes] = await Promise.all([
                periodeAPI.getAll({ limit: 50, isClosed: false }),
                dapurAPI.getAll({ limit: 100, isActive: true }),
            ]);

            if (periodeRes.data.success) {
                setPeriodeList(periodeRes.data.data);
            }
            if (dapurRes.data.success) {
                setDapurList(dapurRes.data.data);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    // Debounced search function
    const searchBarang = useCallback(
        debounce(async (query) => {
            if (!query || query.length < 2) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }

            try {
                setSearchLoading(true);
                const response = await barangAPI.search({ q: query, limit: 10 });
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
        searchBarang(value);
    };

    const handleSelectBarang = (barang) => {
        // Check if already added
        if (items.some((item) => item.barang_id === barang._id)) {
            toast.warning('Barang sudah ada dalam daftar');
            return;
        }

        // Add to items
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

        // Clear search
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        searchInputRef.current?.focus();
    };

    const handleQtyChange = (index, qty) => {
        const newQty = Math.max(1, parseInt(qty) || 1);
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, qty: newQty } : item))
        );
    };

    const handleHargaJualChange = (index, harga) => {
        const newHarga = Math.max(0, parseInt(harga) || 0);
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, harga_jual: newHarga } : item))
        );
    };

    const handleHargaModalChange = (index, harga) => {
        const newHarga = Math.max(0, parseInt(harga) || 0);
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, harga_modal: newHarga } : item))
        );
    };

    const handleRemoveItem = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const calculateSubtotal = (item) => {
        return item.qty * item.harga_jual;
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
    };

    const calculateTotalModal = () => {
        return items.reduce((sum, item) => sum + (item.qty * item.harga_modal), 0);
    };

    const handleSubmit = async (complete = false) => {
        // Validation
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

        try {
            setSubmitting(true);

            // Create transaksi
            const payload = {
                periode_id: periodeId,
                dapur_id: dapurId,
                tanggal: tanggal.toISOString(),
                items: items.map((item) => ({
                    barang_id: item.barang_id,
                    qty: item.qty,
                    harga_jual: item.harga_jual,
                    harga_modal: item.harga_modal,
                })),
            };

            const createRes = await transaksiAPI.create(payload);

            if (!createRes.data.success) {
                throw new Error(createRes.data.message);
            }

            // Complete if requested
            if (complete) {
                const completeRes = await transaksiAPI.complete(createRes.data.data._id);
                if (completeRes.data.success) {
                    toast.success('Transaksi berhasil disimpan dan selesai');
                }
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

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Input Transaksi Baru</h1>
                    <p className="text-gray-500 mt-1">Masukkan data barang untuk transaksi</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                {/* Header Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Periode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Periode <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={periodeId}
                            onChange={(e) => setPeriodeId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
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
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
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
                    <div>
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
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                            Tidak ada barang ditemukan
                        </div>
                    )}
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">No</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Nama Barang</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">UD</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Satuan</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Qty</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Harga Modal</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Harga Jual</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-gray-500">
                                            <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                            <p>Belum ada barang ditambahkan</p>
                                            <p className="text-sm">Cari dan pilih barang dari kolom pencarian di atas</p>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, index) => (
                                        <tr key={item.barang_id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">{item.nama_barang}</p>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <p className="text-sm text-gray-600">{item.ud_nama}</p>
                                                <p className="text-xs text-gray-400">{item.ud_kode}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 text-xs bg-gray-100 rounded">{item.satuan}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => handleQtyChange(index, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    min="1"
                                                    className="w-20 px-2 py-1 border border-gray-200 rounded text-center mx-auto"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.harga_modal}
                                                    onChange={(e) => handleHargaModalChange(index, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    min="0"
                                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-right ml-auto block"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.harga_jual}
                                                    onChange={(e) => handleHargaJualChange(index, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    min="0"
                                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-right ml-auto block"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                {formatCurrency(calculateSubtotal(item))}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {items.length > 0 && (
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan={6} className="px-4 py-4 text-right font-semibold text-gray-700">
                                            TOTAL
                                        </td>
                                        <td className="px-4 py-4 text-right text-xl font-bold text-blue-600">
                                            {formatCurrency(calculateTotal())}
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={6} className="px-4 py-2 text-right text-sm text-gray-500">
                                            Total Modal
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-600">
                                            {formatCurrency(calculateTotalModal())}
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={6} className="px-4 py-2 text-right text-sm text-gray-500">
                                            Estimasi Keuntungan
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm font-semibold text-green-600">
                                            {formatCurrency(calculateTotal() - calculateTotalModal())}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
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
                        Simpan Draft
                    </button>
                    <button
                        onClick={() => handleSubmit(true)}
                        disabled={submitting || items.length === 0}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium
                     hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {submitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <CheckCircle className="w-5 h-5" />
                        )}
                        Simpan & Selesai
                    </button>
                </div>
            </div>
        </div>
    );
}
