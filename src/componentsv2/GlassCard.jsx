'use client';

export default function GlassCard({ children }) {
    return (
        <div className="glass-card" style={{
            borderRadius: '32px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: 'none',
            boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.15)'
        }}>
            {children}
            <style jsx>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.15);
                }
            `}</style>
        </div>
    );
}
