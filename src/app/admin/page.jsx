'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { dashboardAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import FinancialCards from '@/components/dashboard/FinancialCards';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import SalesByUD from '@/components/dashboard/SalesByUD';
import QuickActions from '@/components/dashboard/QuickActions';

export default function DashboardPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [salesByUD, setSalesByUD] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [summaryRes, recentRes, salesRes] = await Promise.all([
                dashboardAPI.getSummary(),
                dashboardAPI.getRecent({ limit: 5 }),
                dashboardAPI.getSalesByUD(),
            ]);

            if (summaryRes.data.success) {
                setStats(summaryRes.data.data);
            }
            if (recentRes.data.success) {
                setRecentTransactions(recentRes.data.data);
            }
            if (salesRes.data.success) {
                setSalesByUD(salesRes.data.data);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Memuat data dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
            {/* Page Header */}
            <div className="col-span-12">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Selamat datang! Berikut ringkasan data sistem.
                </p>
            </div>

            {/* Quick Actions */}
            <div className="col-span-12">
                <QuickActions />
            </div>

            {/* Metrics Cards */}
            <div className="col-span-12 xl:col-span-7">
                <DashboardMetrics stats={stats} />
            </div>

            {/* Financial Cards */}
            <div className="col-span-12">
                <FinancialCards stats={stats} />
            </div>

            {/* Recent Transactions */}
            <div className="col-span-12 xl:col-span-7">
                <RecentTransactions transactions={recentTransactions} />
            </div>

            {/* Sales by UD */}
            <div className="col-span-12 xl:col-span-5">
                <SalesByUD salesData={salesByUD} />
            </div>

            
        </div>
    );
}
