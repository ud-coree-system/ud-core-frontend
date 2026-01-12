'use client';

export default function InputGlass({
    label,
    icon,
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    disabled,
    showToggle,
    onToggle,
    showPassword,
    required = false,
    options = null // for select fields
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {label && (
                <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#334155',
                    marginLeft: '4px'
                }}>{label}</label>
            )}
            <div style={{ position: 'relative' }}>
                {icon && (
                    <span className="material-icons-round" style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748b',
                        fontSize: '20px',
                        transition: 'color 0.3s ease',
                        pointerEvents: 'none'
                    }}>{icon}</span>
                )}

                {options ? (
                    <select
                        name={name}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        className="input-glass"
                        required={required}
                        style={{
                            width: '100%',
                            paddingLeft: icon ? '48px' : '16px',
                            paddingRight: '16px',
                            paddingTop: '14px',
                            paddingBottom: '14px',
                            borderRadius: '16px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            background: 'rgba(255, 255, 255, 0.6)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            color: '#334155',
                            appearance: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={type}
                        name={name}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        disabled={disabled}
                        required={required}
                        className="input-glass"
                        style={{
                            width: '100%',
                            paddingLeft: icon ? '48px' : '16px',
                            paddingRight: showToggle ? '48px' : '16px',
                            paddingTop: '14px',
                            paddingBottom: '14px',
                            borderRadius: '16px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            background: 'rgba(255, 255, 255, 0.6)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease',
                            color: '#334155'
                        }}
                    />
                )}

                {showToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
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
                )}

                {options && (
                    <span className="material-icons-round" style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748b',
                        fontSize: '20px',
                        pointerEvents: 'none'
                    }}>expand_more</span>
                )}
            </div>
            <style jsx>{`
                .input-glass:focus {
                    background: rgba(255, 255, 255, 0.8) !important;
                    border-color: #3b82f6 !important;
                    outline: none;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
                }
                .input-glass:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .input-glass::placeholder {
                    color: #64748b;
                }
            `}</style>
        </div>
    );
}
