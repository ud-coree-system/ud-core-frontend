'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    ChefHat,
    Loader2,
} from 'lucide-react';
import { dapurAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const INITIAL_FORM = {
    nama_dapur: '',
    alamat: '',
    isActive: true,
};

export default function DapurManagementPage() {
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
            const response = await dapurAPI.getAll(params);
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
            nama_dapur: item.nama_dapur || '',
            alamat: item.alamat || '',
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

        if (!formData.nama_dapur.trim()) {
            toast.warning('Nama dapur harus diisi');
            return;
        }

        try {
            setFormLoading(true);

            if (editingItem) {
                await dapurAPI.update(editingItem._id, formData);
                toast.success('Dapur berhasil diperbarui');
            } else {
                await dapurAPI.create(formData);
                toast.success('Dapur berhasil ditambahkan');
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
            await dapurAPI.delete(deletingItem._id);
            toast.success('Dapur berhasil dihapus');
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
                    <h1 className="text-2xl font-bold text-gray-900">Management Dapur</h1>
                    <p className="text-gray-500 mt-1">Kelola data Dapur MBG</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Dapur
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
                        placeholder="Cari nama dapur atau kode..."
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
                        icon={ChefHat}
                        title="Belum ada data dapur"
                        description="Tambahkan data dapur baru untuk memulai"
                        action={
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Dapur
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left">Kode Dapur</th>
                                        <th className="text-left">Nama Dapur</th>
                                        <th className="text-left hidden md:table-cell">Alamat</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {item.kode_dapur}
                                                </span>
                                            </td>
                                            <td>
                                                <p className="font-medium text-gray-900">{item.nama_dapur}</p>
                                            </td>
                                            <td className="hidden md:table-cell">
                                                <p className="text-gray-500 truncate max-w-[250px]">
                                                    {item.alamat || '-'}
                                                </p>
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
                title={editingItem ? 'Edit Dapur' : 'Tambah Dapur Baru'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nama Dapur */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Dapur <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nama_dapur"
                            value={formData.nama_dapur}
                            onChange={handleFormChange}
                            placeholder="Contoh: SPPG Pagutan"
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
                            rows={3}
                            placeholder="Alamat lengkap dapur"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
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
                                    Dapur Aktif
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
                            {formLoading ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Dapur'}
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
                title="Hapus Dapur"
                message={`Apakah Anda yakin ingin menghapus "${deletingItem?.nama_dapur}"?`}
                confirmText="Ya, Hapus"
                loading={deleteLoading}
            />
        </div>
    );
}
