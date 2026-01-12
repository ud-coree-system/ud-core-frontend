'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils';

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
        <>
            {/* Google Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />

            <style jsx global>{`
                body {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    background: #f1f5f9;
                    min-height: 100vh;
                    margin: 0;
                    overflow: hidden;
                }

                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: none;
                    box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.15);
                }

                .gradient-button {
                    background: linear-gradient(135deg, #3b82f6 0%, #a855f7 100%);
                    transition: all 0.3s ease;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
                }

                .gradient-button:hover {
                    box-shadow: 0 0 30px rgba(168, 85, 247, 0.6);
                    transform: translateY(-1px);
                }

                .gradient-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                .input-glass {
                    background: rgba(255, 255, 255, 0.6);
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                    color: #334155;
                }

                .input-glass::placeholder {
                    color: #64748b;
                }

                .input-glass:focus {
                    background: rgba(255, 255, 255, 0.8);
                    border-color: #3b82f6;
                    outline: none;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
                }

                .input-glass:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid white;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    display: inline-block;
                    margin-right: 8px;
                }
            `}</style>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: '16px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: '#f1f5f9'
            }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '448px' }}>
                    <div className="glass-card" style={{
                        borderRadius: '32px',
                        padding: '32px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Header with Logo */}
                        <div style={{
                            marginBottom: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(to bottom right, #60a5fa, #2563eb)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
                            }}>
                                <span style={{
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '20px',
                                    letterSpacing: '-0.05em'
                                }}>UD</span>
                            </div>
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
                            {/* Username Field */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#334155',
                                    marginLeft: '4px'
                                }}>Username atau Email</label>
                                <div style={{ position: 'relative' }}>
                                    <span className="material-icons-round" style={{
                                        position: 'absolute',
                                        left: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#64748b',
                                        fontSize: '20px',
                                        transition: 'color 0.3s ease'
                                    }}>person</span>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="Masukkan username atau email"
                                        disabled={loading}
                                        className="input-glass"
                                        style={{
                                            width: '100%',
                                            paddingLeft: '48px',
                                            paddingRight: '16px',
                                            paddingTop: '14px',
                                            paddingBottom: '14px',
                                            borderRadius: '16px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#334155',
                                    marginLeft: '4px'
                                }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <span className="material-icons-round" style={{
                                        position: 'absolute',
                                        left: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#64748b',
                                        fontSize: '20px',
                                        transition: 'color 0.3s ease'
                                    }}>lock</span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Masukkan password"
                                        disabled={loading}
                                        className="input-glass"
                                        style={{
                                            width: '100%',
                                            paddingLeft: '48px',
                                            paddingRight: '48px',
                                            paddingTop: '14px',
                                            paddingBottom: '14px',
                                            borderRadius: '16px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '16px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <span className="material-icons-round" style={{
                                            color: '#64748b',
                                            fontSize: '20px',
                                            transition: 'color 0.3s ease'
                                        }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="gradient-button"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    marginTop: '8px',
                                    border: 'none',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-round" style={{ fontSize: '20px' }}>login</span>
                                        Masuk
                                    </>
                                )}
                            </button>
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
                                    backgroundColor: 'rgba(255, 255, 255, 0.7)'
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
                    </div>
                </div>
            </div>
        </>
    );
}
