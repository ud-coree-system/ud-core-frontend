'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Building2,
    Loader2,
    X,
    Eye,
} from 'lucide-react';
import { udAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const KBLI_OPTIONS = [
    'protein hewani dan beras',
    'barang toko',
    'non makanan',
    'barang pasar (sayur, buah, dan roti rotian)',
    'Lainnya',
];

const INITIAL_FORM = {
    nama_ud: '',
    alamat: '',
    nama_pemilik: '',
    bank: '',
    no_rekening: '',
    kbli: [],
    kbliLainnya: '',
    isActive: true,
};

export default function UDManagementPage() {
    const { toast } = useToast();

    // State
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
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

    // View modal state
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [pagination.page, search]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: search || undefined,
            };
            const response = await udAPI.getAll(params);
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

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData(INITIAL_FORM);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);

        // Extract custom KBLI (value that's not in KBLI_OPTIONS)
        const kbliArr = item.kbli || [];
        const kbliLainnya = kbliArr.find(k => !KBLI_OPTIONS.includes(k) && k !== 'Lainnya') || '';

        // Check if "Lainnya" should be marked as checked
        const processedKbli = kbliArr.map(k => KBLI_OPTIONS.includes(k) ? k : 'Lainnya');
        const uniqueKbli = [...new Set(processedKbli)];

        setFormData({
            nama_ud: item.nama_ud || '',
            alamat: item.alamat || '',
            nama_pemilik: item.nama_pemilik || '',
            bank: item.bank || '',
            no_rekening: item.no_rekening || '',
            kbli: uniqueKbli,
            kbliLainnya: kbliLainnya,
            isActive: item.isActive ?? true,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingItem(null);
        setFormData(INITIAL_FORM);
    };

    const openViewModal = (item) => {
        setViewingItem(item);
        setViewModalOpen(true);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setViewingItem(null);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleKbliChange = (kbli) => {
        setFormData((prev) => {
            const isRemoving = prev.kbli.includes(kbli);
            const newKbli = isRemoving
                ? prev.kbli.filter((k) => k !== kbli)
                : [...prev.kbli, kbli];

            return {
                ...prev,
                kbli: newKbli,
                // Clear kbliLainnya if "Lainnya" is unchecked
                kbliLainnya: kbli === 'Lainnya' && isRemoving ? '' : prev.kbliLainnya
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nama_ud.trim()) {
            toast.warning('Nama UD harus diisi');
            return;
        }

        try {
            setFormLoading(true);

            // Merge kbliLainnya into kbli array if "Lainnya" is checked
            const finalKbli = formData.kbli.map(k => {
                if (k === 'Lainnya') return formData.kbliLainnya;
                return k;
            }).filter(k => k && k.trim() !== '');

            const submissionData = {
                ...formData,
                kbli: finalKbli
            };
            // Remove helper field before sending to API
            delete submissionData.kbliLainnya;

            if (editingItem) {
                await udAPI.update(editingItem._id, submissionData);
                toast.success('UD berhasil diperbarui');
            } else {
                await udAPI.create(submissionData);
                toast.success('UD berhasil ditambahkan');
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
            await udAPI.delete(deletingItem._id);
            toast.success('UD berhasil dihapus');
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
        <div className="space-y-6 pb-20">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Management UD</h1>
                    <p className="text-gray-500 mt-1">Kelola data Usaha Dagang</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium w-full sm:w-auto"
                >
                    <Plus className="w-5 h-5" />
                    Tambah UD
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearch}
                        placeholder="Cari nama UD, pemilik, atau kode..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
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
                        icon={Building2}
                        title="Belum ada data UD"
                        description="Tambahkan data UD baru untuk memulai"
                        action={
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah UD
                            </button>
                        }
                    />
                ) : (
                    <>
                        {/* Table View (Desktop) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            No
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Kode UD
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Nama UD
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {data.map((item, index) => (
                                        <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(pagination.page - 1) * pagination.limit + index + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm bg-gray-100 px-2.5 py-1 rounded font-medium text-gray-900">
                                                    {item.kode_ud}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.nama_ud}</p>
                                                    <p className="text-sm text-gray-500 truncate max-w-[200px] lg:max-w-xs mt-0.5">
                                                        {item.alamat || '-'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full
                                                    ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                                `}>
                                                    {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openViewModal(item)}
                                                        className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
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

                        {/* Card View (Mobile) */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {data.map((item, index) => (
                                <div key={item._id} className="p-4 space-y-4 text-[10px] sm:text-xs">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">
                                                    #{(pagination.page - 1) * pagination.limit + index + 1}
                                                </span>
                                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600">
                                                    {item.kode_ud}
                                                </span>
                                                <span className={`px-2 py-0.5 font-semibold rounded-full
                                                    ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                                `}>
                                                    {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">
                                                {item.nama_ud}
                                            </h3>
                                            <p className="text-gray-500 line-clamp-2 mt-1">
                                                {item.alamat || 'Tidak ada alamat'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => openViewModal(item)}
                                                className="p-2 bg-green-50 text-green-600 rounded-lg"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => openDeleteDialog(item)}
                                                className="p-2 bg-red-50 text-red-600 rounded-lg"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm text-gray-500 order-2 sm:order-1">
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
                title={editingItem ? 'Edit UD' : 'Tambah UD Baru'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nama UD */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama UD <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nama_ud"
                            value={formData.nama_ud}
                            onChange={handleFormChange}
                            placeholder="Contoh: UD Amanah Sumber Makmur"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Alamat */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Alamat
                        </label>
                        <textarea
                            name="alamat"
                            value={formData.alamat}
                            onChange={handleFormChange}
                            rows={2}
                            placeholder="Alamat lengkap UD"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Nama Pemilik */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Pemilik (An.)
                        </label>
                        <input
                            type="text"
                            name="nama_pemilik"
                            value={formData.nama_pemilik}
                            onChange={handleFormChange}
                            placeholder="Contoh: An. Ulul Azmi"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Bank & Rekening */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bank
                            </label>
                            <input
                                type="text"
                                name="bank"
                                value={formData.bank}
                                onChange={handleFormChange}
                                placeholder="Contoh: Mandiri"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                No. Rekening
                            </label>
                            <input
                                type="text"
                                name="no_rekening"
                                value={formData.no_rekening}
                                onChange={handleFormChange}
                                placeholder="Contoh: 1610016136421"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* KBLI */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            KBLI (Kategori Barang)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {KBLI_OPTIONS.map((kbli) => (
                                <label
                                    key={kbli}
                                    className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer
                           hover:bg-gray-50 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.kbli.includes(kbli)}
                                        onChange={() => handleKbliChange(kbli)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                    />
                                    <span className="text-sm">{kbli}</span>
                                </label>
                            ))}
                        </div>

                        {/* Custom KBLI Input */}
                        {formData.kbli.includes('Lainnya') && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <label className="block text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wider">
                                    Sebutkan KBLI Lainnya
                                </label>
                                <input
                                    type="text"
                                    name="kbliLainnya"
                                    value={formData.kbliLainnya}
                                    onChange={handleFormChange}
                                    placeholder="Masukkan nama KBLI lainnya..."
                                    className="w-full px-3 py-2 border border-blue-200 bg-blue-50/30 rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                                     placeholder:text-gray-400 text-sm"
                                    autoFocus
                                />
                            </div>
                        )}
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
                                    UD Aktif
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
                            {formLoading ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah UD'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Detail Modal */}
            <Modal
                isOpen={viewModalOpen}
                onClose={closeViewModal}
                title="Detail UD"
                size="lg"
            >
                {viewingItem && (
                    <div className="space-y-6">
                        {/* Header Section */}
                        <div className="pb-4 border-b border-gray-200">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{viewingItem.nama_ud}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="font-mono text-sm bg-blue-100 px-3 py-1 rounded font-medium text-blue-800">
                                            {viewingItem.kode_ud}
                                        </span>
                                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full
                                            ${viewingItem.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                        `}>
                                            {viewingItem.isActive ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Alamat
                                </label>
                                <p className="text-gray-900">{viewingItem.alamat || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Nama Pemilik
                                </label>
                                <p className="text-gray-900">{viewingItem.nama_pemilik || '-'}</p>
                            </div>
                        </div>

                        {/* Banking Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Bank
                                </label>
                                <p className="text-gray-900">{viewingItem.bank || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    No. Rekening
                                </label>
                                <p className="text-gray-900 font-mono">{viewingItem.no_rekening || '-'}</p>
                            </div>
                        </div>

                        {/* KBLI Categories */}
                        <div className="pt-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                KBLI (Kategori Barang)
                            </label>
                            {viewingItem.kbli && viewingItem.kbli.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {viewingItem.kbli.map((kbli, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium
                                                bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200"
                                        >
                                            {kbli}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">Tidak ada kategori</p>
                            )}
                        </div>

                        {/* Metadata */}
                        {(viewingItem.createdAt || viewingItem.updatedAt) && (
                            <div className="pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                                    {viewingItem.createdAt && (
                                        <div>
                                            <span className="font-semibold">Dibuat: </span>
                                            {new Date(viewingItem.createdAt).toLocaleString('id-ID', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })}
                                        </div>
                                    )}
                                    {viewingItem.updatedAt && (
                                        <div>
                                            <span className="font-semibold">Diperbarui: </span>
                                            {new Date(viewingItem.updatedAt).toLocaleString('id-ID', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Close Button */}
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={closeViewModal}
                                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium
                                    hover:bg-gray-200 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setDeletingItem(null);
                }}
                onConfirm={handleDelete}
                title="Hapus UD"
                message={`Apakah Anda yakin ingin menghapus "${deletingItem?.nama_ud}"? Data yang sudah dihapus tidak dapat dikembalikan.`}
                confirmText="Ya, Hapus"
                loading={deleteLoading}
            />
        </div>
    );
}
