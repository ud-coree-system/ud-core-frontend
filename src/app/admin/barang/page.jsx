'use client';

import { useState, useEffect, Fragment } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    Loader2,
    Filter,
} from 'lucide-react';
import { barangAPI, udAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

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

const INITIAL_FORM = {
    nama_barang: '',
    satuan: 'pcs',
    custom_satuan: '',
    harga_jual: '',
    harga_modal: '',
    ud_id: '',
    isActive: true,
};

export default function BarangManagementPage() {
    const { toast } = useToast();

    // State
    const [data, setData] = useState([]);
    const [udList, setUdList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterUD, setFilterUD] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalDocuments: 0,
    });

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [formLoading, setFormLoading] = useState(false);

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        fetchUDList();
    }, []);

    useEffect(() => {
        fetchData();
    }, [pagination.page, search, filterUD]);

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

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: search || undefined,
                ud_id: filterUD || undefined,
            };
            const response = await barangAPI.getAll(params);
            if (response.data.success) {
                setData(response.data.data);
                setPagination((prev) => ({
                    ...prev,
                    ...response.data.pagination,
                }));
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const handleFilterUD = (e) => {
        setFilterUD(e.target.value);
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData(INITIAL_FORM);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        // Check if satuan is a custom value (not in predefined options)
        const isCustomSatuan = !SATUAN_OPTIONS.some(opt => opt.value === item.satuan);
        setFormData({
            nama_barang: item.nama_barang || '',
            satuan: isCustomSatuan ? 'lainnya' : (item.satuan || 'pcs'),
            custom_satuan: isCustomSatuan ? item.satuan : '',
            harga_jual: item.harga_jual?.toString() || '',
            harga_modal: item.harga_modal?.toString() || '',
            ud_id: item.ud_id?._id || '',
            isActive: item.isActive ?? true,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingItem(null);
        setFormData(INITIAL_FORM);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nama_barang.trim()) {
            toast.warning('Nama barang harus diisi');
            return;
        }
        if (formData.satuan === 'lainnya' && !formData.custom_satuan.trim()) {
            toast.warning('Satuan custom harus diisi');
            return;
        }
        if (!formData.harga_jual || parseFloat(formData.harga_jual) <= 0) {
            toast.warning('Harga jual harus diisi dan lebih dari 0');
            return;
        }
        if (!formData.ud_id) {
            toast.warning('UD harus dipilih');
            return;
        }

        try {
            setFormLoading(true);

            const payload = {
                ...formData,
                satuan: formData.satuan === 'lainnya' ? formData.custom_satuan.trim() : formData.satuan,
                harga_jual: parseFloat(formData.harga_jual),
                harga_modal: formData.harga_modal ? parseFloat(formData.harga_modal) : 0,
            };
            // Remove custom_satuan from payload
            delete payload.custom_satuan;

            if (editingItem) {
                await barangAPI.update(editingItem._id, payload);
                toast.success('Barang berhasil diperbarui');
            } else {
                await barangAPI.create(payload);
                toast.success('Barang berhasil ditambahkan');
            }

            closeModal();
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setFormLoading(false);
        }
    };

    const openDeleteDialog = (item) => {
        setDeletingItem(item);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;

        try {
            setDeleteLoading(true);
            await barangAPI.delete(deletingItem._id);
            toast.success('Barang berhasil dihapus');
            setDeleteDialogOpen(false);
            setDeletingItem(null);
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Management Barang</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Kelola data barang dari berbagai UD</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Barang
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={handleSearch}
                            placeholder="Cari nama barang..."
                            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Filter by UD */}
                    <div className="relative sm:w-64">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
                        <select
                            value={filterUD}
                            onChange={handleFilterUD}
                            className="w-full pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 rounded-lg appearance-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua UD</option>
                            {udList.map((ud) => (
                                <option key={ud._id} value={ud._id}>
                                    {ud.nama_ud}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* UD Filter Indicator */}
            {filterUD && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Filter className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Filter Aktif</p>
                                <p className="text-gray-900 font-semibold">
                                    {udList.find(ud => ud._id === filterUD)?.nama_ud || 'UD'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Menampilkan barang dari UD ini saja
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setFilterUD('')}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                            Hapus Filter
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : data.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="Belum ada data barang"
                        description="Tambahkan data barang baru untuk memulai"
                        action={
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Barang
                            </button>
                        }
                    />
                ) : (
                    <>
                        {/* Desktop View Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                                            No
                                        </th>
                                        <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Nama Barang
                                        </th>
                                        <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Satuan
                                        </th>
                                        <th className="px-3 md:px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Harga Jual
                                        </th>
                                        <th className="hidden xl:table-cell px-3 md:px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Harga Modal
                                        </th>
                                        <th className="hidden lg:table-cell px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            UD
                                        </th>
                                        <th className="hidden lg:table-cell px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {(() => {
                                        if (filterUD) {
                                            return data.map((item, index) => (
                                                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-3 md:px-4 py-4 text-center text-gray-500 font-medium">
                                                        {(pagination.page - 1) * pagination.limit + index + 1}
                                                    </td>
                                                    <td className="px-3 md:px-4 py-4 min-w-[150px]">
                                                        <p className="font-medium text-gray-900 line-clamp-2 md:line-clamp-1">{item.nama_barang}</p>
                                                    </td>
                                                    <td className="px-3 md:px-4 py-4 text-center">
                                                        <span className="px-2 py-1 text-[10px] md:text-xs font-medium bg-gray-100 text-gray-700 rounded uppercase">
                                                            {item.satuan}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 md:px-4 py-4 text-right font-medium text-gray-900 text-sm md:text-base">
                                                        {formatCurrency(item.harga_jual)}
                                                    </td>
                                                    <td className="hidden xl:table-cell px-3 md:px-4 py-4 text-right text-gray-500">
                                                        {formatCurrency(item.harga_modal || 0)}
                                                    </td>
                                                    <td className="hidden lg:table-cell px-3 md:px-4 py-4">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{item.ud_id?.nama_ud || '-'}</p>
                                                            <p className="text-xs text-gray-500">{item.ud_id?.kode_ud || ''}</p>
                                                        </div>
                                                    </td>
                                                    <td className="hidden lg:table-cell px-3 md:px-4 py-4 text-center">
                                                        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full
                                                   ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                                 `}>
                                                            {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 md:px-4 py-4">
                                                        <div className="flex items-center justify-center gap-1 md:gap-2">
                                                            <button
                                                                onClick={() => openEditModal(item)}
                                                                className="p-1.5 md:p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteDialog(item)}
                                                                className="p-1.5 md:p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ));
                                        }

                                        // Grouping by UD
                                        const groupedData = data.reduce((acc, item) => {
                                            const udId = item.ud_id?._id || 'others';
                                            if (!acc[udId]) {
                                                acc[udId] = {
                                                    ud: item.ud_id,
                                                    items: []
                                                };
                                            }
                                            acc[udId].items.push(item);
                                            return acc;
                                        }, {});

                                        let globalIndex = (pagination.page - 1) * pagination.limit;

                                        return Object.entries(groupedData).map(([udId, group]) => (
                                            <Fragment key={udId}>
                                                <tr className="bg-gray-100/50">
                                                    <td colSpan="8" className="px-6 py-2">
                                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                                                            {group.ud?.nama_ud || 'Tanpa UD'} ({group.items.length} Barang)
                                                        </p>
                                                    </td>
                                                </tr>
                                                {group.items.map((item) => {
                                                    globalIndex++;
                                                    return (
                                                        <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-3 md:px-4 py-4 text-center text-gray-500 font-medium">
                                                                {globalIndex}
                                                            </td>
                                                            <td className="px-3 md:px-4 py-4 min-w-[150px]">
                                                                <p className="font-medium text-gray-900 line-clamp-2 md:line-clamp-1">{item.nama_barang}</p>
                                                            </td>
                                                            <td className="px-3 md:px-4 py-4 text-center">
                                                                <span className="px-2 py-1 text-[10px] md:text-xs font-medium bg-gray-100 text-gray-700 rounded uppercase">
                                                                    {item.satuan}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 md:px-4 py-4 text-right font-medium text-gray-900 text-sm md:text-base">
                                                                {formatCurrency(item.harga_jual)}
                                                            </td>
                                                            <td className="hidden xl:table-cell px-3 md:px-4 py-4 text-right text-gray-500">
                                                                {formatCurrency(item.harga_modal || 0)}
                                                            </td>
                                                            <td className="hidden lg:table-cell px-3 md:px-4 py-4">
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">{item.ud_id?.nama_ud || '-'}</p>
                                                                    <p className="text-xs text-gray-500">{item.ud_id?.kode_ud || ''}</p>
                                                                </div>
                                                            </td>
                                                            <td className="hidden lg:table-cell px-3 md:px-4 py-4 text-center">
                                                                <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full
                                                           ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                                         `}>
                                                                    {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 md:px-4 py-4">
                                                                <div className="flex items-center justify-center gap-1 md:gap-2">
                                                                    <button
                                                                        onClick={() => openEditModal(item)}
                                                                        className="p-1.5 md:p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openDeleteDialog(item)}
                                                                        className="p-1.5 md:p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                                        title="Hapus"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </Fragment>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View Cards */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {(() => {
                                if (filterUD) {
                                    return data.map((item, index) => (
                                        <div key={item._id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors relative">
                                            <div className="absolute top-4 left-4 -ml-2 -mt-2">
                                                <span className="w-5 h-5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full flex items-center justify-center">
                                                    {(pagination.page - 1) * pagination.limit + index + 1}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start gap-4 pl-6">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 leading-tight">
                                                        {item.nama_barang}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1.5 font-sm">
                                                        <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded uppercase">
                                                            {item.satuan}
                                                        </span>
                                                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full
                                                          ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                                        `}>
                                                            {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteDialog(item)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pl-6">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Harga Jual</p>
                                                    <p className="font-bold text-blue-600">{formatCurrency(item.harga_jual)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Harga Modal</p>
                                                    <p className="text-gray-900 font-medium">{formatCurrency(item.harga_modal || 0)}</p>
                                                </div>
                                            </div>

                                            {item.ud_id && (
                                                <div className="flex items-center gap-2.5 pt-2 border-t border-gray-50 pl-6">
                                                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                                                        <Package className="w-3.5 h-3.5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-gray-900 truncate">
                                                            {item.ud_id.nama_ud}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">{item.ud_id.kode_ud}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ));
                                }

                                const groupedData = data.reduce((acc, item) => {
                                    const udId = item.ud_id?._id || 'others';
                                    if (!acc[udId]) {
                                        acc[udId] = {
                                            ud: item.ud_id,
                                            items: []
                                        };
                                    }
                                    acc[udId].items.push(item);
                                    return acc;
                                }, {});

                                let globalIndex = (pagination.page - 1) * pagination.limit;

                                return Object.entries(groupedData).map(([udId, group]) => (
                                    <div key={udId} className="divide-y divide-gray-100">
                                        <div className="bg-gray-50 px-4 py-2 border-y border-gray-100">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                                {group.ud?.nama_ud || 'Tanpa UD'} ({group.items.length} Barang)
                                            </p>
                                        </div>
                                        {group.items.map((item) => {
                                            globalIndex++;
                                            return (
                                                <div key={item._id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors relative">
                                                    <div className="absolute top-4 left-4 -ml-2 -mt-2">
                                                        <span className="w-5 h-5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full flex items-center justify-center">
                                                            {globalIndex}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-start gap-4 pl-6">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-gray-900 leading-tight">
                                                                {item.nama_barang}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1.5 font-sm">
                                                                <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded uppercase">
                                                                    {item.satuan}
                                                                </span>
                                                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full
                                                                  ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                                                `}>
                                                                    {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => openEditModal(item)}
                                                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteDialog(item)}
                                                                className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 pl-6">
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Harga Jual</p>
                                                            <p className="font-bold text-blue-600">{formatCurrency(item.harga_jual)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Harga Modal</p>
                                                            <p className="text-gray-900 font-medium">{formatCurrency(item.harga_modal || 0)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
                                    Menampilkan {data.length} dari {pagination.totalDocuments} data
                                </p>
                                <div className="order-1 sm:order-2">
                                    <Pagination
                                        currentPage={pagination.page}
                                        totalPages={pagination.totalPages}
                                        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nama Barang */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Barang <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nama_barang"
                            value={formData.nama_barang}
                            onChange={handleFormChange}
                            placeholder="Contoh: Tempe"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Satuan */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Satuan <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="satuan"
                            value={formData.satuan}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            {SATUAN_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Satuan Input - Show when 'lainnya' is selected */}
                    {formData.satuan === 'lainnya' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Satuan Custom <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="custom_satuan"
                                value={formData.custom_satuan}
                                onChange={handleFormChange}
                                placeholder="Contoh: box, pak, bal, dll"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                    )}

                    {/* Harga Jual & Modal */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Harga Jual <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="harga_jual"
                                value={formData.harga_jual}
                                onChange={handleFormChange}
                                placeholder="0"
                                min="0"
                                step="1"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Harga Modal
                            </label>
                            <input
                                type="number"
                                name="harga_modal"
                                value={formData.harga_modal}
                                onChange={handleFormChange}
                                placeholder="0"
                                min="0"
                                step="1"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* UD */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            UD Referensi <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="ud_id"
                            value={formData.ud_id}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Pilih UD</option>
                            {udList.map((ud) => (
                                <option key={ud._id} value={ud._id}>
                                    {ud.nama_ud} ({ud.kode_ud})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    {editingItem && (
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleFormChange}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Barang Aktif
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium
                       hover:bg-gray-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {formLoading ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setDeletingItem(null);
                }}
                onConfirm={handleDelete}
                title="Hapus Barang"
                message={`Apakah Anda yakin ingin menghapus "${deletingItem?.nama_barang}"?`}
                confirmText="Ya, Hapus"
                loading={deleteLoading}
            />
        </div>
    );
}
