'use client';

export default function Logo() {
    return (
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
    );
}
