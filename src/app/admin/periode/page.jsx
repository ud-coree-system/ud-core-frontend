'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Calendar,
    Loader2,
    Lock,
    Unlock,
} from 'lucide-react';
import { periodeAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatDate, toDateInputValue } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const INITIAL_FORM = {
    nama_periode: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    isActive: true,
};

export default function PeriodeManagementPage() {
    const { toast } = useToast();

    // State
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
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

    // Close periode state
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closingItem, setClosingItem] = useState(null);
    const [closeLoading, setCloseLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [pagination.page]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            const response = await periodeAPI.getAll(params);
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

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData(INITIAL_FORM);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        if (item.isClosed) {
            toast.warning('Periode yang sudah ditutup tidak dapat diedit');
            return;
        }
        setEditingItem(item);
        setFormData({
            nama_periode: item.nama_periode || '',
            tanggal_mulai: toDateInputValue(item.tanggal_mulai),
            tanggal_selesai: toDateInputValue(item.tanggal_selesai),
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

        if (!formData.nama_periode.trim()) {
            toast.warning('Nama periode harus diisi');
            return;
        }
        if (!formData.tanggal_mulai) {
            toast.warning('Tanggal mulai harus diisi');
            return;
        }
        if (!formData.tanggal_selesai) {
            toast.warning('Tanggal selesai harus diisi');
            return;
        }
        if (new Date(formData.tanggal_selesai) < new Date(formData.tanggal_mulai)) {
            toast.warning('Tanggal selesai tidak boleh sebelum tanggal mulai');
            return;
        }

        try {
            setFormLoading(true);

            if (editingItem) {
                await periodeAPI.update(editingItem._id, formData);
                toast.success('Periode berhasil diperbarui');
            } else {
                await periodeAPI.create(formData);
                toast.success('Periode berhasil ditambahkan');
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
        if (item.isClosed) {
            toast.warning('Periode yang sudah ditutup tidak dapat dihapus');
            return;
        }
        setDeletingItem(item);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;

        try {
            setDeleteLoading(true);
            await periodeAPI.delete(deletingItem._id);
            toast.success('Periode berhasil dihapus');
            setDeleteDialogOpen(false);
            setDeletingItem(null);
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setDeleteLoading(false);
        }
    };

    const openCloseDialog = (item) => {
        if (item.isClosed) {
            toast.info('Periode sudah ditutup');
            return;
        }
        setClosingItem(item);
        setCloseDialogOpen(true);
    };

    const handleClosePeriode = async () => {
        if (!closingItem) return;

        try {
            setCloseLoading(true);
            await periodeAPI.close(closingItem._id);
            toast.success('Periode berhasil ditutup');
            setCloseDialogOpen(false);
            setClosingItem(null);
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setCloseLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Management Periode</h1>
                    <p className="text-gray-500 mt-1">Kelola data periode operasional</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Periode
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : data.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title="Belum ada data periode"
                        description="Tambahkan data periode baru untuk memulai"
                        action={
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Periode
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left">Nama Periode</th>
                                        <th className="text-left">Tanggal Mulai</th>
                                        <th className="text-left">Tanggal Selesai</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <p className="font-medium text-gray-900">{item.nama_periode}</p>
                                            </td>
                                            <td>
                                                <p className="text-gray-700">{formatDate(item.tanggal_mulai)}</p>
                                            </td>
                                            <td>
                                                <p className="text-gray-700">{formatDate(item.tanggal_selesai)}</p>
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full
                            ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          `}>
                                                        {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                    {item.isClosed && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                                            <Lock className="w-3 h-3" />
                                                            Closed
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-center gap-2">
                                                    {!item.isClosed && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(item)}
                                                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openCloseDialog(item)}
                                                                className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"
                                                                title="Tutup Periode"
                                                            >
                                                                <Lock className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteDialog(item)}
                                                                className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.isClosed && (
                                                        <span className="text-sm text-gray-400 italic">Terkunci</span>
                                                    )}
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
                title={editingItem ? 'Edit Periode' : 'Tambah Periode Baru'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nama Periode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Periode <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nama_periode"
                            value={formData.nama_periode}
                            onChange={handleFormChange}
                            placeholder="Contoh: Periode 5"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Tanggal Mulai & Selesai */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tanggal Mulai <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="tanggal_mulai"
                                value={formData.tanggal_mulai}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tanggal Selesai <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="tanggal_selesai"
                                value={formData.tanggal_selesai}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
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
                                    Periode Aktif
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
                            {formLoading ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Periode'}
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
                title="Hapus Periode"
                message={`Apakah Anda yakin ingin menghapus "${deletingItem?.nama_periode}"?`}
                confirmText="Ya, Hapus"
                loading={deleteLoading}
            />

            {/* Close Periode Dialog */}
            <ConfirmDialog
                isOpen={closeDialogOpen}
                onClose={() => {
                    setCloseDialogOpen(false);
                    setClosingItem(null);
                }}
                onConfirm={handleClosePeriode}
                title="Tutup Periode"
                message={`Apakah Anda yakin ingin menutup "${closingItem?.nama_periode}"? Periode yang sudah ditutup tidak dapat diubah atau dihapus.`}
                confirmText="Ya, Tutup"
                variant="warning"
                loading={closeLoading}
            />
        </div>
    );
}
