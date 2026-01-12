'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils';
import AuthLayout from '@/componentsv2/AuthLayout';
import GlassCard from '@/componentsv2/GlassCard';
import InputGlass from '@/componentsv2/InputGlass';
import GradientButton from '@/componentsv2/GradientButton';
import Logo from '@/componentsv2/Logo';

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

                {/* Title Text */}
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '1.875rem',
                        fontWeight: 'bold',
                        color: '#334155',
                        marginBottom: '8px',
                        margin: 0
                    }}>Buat Akun Baru</h1>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'rgba(59, 130, 246, 0.9)',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginTop: '8px'
                    }}>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>person_add</span>
                        <p style={{ margin: 0, letterSpacing: '0.025em' }}>Daftar Sistem UD Management</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <InputGlass
                        label="Username"
                        icon="person"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Masukkan username"
                        disabled={loading}
                    />

                    <InputGlass
                        label="Email"
                        icon="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Masukkan email"
                        disabled={loading}
                    />

                    <InputGlass
                        label="Password"
                        icon="lock"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Minimal 6 karakter"
                        disabled={loading}
                        showToggle
                        showPassword={showPassword}
                        onToggle={() => setShowPassword(!showPassword)}
                    />

                    <InputGlass
                        label="Konfirmasi Password"
                        icon="lock_reset"
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Ulangi password"
                        disabled={loading}
                    />

                    <InputGlass
                        label="Role"
                        icon="badge"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        disabled={loading}
                        options={[
                            { value: 'admin', label: 'Admin' },
                            { value: 'ud_operator', label: 'UD Operator' }
                        ]}
                    />

                    <GradientButton loading={loading} icon="person_add">
                        Daftar
                    </GradientButton>
                </form>

                {/* Footer Links */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '32px' }}>
                    <p style={{ color: '#475569', margin: 0, fontSize: '14px' }}>
                        Sudah punya akun?{' '}
                        <Link href="/auth/login" style={{
                            color: '#2563eb',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'color 0.3s ease'
                        }}>Masuk di sini</Link>
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
