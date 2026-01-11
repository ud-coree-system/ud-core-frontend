'use client';

import { useState, useEffect } from 'react';
import {
    Activity,
    Search,
    Filter,
    Loader2,
    User,
    Calendar,
} from 'lucide-react';
import { activityAPI, userAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage, formatDateTime } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const ACTION_COLORS = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    LOGIN: 'bg-purple-100 text-purple-800',
    LOGOUT: 'bg-gray-100 text-gray-800',
    VIEW: 'bg-yellow-100 text-yellow-800',
};

const MODULE_ICONS = {
    USER: User,
    UD: 'building',
    BARANG: 'package',
    DAPUR: 'chef-hat',
    PERIODE: 'calendar',
    TRANSAKSI: 'shopping-cart',
};

export default function ActivityLogsPage() {
    const { toast } = useToast();
    const { isAdmin } = useAuth();

    // State
    const [data, setData] = useState([]);
    const [userList, setUserList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        totalPages: 1,
        totalDocuments: 0,
    });

    // Filters
    const [filterAction, setFilterAction] = useState('');
    const [filterModule, setFilterModule] = useState('');
    const [filterUser, setFilterUser] = useState('');

    useEffect(() => {
        if (isAdmin()) {
            fetchUsers();
        }
        fetchData();
    }, []);

    useEffect(() => {
        fetchData();
    }, [pagination.page, filterAction, filterModule, filterUser]);

    const fetchUsers = async () => {
        try {
            const response = await userAPI.getAll({ limit: 100 });
            if (response.data.success) {
                setUserList(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                action: filterAction || undefined,
                module: filterModule || undefined,
                user_id: filterUser || undefined,
            };
            const response = await activityAPI.getAll(params);
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

    const resetFilters = () => {
        setFilterAction('');
        setFilterModule('');
        setFilterUser('');
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
                <p className="text-gray-500 mt-1">Riwayat aktivitas pengguna dalam sistem</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Action Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={filterAction}
                            onChange={(e) => {
                                setFilterAction(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg appearance-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua Action</option>
                            <option value="CREATE">CREATE</option>
                            <option value="UPDATE">UPDATE</option>
                            <option value="DELETE">DELETE</option>
                            <option value="LOGIN">LOGIN</option>
                            <option value="LOGOUT">LOGOUT</option>
                            <option value="VIEW">VIEW</option>
                        </select>
                    </div>

                    {/* Module Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={filterModule}
                            onChange={(e) => {
                                setFilterModule(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg appearance-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="">Semua Module</option>
                            <option value="USER">USER</option>
                            <option value="UD">UD</option>
                            <option value="BARANG">BARANG</option>
                            <option value="DAPUR">DAPUR</option>
                            <option value="PERIODE">PERIODE</option>
                            <option value="TRANSAKSI">TRANSAKSI</option>
                        </select>
                    </div>

                    {/* User Filter */}
                    {isAdmin() && (
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                value={filterUser}
                                onChange={(e) => {
                                    setFilterUser(e.target.value);
                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                }}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg appearance-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            >
                                <option value="">Semua User</option>
                                {userList.map((u) => (
                                    <option key={u._id} value={u._id}>
                                        {u.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Reset */}
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium
                     hover:bg-gray-50 transition-colors"
                    >
                        Reset Filter
                    </button>
                </div>
            </div>

            {/* Activity List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : data.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title="Belum ada aktivitas"
                        description="Aktivitas pengguna akan muncul di sini"
                    />
                ) : (
                    <>
                        <div className="divide-y divide-gray-100">
                            {data.map((item) => (
                                <div key={item._id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* User Avatar */}
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                            {item.user_id?.username?.[0]?.toUpperCase() || '?'}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-medium text-gray-900">
                                                    {item.user_id?.username || 'Unknown'}
                                                </span>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${ACTION_COLORS[item.action] || 'bg-gray-100 text-gray-800'}`}>
                                                    {item.action}
                                                </span>
                                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                                                    {item.module}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">
                                                {item.description}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDateTime(item.createdAt)}
                                                </span>
                                                {item.ip_address && (
                                                    <span>IP: {item.ip_address}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Menampilkan {data.length} dari {pagination.totalDocuments} aktivitas
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
        </div>
    );
}
