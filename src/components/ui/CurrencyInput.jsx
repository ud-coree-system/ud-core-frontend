'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * CurrencyInput component
 * Handles Indonesian thousand separators (dots) while preserving cursor position.
 * 
 * @param {string} value - The raw numeric string value from parent state
 * @param {function} onChange - Callback with event object containing raw numeric value
 * @param {string} className - Additional CSS classes
 * @param {string} placeholder - Input placeholder
 * @param {string} name - Input name
 */
const CurrencyInput = ({
    value = '',
    onChange,
    className,
    placeholder = '0',
    name,
    ...props
}) => {
    const inputRef = useRef(null);
    const [cursor, setCursor] = useState(null);

    // Format number with dots
    const formatValue = (val) => {
        if (val === null || val === undefined || val === '') return '';
        const num = val.toString().replace(/\D/g, '');
        if (!num) return '';
        return new Intl.NumberFormat('id-ID').format(num);
    };

    const displayValue = formatValue(value);

    useEffect(() => {
        if (cursor !== null && inputRef.current) {
            inputRef.current.setSelectionRange(cursor, cursor);
        }
    }, [displayValue, cursor]);

    const handleChange = (e) => {
        const { value: inputValue, selectionStart } = e.target;

        // Calculate how many digits were before the cursor
        const dotsBeforeCursor = (inputValue.substring(0, selectionStart).match(/\./g) || []).length;
        const digitsBeforeCursor = selectionStart - dotsBeforeCursor;

        // Parse to raw digits
        const rawValue = inputValue.replace(/\D/g, '');

        // Call parent onChange with a simulated event object
        if (onChange) {
            onChange({
                target: {
                    name,
                    value: rawValue,
                    type: 'text'
                }
            });
        }

        // Calculate new cursor position
        // We need to wait for the next render to know the final formatted string
        // but we can estimate the digit target.
        // Actually, let's just use requestAnimationFrame to set it after render.

        // Find the new position that has 'digitsBeforeCursor' digits before it
        const nextFormatted = formatValue(rawValue);
        let newPos = 0;
        let digitCount = 0;

        for (let i = 0; i < nextFormatted.length && digitCount < digitsBeforeCursor; i++) {
            if (/\d/.test(nextFormatted[i])) {
                digitCount++;
            }
            newPos = i + 1;
        }

        setCursor(newPos);
    };

    return (
        <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            name={name}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            className={cn(
                "w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                className
            )}
            {...props}
        />
    );
};

export default CurrencyInput;
