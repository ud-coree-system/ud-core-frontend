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
        icon: ChefHat,
        name: 'Laporan Dapur',
        path: '/admin/laporan/dapur',
    },
    {
        icon: ClipboardList,
        name: 'Laporan Rekap',
        path: '/admin/laporan/rekap',
    },
    {
        icon: FileBarChart2,
        name: 'Cetak Laporan',
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
    const { isExpanded, isMobileOpen, isHovered, setIsHovered, setIsMobileOpen } = useSidebar();
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
                    onClick={() => {
                        if (window.innerWidth < 1024) {
                            setIsMobileOpen(false);
                        }
                    }}
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
            <div className="py-4 flex justify-center">
                <Link
                    href="/admin"
                    onClick={() => {
                        if (window.innerWidth < 1024) {
                            setIsMobileOpen(false);
                        }
                    }}
                    className={`flex flex-col items-center gap-2 ${!isExpanded && !isHovered && !isMobileOpen ? 'lg:px-2' : ''}`}
                >
                    <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
                        <img src="/LOGO MUTIARA CARE.webp" alt="Mutiara Care Logo" className="w-24 h-24 object-contain" />
                    </div>
                    {(isExpanded || isHovered || isMobileOpen) && (
                        <div className="flex flex-col items-center text-center">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">MUTIARA CARE</h1>
                            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-1">Indonesia</p>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar pb-28">
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
