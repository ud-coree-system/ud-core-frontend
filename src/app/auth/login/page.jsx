'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Eye, EyeOff, LogIn, Loader2, User, Lock, Sparkles } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const router = useRouter();
    const { login, user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/admin');
        }
    }, [authLoading, user, router]);

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-violet-500 animate-spin mx-auto mb-4" />
                    <p className="text-white/70">Memuat...</p>
                </div>
            </div>
        );
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.password) {
            toast.warning('Username/email dan password harus diisi');
            return;
        }

        setLoading(true);
        try {
            const result = await login(formData);
            if (result.success) {
                toast.success('Login berhasil!');
                router.push('/admin');
            } else {
                toast.error(result.message || 'Login gagal');
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Gradient Orbs */}
                <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-gradient-to-r from-violet-600/40 to-indigo-600/40 rounded-full blur-[120px] animate-pulse" />
                <div
                    className="absolute bottom-0 -right-40 w-[500px] h-[500px] bg-gradient-to-r from-blue-600/40 to-cyan-500/40 rounded-full blur-[120px] animate-pulse"
                    style={{ animationDelay: '1s' }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-[150px]" />

                {/* Floating Particles */}
                <div className="absolute inset-0">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white/20 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                                animationDelay: `${Math.random() * 2}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                         linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px',
                    }}
                />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md">
                {/* Glow Effect Behind Card */}
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />

                <Card className="relative bg-white/5 backdrop-blur-2xl border-white/10 shadow-2xl rounded-3xl">
                    {/* Decorative Corners */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-transparent rounded-tr-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tl from-blue-500/20 to-transparent rounded-bl-3xl pointer-events-none" />

                    <CardHeader className="text-center pt-8 pb-0 relative">
                        {/* Logo Container */}
                        <div className="relative inline-block mx-auto mb-6">
                            <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl blur-lg opacity-50 animate-pulse" />
                            <div className="relative w-20 h-20 bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                                <span className="text-3xl font-black text-white tracking-tight">UD</span>
                            </div>
                        </div>

                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-violet-200 bg-clip-text text-transparent">
                            Selamat Datang
                        </CardTitle>
                        <CardDescription className="text-white/50 flex items-center justify-center gap-2 mt-2">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            Sistem UD Management
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Username */}
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-white/70 ml-1">
                                    Username atau Email
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        id="username"
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="Masukkan username atau email"
                                        className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:bg-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] rounded-xl"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white/70 ml-1">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Masukkan password"
                                        className="pl-12 pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:bg-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] rounded-xl"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-violet-400 transition-colors duration-300"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-violet-500/30 rounded-xl"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        Masuk
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-6 pt-0 pb-8">
                        {/* Divider */}
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-transparent text-white/40 text-xs uppercase tracking-wider">
                                    atau
                                </span>
                            </div>
                        </div>

                        {/* Register Link */}
                        <p className="text-white/50 text-sm text-center">
                            Belum punya akun?{' '}
                            <Link
                                href="/auth/register"
                                className="text-transparent bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text font-semibold hover:from-violet-300 hover:to-cyan-300 transition-all duration-300"
                            >
                                Daftar Sekarang
                            </Link>
                        </p>

                        {/* Footer */}
                        <p className="text-white/30 text-xs text-center">
                            © 2026 Sistem UD Management • All rights reserved
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
