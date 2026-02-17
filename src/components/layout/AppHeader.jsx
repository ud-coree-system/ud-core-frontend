'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    Search,
    Bell,
    Moon,
    Sun,
    Menu,
    X,
    ChevronDown,
    LogOut,
    User,
    Settings,
    Users,
} from 'lucide-react';

const AppHeader = () => {
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
    const { user, logout, isAdmin, isSuperUser } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const userMenuRef = useRef(null);
    const mobileUserMenuRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Check if dark mode is enabled
        if (typeof window !== 'undefined') {
            const isDark = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDark);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isClickInsideDesktop = userMenuRef.current && userMenuRef.current.contains(event.target);
            const isClickInsideMobile = mobileUserMenuRef.current && mobileUserMenuRef.current.contains(event.target);

            if (!isClickInsideDesktop && !isClickInsideMobile) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (window.innerWidth >= 1024) {
            toggleSidebar();
        } else {
            toggleMobileSidebar();
        }
    };

    const toggleDarkMode = () => {
        if (typeof window !== 'undefined') {
            document.documentElement.classList.toggle('dark');
            setIsDarkMode(!isDarkMode);
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <header className="sticky top-0 flex w-full bg-white border-gray-200 z-40 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
            <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
                <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
                    {/* Sidebar Toggle */}
                    <button
                        className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-50 dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={handleToggle}
                        aria-label="Toggle Sidebar"
                    >
                        {isMobileOpen ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                    </button>

                    {/* Search Bar - Desktop Only */}
                    {/* <div className="hidden lg:block flex-1 max-w-md">
                        <div className="relative">
                            <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                                <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                            />
                            <button className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400">
                                <span>⌘</span>
                                <span>K</span>
                            </button>
                        </div>
                    </div> */}

                    {/* Mobile Title */}
                    <h1 className="lg:hidden text-lg font-bold text-gray-900 dark:text-white uppercase">
                        Mutiara Care
                    </h1>

                    {/* Clock - Desktop Only */}
                    <div className="hidden lg:flex flex-1 justify-center">
                        <img
                            src="/TOPAN.webp"
                            alt="Topan Logo"
                            className="h-7 ml-2 -mt-1 mr-2 w-auto rounded-lg object-contain"
                        />
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold text-gray-800 dark:text-white capitalize">
                                {currentTime.toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    timeZone: 'Asia/Makassar',
                                })}
                            </span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 font-mono">
                                {currentTime.toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false,
                                    timeZone: 'Asia/Makassar',
                                })} WITA
                            </span>
                        </div>
                        <img
                            src="/TOPAN.webp"
                            alt="Topan Logo"
                            className="h-7 ml-2 -mt-1 w-auto rounded-lg object-contain"
                        />
                    </div>

                    {/* Right Actions - Mobile Toggle */}
                    {/* Right Actions - Mobile Toggle */}
                    <div className="lg:hidden relative" ref={mobileUserMenuRef}>
                        <button
                            onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            aria-label="User Menu"
                        >
                            <User className="w-5 h-5" />
                        </button>

                        {/* Mobile User Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-theme-lg border border-gray-200 dark:border-gray-800 py-2 z-50">
                                <Link
                                    href="/admin/profile"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    onClick={() => setUserMenuOpen(false)}
                                >
                                    <User className="w-4 h-4" />
                                    Profile
                                </Link>
                                {isSuperUser() && (
                                    <Link
                                        href="/admin/settings"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        onClick={() => setUserMenuOpen(false)}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </Link>
                                )}
                                <hr className="my-2 border-gray-200 dark:border-gray-800" />
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setUserMenuOpen(false);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Actions - Desktop */}
                <div className="hidden lg:flex items-center gap-3">
                    {/* Notifications */}
                    <button className="relative flex items-center justify-center w-10 h-10 text-gray-500 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full"></span>
                    </button>

                    {/* User Dropdown */}
                    <div ref={userMenuRef} className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold">
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="hidden xl:block text-left">
                                <p className="text-sm font-medium text-gray-800 dark:text-white">
                                    {user?.username || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {user?.role || 'Admin'}
                                </p>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        </button>

                        {/* Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-theme-lg border border-gray-200 dark:border-gray-800 py-2 z-50">
                                <Link
                                    href="/admin/profile"
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    onClick={() => setUserMenuOpen(false)}
                                >
                                    <User className="w-4 h-4" />
                                    Profile
                                </Link>
                                {isSuperUser() && (
                                    <Link
                                        href="/admin/settings"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        onClick={() => setUserMenuOpen(false)}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </Link>
                                )}
                                <hr className="my-2 border-gray-200 dark:border-gray-800" />
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setUserMenuOpen(false);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
