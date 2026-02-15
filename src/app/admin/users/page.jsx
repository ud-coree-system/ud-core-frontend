'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { isAdmin, isSuperUser, user: currentUser } = useAuth();

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

    // Detail state
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteCode, setDeleteCode] = useState('');

    const canEditPassword = !editingItem ||
        currentUser?.role === 'superuser' ||
        (currentUser?.role === 'admin' && editingItem?._id === currentUser?._id);

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

    useEffect(() => {
        const viewId = searchParams.get('view');
        if (viewId && data.length > 0) {
            const item = data.find((d) => d._id === viewId);
            if (item) {
                openDetailModal(item);
            } else {
                fetchSingleItem(viewId);
            }
        }
    }, [searchParams, data]);

    const fetchSingleItem = async (id) => {
        try {
            const response = await userAPI.getById(id);
            if (response.data.success) {
                const user = response.data.data;
                // Admin can't view superuser details
                if (currentUser?.role === 'admin' && user?.role === 'superuser') {
                    toast.error('Akses ditolak');
                    return;
                }
                openDetailModal(user);
            }
        } catch (error) {
            console.error('Failed to fetch user for deep link:', error);
        }
    };

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
                let users = response.data.data;
                // Admin cannot see superusers
                if (currentUser?.role === 'admin') {
                    users = users.filter((u) => u.role !== 'superuser');
                }
                setData(users);
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
        if (currentUser?.role === 'admin' && item._id !== currentUser?._id) {
            toast.error('Admin hanya dapat mengubah data diri sendiri');
            return;
        }
        if (currentUser?.role === 'admin' && item.role === 'superuser') {
            toast.error('Akses ditolak');
            return;
        }
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

    const openDetailModal = (item) => {
        setViewingItem(item);
        setDetailModalOpen(true);
    };

    const closeDetailModal = () => {
        setDetailModalOpen(false);
        setViewingItem(null);
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
            // Don't send ud_id if admin or superuser
            if (payload.role === 'admin' || payload.role === 'superuser') {
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
        if (!isSuperUser()) {
            toast.error('Hanya Super User yang dapat menghapus user');
            return;
        }
        if (item._id === currentUser?._id) {
            toast.warning('Anda tidak dapat menghapus akun sendiri');
            return;
        }

        // Generate random code for deletion
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setDeleteCode(code);
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
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Management User
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 font-medium italic">
                        Kelola data pengguna dan hak akses sistem
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl
                   hover:bg-blue-700 transition-all font-semibold shadow-lg shadow-blue-500/20 active:scale-95 group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    <span>Tambah User</span>
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
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">UD</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => (
                                        <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm shrink-0">
                                                        {item.username?.[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-900">{item.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell text-gray-600 font-medium">
                                                {item.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                    ${item.role === 'superuser'
                                                        ? 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/10'
                                                        : item.role === 'admin'
                                                            ? 'bg-purple-100 text-purple-700 ring-1 ring-inset ring-purple-600/10'
                                                            : 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-600/10'}
                                                `}>
                                                    {item.role?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                                                <span className="text-gray-600 font-medium">
                                                    {item.ud_id?.nama_ud || <span className="text-gray-400 italic">Umum</span>}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${item.isActive
                                                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                        : 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-600/10'}
                                                `}>
                                                    {item.isActive ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openDetailModal(item)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                                                        title="Detail"
                                                    >
                                                        <Search className="w-4.5 h-4.5" />
                                                    </button>
                                                    {(isSuperUser() || (currentUser?.role === 'admin' && item._id === currentUser?._id)) && (
                                                        <button
                                                            onClick={() => openEditModal(item)}
                                                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4.5 h-4.5" />
                                                        </button>
                                                    )}
                                                    {isSuperUser() && (
                                                        <button
                                                            onClick={() => openDeleteDialog(item)}
                                                            disabled={item._id === currentUser?._id}
                                                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors disabled:opacity-30"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-4.5 h-4.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {data.map((item) => (
                                <div key={item._id} className="p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                                                {item.username?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{item.username}</h3>
                                                <p className="text-xs text-gray-500 font-medium">{item.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openDetailModal(item)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <Search className="w-4.5 h-4.5" />
                                            </button>
                                            {(isSuperUser() || (currentUser?.role === 'admin' && item._id === currentUser?._id)) && (
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit className="w-4.5 h-4.5" />
                                                </button>
                                            )}
                                            {isSuperUser() && (
                                                <button
                                                    onClick={() => openDeleteDialog(item)}
                                                    disabled={item._id === currentUser?._id}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 rounded-lg p-2.5">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Role</p>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize
                                                ${item.role === 'superuser'
                                                    ? 'bg-red-100 text-red-700'
                                                    : item.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'}
                                            `}>
                                                {item.role?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2.5">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold
                                                ${item.isActive
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-700'}
                                            `}>
                                                {item.isActive ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2.5 col-span-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit Dagang (UD)</p>
                                            <p className="text-xs font-semibold text-gray-700">
                                                {item.ud_id?.nama_ud || <span className="text-gray-400 italic font-normal">Umum / Tidak Terikat UD</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-xs sm:text-sm text-gray-500 font-medium order-2 sm:order-1">
                                    Menampilkan <span className="text-gray-900 font-semibold">{data.length}</span> dari <span className="text-gray-900 font-semibold">{pagination.totalDocuments}</span> data
                                </p>
                                <div className="order-1 sm:order-2 w-full sm:w-auto overflow-x-auto flex justify-center">
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
                    {canEditPassword && (
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
                    )}

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
                            {currentUser?.role === 'superuser' && (
                                <option value="superuser">Super User</option>
                            )}
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
                                    disabled={!isSuperUser()}
                                    className={`w-4 h-4 text-blue-600 rounded border-gray-300 ${!isSuperUser() ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                />
                                <span className={`text-sm font-medium ${!isSuperUser() ? 'text-gray-400' : 'text-gray-700'}`}>
                                    User Aktif {!isSuperUser() && <span className="text-[10px] font-normal block">(Hanya Super User yang dapat mengubah status)</span>}
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

            {/* Detail Modal */}
            <Modal
                isOpen={detailModalOpen}
                onClose={closeDetailModal}
                title="Detail User"
                size="md"
            >
                {viewingItem && (
                    <div className="space-y-6 py-2">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                {viewingItem.username?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{viewingItem.username}</h3>
                                <p className="text-gray-500 font-medium">{viewingItem.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Role</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium capitalize
                                    ${viewingItem.role === 'superuser'
                                        ? 'bg-red-100 text-red-700'
                                        : viewingItem.role === 'admin'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'}
                                `}>
                                    {viewingItem.role?.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status Akun</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium
                                    ${viewingItem.isActive
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-100 text-gray-700'}
                                `}>
                                    {viewingItem.isActive ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </div>
                            <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm md:col-span-2">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Unit Dagang (UD)</p>
                                <p className="text-gray-900 font-semibold text-lg">
                                    {viewingItem.ud_id?.nama_ud || <span className="text-gray-400 italic font-normal text-base">Umum / Tidak Terikat UD</span>}
                                </p>
                            </div>
                            <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Dibuat Pada</p>
                                <p className="text-gray-900 font-medium">{formatDateTime(viewingItem.createdAt)}</p>
                            </div>
                            <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Terakhir Diupdate</p>
                                <p className="text-gray-900 font-medium">{formatDateTime(viewingItem.updatedAt)}</p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={closeDetailModal}
                                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
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
                title="Hapus User"
                message={`Apakah Anda yakin ingin menghapus user "${deletingItem?.username}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus Permanen"
                loading={deleteLoading}
                confirmationCode={deleteCode}
            />
        </div>
    );
}
