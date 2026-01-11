'use client';

import { useState, useEffect } from 'react';
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
];

const INITIAL_FORM = {
    nama_barang: '',
    satuan: 'pcs',
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
        setFormData({
            nama_barang: item.nama_barang || '',
            satuan: item.satuan || 'pcs',
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
                harga_jual: parseFloat(formData.harga_jual),
                harga_modal: formData.harga_modal ? parseFloat(formData.harga_modal) : 0,
            };

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
                    <h1 className="text-2xl font-bold text-gray-900">Management Barang</h1>
                    <p className="text-gray-500 mt-1">Kelola data barang dari berbagai UD</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Barang
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={handleSearch}
                            placeholder="Cari nama barang..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Filter by UD */}
                    <div className="relative sm:w-64">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={filterUD}
                            onChange={handleFilterUD}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg appearance-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua UD</option>
                            {udList.map((ud) => (
                                <option key={ud._id} value={ud._id}>
                                    {ud.nama_ud}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

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
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left">Nama Barang</th>
                                        <th className="text-center">Satuan</th>
                                        <th className="text-right">Harga Jual</th>
                                        <th className="text-right hidden md:table-cell">Harga Modal</th>
                                        <th className="text-left hidden lg:table-cell">UD</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <p className="font-medium text-gray-900">{item.nama_barang}</p>
                                            </td>
                                            <td className="text-center">
                                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                                                    {item.satuan}
                                                </span>
                                            </td>
                                            <td className="text-right font-medium text-gray-900">
                                                {formatCurrency(item.harga_jual)}
                                            </td>
                                            <td className="text-right hidden md:table-cell text-gray-500">
                                                {formatCurrency(item.harga_modal || 0)}
                                            </td>
                                            <td className="hidden lg:table-cell">
                                                <div>
                                                    <p className="text-sm text-gray-900">{item.ud_id?.nama_ud || '-'}</p>
                                                    <p className="text-xs text-gray-500">{item.ud_id?.kode_ud || ''}</p>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full
                          ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        `}>
                                                    {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteDialog(item)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Menampilkan {data.length} dari {pagination.totalDocuments} data
                                </p>
                                <Pagination
                                    currentPage={pagination.page}
                                    totalPages={pagination.totalPages}
                                    onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                                />
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
                                step="100"
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
                                step="100"
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
