'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Bell, LogOut, User, ChevronDown, Settings } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function Header() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        toast.success('Logout berhasil');
        router.push('/auth/login');
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
            {/* Left - Page Title or Breadcrumb space */}
            <div className="flex items-center gap-4">
                {/* Space for mobile menu button */}
                <div className="w-10 lg:hidden" />

                <div>
                    <p className="text-xs text-gray-500">
                        {formatDateTime(new Date())}
                    </p>
                </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
                {/* Notifications */}
                <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Bell className="w-5 h-5 text-gray-600" />
                    {/* Notification Badge */}
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="hidden md:block text-sm font-medium text-gray-700">
                            {user?.username}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 animate-fade-in">
                            {/* User Info */}
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full capitalize">
                                    {user?.role?.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Menu Items */}
                            <div className="py-1">
                                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <User className="w-4 h-4" />
                                    Profil Saya
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <Settings className="w-4 h-4" />
                                    Pengaturan
                                </button>
                            </div>

                            {/* Logout */}
                            <div className="border-t border-gray-100 pt-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Keluar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
