'use client';

export default function AuthLayout({ children }) {
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
                background: '#f1f5f9',
                boxSizing: 'border-box'
            }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '448px' }}>
                    {children}
                </div>
            </div>
        </>
    );
}
