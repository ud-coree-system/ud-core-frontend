'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Building2,
    Package,
    ChefHat,
    Plus,
    Calculator,
    ClipboardList,
    FileBarChart2,
    History,
    Users,
    X,
    Menu,
    Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuGroups = [
    {
        label: 'MAIN MENU',
        items: [
            { title: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
            { title: 'Management UD', icon: Building2, href: '/admin/ud' },
            { title: 'Management Barang', icon: Package, href: '/admin/barang' },
            { title: 'Management Dapur', icon: ChefHat, href: '/admin/dapur' },
            { title: 'Management Periode', icon: Calendar, href: '/admin/periode' },
        ],
    },
    {
        label: 'TRANSACTIONS',
        items: [
            { title: 'Input Transaksi', icon: Calculator, href: '/admin/transaksi/new' },
            { title: 'List Transaksi', icon: ClipboardList, href: '/admin/transaksi' },
            { title: 'Laporan', icon: FileBarChart2, href: '/admin/laporan' },
        ],
    },
];

const bottomItems = [
    { title: 'Activity Logs', icon: History, href: '/admin/activity' },
    { title: 'Management Users', icon: Users, href: '/admin/users', adminOnly: true },
];

export default function SidebarV2({ currentPath, isCollapsed, setIsCollapsed }) {
    const { isAdmin } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (href) => {
        if (href === '/admin') {
            return currentPath === '/admin';
        }
        return currentPath.startsWith(href);
    };

    const NavItem = ({ item, isMobile = false }) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        if (item.adminOnly && !isAdmin()) return null;

        return (
            <Link
                href={item.href}
                onClick={() => isMobile && setMobileOpen(false)}
                className={cn(
                    'flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group',
                    active
                        ? 'bg-[#eff6ff] text-[#2563eb] font-bold'
                        : 'text-[#475569] hover:bg-slate-50 hover:text-slate-900'
                )}
            >
                <Icon className={cn(
                    'w-6 h-6 transition-colors stroke-[2px]',
                    active ? 'text-[#2563eb]' : 'text-[#64748b] group-hover:text-slate-600'
                )} />
                <span className="text-[15px]">{item.title}</span>
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Menu Button - Minimalist */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg border border-slate-100"
            >
                <Menu className="w-6 h-6 text-slate-600" />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    'bg-white border-r border-slate-100 z-50 flex flex-col p-4 transition-all duration-300',
                    'h-screen sticky top-0 w-80',
                    'fixed inset-y-0 left-0 lg:sticky',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                {/* Header Section */}
                <div className="pt-10 px-6 pb-10 flex items-start gap-4 m-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex flex-col pt-1">
                        <h1 className="text-xl font-bold text-slate-900 leading-tight">UD System</h1>
                        <p className="text-[13px] font-medium text-slate-400">Management Panel</p>
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden ml-auto p-2 hover:bg-slate-100 rounded-lg"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Quick Create Button */}
                <div className="m-6">
                    <button className="w-full bg-[#2563eb] hover:bg-blue-700 text-white py-4 px-4 flex items-center justify-center gap-3 font-bold text-[16px] transition-all duration-200 shadow-xl shadow-blue-100 active:scale-[0.98]">
                        <Plus className="w-5 h-5 stroke-[3px]" />
                        <span>Quick Create</span>
                    </button>
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                    {menuGroups.map((group, idx) => (
                        <div key={idx} className="mb-10">
                            <h2 className="px-4 text-[12px] font-bold text-slate-400 tracking-[0.1em] mb-4">
                                {group.label}
                            </h2>
                            <nav className="space-y-2">
                                {group.items.map((item) => (
                                    <NavItem key={item.href} item={item} isMobile={mobileOpen} />
                                ))}
                            </nav>
                        </div>
                    ))}

                    <div className="my-10 border-t border-slate-100" />

                    <nav className="space-y-2 mb-10">
                        {bottomItems.map((item) => (
                            <NavItem key={item.href} item={item} isMobile={mobileOpen} />
                        ))}
                    </nav>
                </div>
            </aside>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </>
    );
}
