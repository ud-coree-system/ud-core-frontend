import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Sistem UD Management',
    description: 'Sistem Manajemen Usaha Dagang untuk MBG',
};

export default function RootLayout({ children }) {
    return (
        <html lang="id">
            <body className={inter.className}>
                <ToastProvider>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </ToastProvider>
            </body>
        </html>
    );
}
