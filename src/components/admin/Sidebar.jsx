'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Building2,
    Package,
    ChefHat,
    Calendar,
    ShoppingCart,
    ClipboardList,
    FileBarChart2,
    Activity,
    Users,
    ChevronLeft,
    ChevronRight,
    X,
    Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
    {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: '/admin',
    },
    {
        title: 'Management UD',
        icon: Building2,
        href: '/admin/ud',
    },
    {
        title: 'Management Barang',
        icon: Package,
        href: '/admin/barang',
    },
    {
        title: 'Management Dapur',
        icon: ChefHat,
        href: '/admin/dapur',
    },
    {
        title: 'Management Periode',
        icon: Calendar,
        href: '/admin/periode',
    },
    {
        title: 'Input Transaksi',
        icon: ShoppingCart,
        href: '/admin/transaksi/new',
    },
    {
        title: 'List Transaksi',
        icon: ClipboardList,
        href: '/admin/transaksi',
    },
    {
        title: 'Laporan',
        icon: FileBarChart2,
        href: '/admin/laporan',
    },
    {
        title: 'Activity Logs',
        icon: Activity,
        href: '/admin/activity',
    },
    {
        title: 'Management Users',
        icon: Users,
        href: '/admin/users',
        adminOnly: true,
    },
];

export default function Sidebar({ currentPath, isCollapsed, setIsCollapsed }) {
    const { user, isAdmin } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const filteredMenu = menuItems.filter(
        (item) => !item.adminOnly || isAdmin()
    );

    const isActive = (href) => {
        if (href === '/admin') {
            return currentPath === '/admin';
        }
        return currentPath.startsWith(href);
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 border border-gray-200"
            >
                <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'bg-white border-r border-gray-200 z-50 flex flex-col transition-all duration-300',
                    'h-screen sticky top-0', // Desktop sticky
                    'fixed inset-y-0 left-0 lg:sticky', // Mobile fixed, Desktop sticky
                    isCollapsed ? 'w-20' : 'w-64',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-white">UD</span>
                            </div>
                            <span className="font-semibold text-gray-900 truncate">UD System</span>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto">
                            <span className="text-sm font-bold text-white">UD</span>
                        </div>
                    )}

                    {/* Mobile Close */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Desktop Collapse */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-lg transition-colors absolute -right-3 top-20 bg-white border border-gray-200 shadow-sm z-[60]"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <ul className="space-y-1">
                        {filteredMenu.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                                            'hover:bg-gray-100',
                                            active && 'bg-blue-50 text-blue-600 hover:bg-blue-50',
                                            isCollapsed && 'justify-center'
                                        )}
                                    >
                                        <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-blue-600' : 'text-gray-500')} />
                                        {!isCollapsed && (
                                            <span className={cn('text-sm font-medium', active ? 'text-blue-600' : 'text-gray-700')}>
                                                {item.title}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User Info */}
                {!isCollapsed && (
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {user?.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.username}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                    {user?.role?.replace('_', ' ')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}
