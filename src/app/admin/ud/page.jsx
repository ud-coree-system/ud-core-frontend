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
} from 'lucide-react';
import { udAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const KBLI_OPTIONS = [
    'Sayur',
    'Buah',
    'Roti, Kue Kering dan Basah',
    'Makanan Minuman Supermarket Tradisional (Susu)',
    'Air Galon',
    'Bumbu',
    'Lauk Pauk',
    'Lainnya',
];

const INITIAL_FORM = {
    nama_ud: '',
    alamat: '',
    nama_pemilik: '',
    bank: '',
    no_rekening: '',
    kbli: [],
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
        setFormData({
            nama_ud: item.nama_ud || '',
            alamat: item.alamat || '',
            nama_pemilik: item.nama_pemilik || '',
            bank: item.bank || '',
            no_rekening: item.no_rekening || '',
            kbli: item.kbli || [],
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

    const handleKbliChange = (kbli) => {
        setFormData((prev) => ({
            ...prev,
            kbli: prev.kbli.includes(kbli)
                ? prev.kbli.filter((k) => k !== kbli)
                : [...prev.kbli, kbli],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nama_ud.trim()) {
            toast.warning('Nama UD harus diisi');
            return;
        }

        try {
            setFormLoading(true);

            if (editingItem) {
                await udAPI.update(editingItem._id, formData);
                toast.success('UD berhasil diperbarui');
            } else {
                await udAPI.create(formData);
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
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Management UD</h1>
                    <p className="text-gray-500 mt-1">Kelola data Usaha Dagang</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium"
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
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left">Kode UD</th>
                                        <th className="text-left">Nama UD</th>
                                        <th className="text-left hidden md:table-cell">Pemilik</th>
                                        <th className="text-left hidden lg:table-cell">Bank</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {item.kode_ud}
                                                </span>
                                            </td>
                                            <td>
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.nama_ud}</p>
                                                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                                        {item.alamat || '-'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell">
                                                {item.nama_pemilik || '-'}
                                            </td>
                                            <td className="hidden lg:table-cell">
                                                <div className="text-sm">
                                                    <p>{item.bank || '-'}</p>
                                                    <p className="text-gray-500">{item.no_rekening || '-'}</p>
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
                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-2 gap-2">
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
