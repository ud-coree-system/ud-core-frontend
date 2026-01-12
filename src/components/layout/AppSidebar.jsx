'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Building2,
    Package,
    ChefHat,
    Calendar,
    Calculator,
    ClipboardList,
    FileBarChart2,
    History,
    Users,
    ChevronDown,
    MoreHorizontal,
} from 'lucide-react';

const navItems = [
    {
        icon: LayoutDashboard,
        name: 'Dashboard',
        path: '/admin',
    },
    {
        icon: Building2,
        name: 'Management UD',
        path: '/admin/ud',
    },
    {
        icon: Package,
        name: 'Management Barang',
        path: '/admin/barang',
    },
    {
        icon: ChefHat,
        name: 'Management Dapur',
        path: '/admin/dapur',
    },
    {
        icon: Calendar,
        name: 'Management Periode',
        path: '/admin/periode',
    },
];

const transactionItems = [
    {
        icon: Calculator,
        name: 'Input Transaksi',
        path: '/admin/transaksi/new',
    },
    {
        icon: ClipboardList,
        name: 'List Transaksi',
        path: '/admin/transaksi',
    },
    {
        icon: FileBarChart2,
        name: 'Laporan',
        path: '/admin/laporan',
    },
];

const othersItems = [
    {
        icon: History,
        name: 'Activity Logs',
        path: '/admin/activity',
    },
    {
        icon: Users,
        name: 'Management Users',
        path: '/admin/users',
        adminOnly: true,
    },
];

const AppSidebar = () => {
    const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
    const { isAdmin } = useAuth();
    const pathname = usePathname();

    // Collect all menu paths to check against
    const allMenuPaths = [
        ...navItems.map(item => item.path),
        ...transactionItems.map(item => item.path),
        ...othersItems.map(item => item.path),
    ];

    const isActive = useCallback((path) => {
        if (path === '/admin') {
            return pathname === '/admin';
        }
        // Exact match
        if (pathname === path) {
            return true;
        }
        // If pathname is itself a menu item, don't activate other items
        if (allMenuPaths.includes(pathname)) {
            return false;
        }
        // Check if it's a subpath (must have a slash after the path)
        return pathname.startsWith(path + '/');
    }, [pathname]);

    const renderMenuItem = (item) => {
        if (item.adminOnly && !isAdmin()) return null;

        const Icon = item.icon;
        const active = isActive(item.path);

        return (
            <li key={item.path}>
                <Link
                    href={item.path}
                    className={`menu-item group ${active ? 'menu-item-active' : 'menu-item-inactive'
                        } ${!isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start'}`}
                >
                    <span className={active ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}>
                        <Icon className="w-5 h-5" />
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text">{item.name}</span>
                    )}
                </Link>
            </li>
        );
    };

    const renderMenuItems = (items) => (
        <ul className="flex flex-col gap-1">
            {items.map(renderMenuItem)}
        </ul>
    );

    return (
        <aside
            className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
                ${isExpanded || isMobileOpen ? 'w-[290px]' : isHovered ? 'w-[290px]' : 'w-[90px]'}
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0`}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Logo Section */}
            <div className={`py-8 flex ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}`}>
                <Link href="/admin" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    {(isExpanded || isHovered || isMobileOpen) && (
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">UD System</h1>
                            <p className="text-xs font-medium text-gray-400">Management Panel</p>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
                <nav className="mb-6">
                    <div className="flex flex-col gap-4">
                        {/* Main Menu */}
                        <div>
                            <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'
                                }`}>
                                {isExpanded || isHovered || isMobileOpen ? 'Menu' : <MoreHorizontal className="w-5 h-5" />}
                            </h2>
                            {renderMenuItems(navItems)}
                        </div>

                        {/* Transactions */}
                        <div>
                            <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'
                                }`}>
                                {isExpanded || isHovered || isMobileOpen ? 'Transaksi' : <MoreHorizontal className="w-5 h-5" />}
                            </h2>
                            {renderMenuItems(transactionItems)}
                        </div>

                        {/* Others */}
                        <div>
                            <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'
                                }`}>
                                {isExpanded || isHovered || isMobileOpen ? 'Lainnya' : <MoreHorizontal className="w-5 h-5" />}
                            </h2>
                            {renderMenuItems(othersItems)}
                        </div>
                    </div>
                </nav>
            </div>
        </aside>
    );
};

export default AppSidebar;
