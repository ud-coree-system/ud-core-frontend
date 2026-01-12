'use client';

export default function GradientButton({
    children,
    type = 'submit',
    loading = false,
    disabled = false,
    onClick,
    icon = null
}) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
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
                cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
            }}
        >
            {loading ? (
                <>
                    <span className="spinner" />
                    Memproses...
                </>
            ) : (
                <>
                    {icon && <span className="material-icons-round" style={{ fontSize: '20px' }}>{icon}</span>}
                    {children}
                </>
            )}
            <style jsx>{`
                .gradient-button:hover {
                    box-shadow: 0 0 30px rgba(168, 85, 247, 0.6);
                    transform: translateY(-1px);
                }
                .gradient-button:disabled {
                    opacity: 0.7;
                    transform: none;
                }
            `}</style>
        </button>
    );
}
