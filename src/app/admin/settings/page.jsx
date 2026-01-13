'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { settingAPI } from '@/lib/api';
import {
    Settings,
    UserPlus,
    Save,
    Loader2,
    ShieldCheck,
    ShieldAlert,
    UserCheck,
    UserX
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export default function SettingsPage() {
    const { user, loading: authLoading, isSuperUser } = useAuth();
    const { toast } = useToast();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await settingAPI.getAll();
            if (response.data.success) {
                const data = response.data.data;
                let normalized = { isRegistrationAllowed: true };

                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    // It's already an object, use it but ensure the key exists
                    normalized = {
                        ...data,
                        isRegistrationAllowed: data.isRegistrationAllowed ?? data.allow_registration ?? true
                    };
                } else if (Array.isArray(data)) {
                    const found = data.find(s => s.key === 'allow_registration' || s.key === 'isRegistrationAllowed');
                    normalized = { isRegistrationAllowed: found ? found.value : true };
                } else if (typeof data === 'boolean') {
                    normalized = { isRegistrationAllowed: data };
                }

                // Handle string booleans from API
                if (typeof normalized.isRegistrationAllowed === 'string') {
                    normalized.isRegistrationAllowed = normalized.isRegistrationAllowed === 'true';
                }

                setSettings(normalized);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Gagal mengambil pengaturan');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRegistration = async () => {
        if (!settings) return;

        try {
            setSaving(true);
            const newValue = !settings.isRegistrationAllowed;
            // Send as JSON object as per documentation
            const response = await settingAPI.update({ isRegistrationAllowed: newValue });

            if (response.data.success) {
                setSettings({ ...settings, isRegistrationAllowed: newValue });
                toast.success(`Registrasi berhasil ${newValue ? 'diaktifkan' : 'dinonaktifkan'}`);
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Gagal memperbarui pengaturan');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    if (!isSuperUser()) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
                <div className="w-20 h-20 bg-error-50 dark:bg-error-500/10 rounded-full flex items-center justify-center mb-4 text-error-600 dark:text-error-400">
                    <ShieldAlert className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Akses Dibatasi</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Halaman ini hanya dapat diakses oleh Super User. Silakan hubungi administrator sistem jika Anda merasa ini adalah kesalahan.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-7 h-7 text-brand-500" />
                    Pengaturan Global
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Kelola konfigurasi sistem secara global. Perubahan di sini akan berdampak pada seluruh aplikasi.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Registration Management Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manajemen Registrasi</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Kontrol akses pendaftaran akun baru</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${settings?.isRegistrationAllowed
                            ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                            : 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400'
                            }`}>
                            {settings?.isRegistrationAllowed ? (
                                <><UserCheck className="w-3 h-3" /> Aktif</>
                            ) : (
                                <><UserX className="w-3 h-3" /> Nonaktif</>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                                    Izinkan Registrasi Publik
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Jika diaktifkan, siapapun dapat mengakses halaman registrasi dan membuat akun baru.
                                    Disarankan untuk menonaktifkan fitur ini kecuali saat diperlukan (internal use).
                                </p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings?.isRegistrationAllowed || false}
                                    onChange={handleToggleRegistration}
                                    disabled={saving}
                                />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                            </label>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-gray-400 mt-0.5" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Ini adalah pengaturan tingkat sistem. Pastikan Anda memahami konsekuensi keamanan sebelum mengaktifkan registrasi publik.
                        </p>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-brand-50/50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-800 p-6">
                    <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-300 uppercase tracking-wider mb-2">Catatan Keamanan</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Halaman ini dikunci secara eksklusif untuk role <strong>superuser</strong>. Admin biasa pun tidak dapat melihat menu ini.
                        Hal ini untuk mencegah perubahan konfigurasi sistem yang tidak sengaja oleh staf operasional.
                    </p>
                </div>
            </div>

            {saving && (
                <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                        <p className="font-medium text-gray-900 dark:text-white">Menyimpan perubahan...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
