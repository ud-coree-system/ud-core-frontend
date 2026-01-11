'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

export default function RegisterPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin', // Default admin untuk registrasi awal
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validations
        if (!formData.username.trim()) {
            toast.warning('Username harus diisi');
            return;
        }
        if (!formData.email.trim()) {
            toast.warning('Email harus diisi');
            return;
        }
        if (!formData.password) {
            toast.warning('Password harus diisi');
            return;
        }
        if (formData.password.length < 6) {
            toast.warning('Password minimal 6 karakter');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.warning('Konfirmasi password tidak cocok');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            };

            const response = await authAPI.register(payload);

            if (response.data.success) {
                // Auto login after register
                const { user, token } = response.data.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));

                toast.success('Registrasi berhasil! Selamat datang.');
                router.push('/admin');
            } else {
                toast.error(response.data.message || 'Registrasi gagal');
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-4 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl"></div>
            </div>

            {/* Register Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 md:p-10">
                    {/* Logo / Title */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="text-2xl font-bold text-white">UD</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Buat Akun Baru
                        </h1>
                        <p className="text-white/70 text-sm">
                            Daftar untuk mengakses Sistem UD Management
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Masukkan username"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl
                         text-white placeholder-white/50 focus:outline-none focus:ring-2 
                         focus:ring-white/30 focus:border-transparent transition-all"
                                disabled={loading}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Masukkan email"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl
                         text-white placeholder-white/50 focus:outline-none focus:ring-2 
                         focus:ring-white/30 focus:border-transparent transition-all"
                                disabled={loading}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Minimal 6 karakter"
                                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl
                           text-white placeholder-white/50 focus:outline-none focus:ring-2 
                           focus:ring-white/30 focus:border-transparent transition-all"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Konfirmasi Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Ulangi password"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl
                         text-white placeholder-white/50 focus:outline-none focus:ring-2 
                         focus:ring-white/30 focus:border-transparent transition-all"
                                disabled={loading}
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Role
                            </label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl
                         text-white focus:outline-none focus:ring-2 
                         focus:ring-white/30 focus:border-transparent transition-all appearance-none"
                                disabled={loading}
                            >
                                <option value="admin" className="text-gray-900">Admin</option>
                                <option value="ud_operator" className="text-gray-900">UD Operator</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-white text-indigo-600 font-semibold rounded-xl
                       hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50
                       disabled:opacity-70 disabled:cursor-not-allowed transition-all
                       flex items-center justify-center gap-2 shadow-lg mt-6"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Daftar
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-white/70 text-sm">
                            Sudah punya akun?{' '}
                            <Link href="/auth/login" className="text-white font-medium hover:underline">
                                Masuk di sini
                            </Link>
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-white/50 text-xs">
                            © 2026 Sistem UD Management
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
