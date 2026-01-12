'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils';
import AuthLayout from '@/componentsv2/AuthLayout';
import GlassCard from '@/componentsv2/GlassCard';
import InputGlass from '@/componentsv2/InputGlass';
import GradientButton from '@/componentsv2/GradientButton';
import Logo from '@/componentsv2/Logo';

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
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f1f5f9',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #3b82f6',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#64748b' }}>Memuat...</p>
                </div>
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
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
        <AuthLayout>
            <GlassCard>
                {/* Header with Logo */}
                <div style={{
                    marginBottom: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Logo />
                </div>

                {/* Welcome Text */}
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '1.875rem',
                        fontWeight: 'bold',
                        color: '#334155',
                        marginBottom: '8px',
                        margin: 0
                    }}>Selamat Datang</h1>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'rgba(59, 130, 246, 0.9)',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginTop: '8px'
                    }}>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>auto_awesome</span>
                        <p style={{ margin: 0, letterSpacing: '0.025em' }}>Sistem UD Management</p>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>auto_awesome</span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <InputGlass
                        label="Username atau Email"
                        icon="person"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Masukkan username atau email"
                        disabled={loading}
                    />

                    <InputGlass
                        label="Password"
                        icon="lock"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Masukkan password"
                        disabled={loading}
                        showToggle
                        showPassword={showPassword}
                        onToggle={() => setShowPassword(!showPassword)}
                    />

                    <GradientButton loading={loading} icon="login">
                        Masuk
                    </GradientButton>
                </form>

                {/* Divider */}
                <div style={{ position: 'relative', margin: '32px 0' }}>
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <div style={{ width: '100%', borderTop: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <span style={{
                            background: 'transparent',
                            padding: '0 8px',
                            color: '#64748b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            fontWeight: '600',
                            backgroundColor: 'white' // Better for white background
                        }}>ATAU</span>
                    </div>
                </div>

                {/* Footer Links */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <p style={{ color: '#475569', margin: 0, fontSize: '14px' }}>
                        Belum punya akun?{' '}
                        <Link href="/auth/register" style={{
                            color: '#2563eb',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'color 0.3s ease'
                        }}>Daftar Sekarang</Link>
                    </p>
                    <footer style={{ paddingTop: '16px' }}>
                        <p style={{
                            fontSize: '10px',
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            margin: 0
                        }}>
                            © 2026 Sistem UD Management • All rights reserved
                        </p>
                    </footer>
                </div>
            </GlassCard>
        </AuthLayout>
    );
}
