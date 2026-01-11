'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Users,
    Loader2,
    Eye,
    EyeOff,
} from 'lucide-react';
import { userAPI, udAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatDateTime } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const INITIAL_FORM = {
    username: '',
    email: '',
    password: '',
    role: 'ud_operator',
    ud_id: '',
    isActive: true,
};

export default function UserManagementPage() {
    const { toast } = useToast();
    const { isAdmin, user: currentUser } = useAuth();

    // State
    const [data, setData] = useState([]);
    const [udList, setUdList] = useState([]);
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
    const [showPassword, setShowPassword] = useState(false);

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (!isAdmin()) {
            toast.error('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
            return;
        }
        fetchUDList();
        fetchData();
    }, []);

    useEffect(() => {
        if (isAdmin()) {
            fetchData();
        }
    }, [pagination.page, search]);

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
            };
            const response = await userAPI.getAll(params);
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
        setShowPassword(false);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setFormData({
            username: item.username || '',
            email: item.email || '',
            password: '', // Don't show existing password
            role: item.role || 'ud_operator',
            ud_id: item.ud_id?._id || '',
            isActive: item.isActive ?? true,
        });
        setShowPassword(false);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingItem(null);
        setFormData(INITIAL_FORM);
        setShowPassword(false);
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

        if (!formData.username.trim()) {
            toast.warning('Username harus diisi');
            return;
        }
        if (!formData.email.trim()) {
            toast.warning('Email harus diisi');
            return;
        }
        if (!editingItem && !formData.password) {
            toast.warning('Password harus diisi');
            return;
        }

        try {
            setFormLoading(true);

            const payload = { ...formData };
            // Don't send empty password on edit
            if (editingItem && !payload.password) {
                delete payload.password;
            }
            // Don't send ud_id if admin
            if (payload.role === 'admin') {
                delete payload.ud_id;
            }

            if (editingItem) {
                await userAPI.update(editingItem._id, payload);
                toast.success('User berhasil diperbarui');
            } else {
                await userAPI.create(payload);
                toast.success('User berhasil ditambahkan');
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
        if (item._id === currentUser?._id) {
            toast.warning('Anda tidak dapat menghapus akun sendiri');
            return;
        }
        setDeletingItem(item);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;

        try {
            setDeleteLoading(true);
            await userAPI.delete(deletingItem._id);
            toast.success('User berhasil dihapus');
            setDeleteDialogOpen(false);
            setDeletingItem(null);
            fetchData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setDeleteLoading(false);
        }
    };

    if (!isAdmin()) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h2>
                    <p className="text-gray-500">Halaman ini hanya dapat diakses oleh admin</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Management User</h1>
                    <p className="text-gray-500 mt-1">Kelola data pengguna sistem</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Tambah User
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearch}
                        placeholder="Cari username atau email..."
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
                        icon={Users}
                        title="Belum ada user"
                        description="Tambahkan user baru untuk memulai"
                        action={
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah User
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left">Username</th>
                                        <th className="text-left hidden md:table-cell">Email</th>
                                        <th className="text-center">Role</th>
                                        <th className="text-left hidden lg:table-cell">UD</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                                        {item.username?.[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-900">{item.username}</span>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell text-gray-600">{item.email}</td>
                                            <td className="text-center">
                                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full capitalize
                          ${item.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}
                        `}>
                                                    {item.role?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell">
                                                <span className="text-gray-600">{item.ud_id?.nama_ud || '-'}</span>
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
                                                        disabled={item._id === currentUser?._id}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors disabled:opacity-30"
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
                title={editingItem ? 'Edit User' : 'Tambah User Baru'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleFormChange}
                            placeholder="Masukkan username"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            placeholder="Masukkan email"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password {!editingItem && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleFormChange}
                                placeholder={editingItem ? 'Kosongkan jika tidak ingin mengubah' : 'Masukkan password'}
                                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="ud_operator">UD Operator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* UD (for operator) */}
                    {formData.role === 'ud_operator' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                UD
                            </label>
                            <select
                                name="ud_id"
                                value={formData.ud_id}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            >
                                <option value="">Tidak ada (umum)</option>
                                {udList.map((ud) => (
                                    <option key={ud._id} value={ud._id}>
                                        {ud.nama_ud}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

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
                                    User Aktif
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
                            {formLoading ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah User'}
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
                title="Hapus User"
                message={`Apakah Anda yakin ingin menghapus user "${deletingItem?.username}"?`}
                confirmText="Ya, Hapus"
                loading={deleteLoading}
            />
        </div>
    );
}
