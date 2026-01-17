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
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Management Dapur</h1>
                    <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">Kelola data Dapur MBG</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl
                   hover:bg-blue-700 active:bg-blue-800 transition-all font-medium shadow-sm shadow-blue-200 w-full sm:w-auto"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Dapur
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearch}
                        placeholder="Cari nama dapur atau kode..."
                        className="w-full pl-11 pr-4 py-3 sm:py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl
                     focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all
                     text-sm sm:text-base"
                    />
                </div>
            </div>

            {/* Content Container */}
            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white rounded-2xl border border-gray-100 py-12 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100">
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
                    </div>
                ) : (
                    <>
                        {/* Mobile View (Cards) */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {data.map((item, index) => (
                                <div key={item._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                                    #{(pagination.page - 1) * pagination.limit + index + 1}
                                                </span>
                                                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
                                                    {item.kode_dapur}
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider
                                                    ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                                                `}>
                                                    {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-lg">{item.nama_dapur}</h3>
                                            <p className="text-gray-500 text-sm line-clamp-2">
                                                {item.alamat || 'Alamat tidak tersedia'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openDeleteDialog(item)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View (Table) */}
                        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-3 md:px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">
                                                No
                                            </th>
                                            <th className="hidden lg:table-cell px-3 md:px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Kode Dapur
                                            </th>
                                            <th className="px-3 md:px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Nama Dapur
                                            </th>
                                            <th className="px-3 md:px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Alamat
                                            </th>
                                            <th className="hidden lg:table-cell px-3 md:px-4 lg:px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-3 md:px-4 lg:px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {data.map((item, index) => (
                                            <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {(pagination.page - 1) * pagination.limit + index + 1}
                                                </td>
                                                <td className="hidden lg:table-cell px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                                        {item.kode_dapur}
                                                    </span>
                                                </td>
                                                <td className="px-3 md:px-4 lg:px-6 py-4">
                                                    <p className="font-semibold text-gray-900 line-clamp-2 md:line-clamp-1">{item.nama_dapur}</p>
                                                </td>
                                                <td className="px-3 md:px-4 lg:px-6 py-4">
                                                    <p className="text-gray-500 truncate max-w-[150px] md:max-w-[200px] lg:max-w-[250px]">
                                                        {item.alamat || '-'}
                                                    </p>
                                                </td>
                                                <td className="hidden lg:table-cell px-3 md:px-4 lg:px-6 py-4 text-center">
                                                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider
                                ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                              `}>
                                                        {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-3 md:px-4 lg:px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => openEditModal(item)}
                                                            className="p-1.5 md:p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-all hover:scale-110"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteDialog(item)}
                                                            className="p-1.5 md:p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all hover:scale-110"
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
                        </div>

                        {/* Pagination Container */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm text-gray-500 font-medium">
                                    Menampilkan <span className="text-gray-900">{data.length}</span> dari <span className="text-gray-900">{pagination.totalDocuments}</span> data
                                </p>
                                <div className="w-full sm:w-auto overflow-x-auto flex justify-center">
                                    <Pagination
                                        currentPage={pagination.page}
                                        totalPages={pagination.totalPages}
                                        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )
                }
            </div >

            {/* Create/Edit Modal */}
            < Modal
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
            </Modal >

            {/* Delete Confirm Dialog */}
            < ConfirmDialog
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
        </div >
    );
}
