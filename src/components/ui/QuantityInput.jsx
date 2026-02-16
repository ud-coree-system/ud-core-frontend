'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * QuantityInput component
 * Handles Indonesian thousand separators (dots) and decimal separators (commas)
 * while preserving cursor position.
 * 
 * @param {string|number} value - The raw numeric string or number value from parent state
 * @param {function} onChange - Callback with event object containing raw numeric string (dot as decimal)
 * @param {string} className - Additional CSS classes
 * @param {string} placeholder - Input placeholder
 * @param {string} name - Input name
 */
const QuantityInput = ({
    value = '',
    onChange,
    className,
    placeholder = '0',
    name,
    ...props
}) => {
    const inputRef = useRef(null);
    const [cursor, setCursor] = useState(null);

    // Format number with dots (thousands) and comma (decimal)
    const formatDisplay = (val) => {
        if (val === null || val === undefined || val === '') return '';

        // Convert to string and standardize to dot for processing
        let str = val.toString().replace(',', '.');

        // Handle empty or just a minus sign (if negative allowed, but mostly for qty it's positive)
        if (str === '-') return '-';
        if (str === '.') return '0,';

        const parts = str.split('.');
        let integerPart = parts[0].replace(/[^\d-]/g, '');
        let decimalPart = parts.length > 1 ? parts[1].replace(/\D/g, '') : null;

        if (!integerPart && decimalPart === null) return '';

        // Format integer part with dots
        let formatted = integerPart;
        if (integerPart !== '-' && integerPart !== '') {
            formatted = new Intl.NumberFormat('id-ID').format(integerPart);
        } else if (integerPart === '') {
            formatted = '0';
        }

        // Add decimal part if it exists
        if (decimalPart !== null) {
            formatted += ',' + decimalPart;
        } else if (str.endsWith('.')) {
            formatted += ',';
        }

        return formatted;
    };

    const displayValue = formatDisplay(value);

    useEffect(() => {
        if (cursor !== null && inputRef.current) {
            inputRef.current.setSelectionRange(cursor, cursor);
        }
    }, [displayValue, cursor]);

    const handleChange = (e) => {
        const { value: inputValue, selectionStart } = e.target;

        // Calculate how many digits were before the cursor
        // We count digits AND decimal separator because we want to stick to the relative position
        const digitsAndDecBeforeCursor = (inputValue.substring(0, selectionStart).match(/[\d,]/g) || []).length;

        // Parse to raw numeric string (standardizing decimal to dot, removing thousand dots)
        let rawValue = inputValue.replace(/\./g, '').replace(',', '.');

        // Maintain only digits, at most one dot, and possibly a leading minus
        const isNegative = rawValue.startsWith('-');
        rawValue = rawValue.replace(/[^\d.]/g, '');
        const parts = rawValue.split('.');
        if (parts.length > 2) {
            rawValue = parts[0] + '.' + parts.slice(1).join('');
        } else {
            rawValue = parts.join('.');
        }
        if (isNegative) rawValue = '-' + rawValue;

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
        const nextFormatted = formatDisplay(rawValue);
        let newPos = 0;
        let matchedParts = 0;

        for (let i = 0; i < nextFormatted.length && matchedParts < digitsAndDecBeforeCursor; i++) {
            if (/[\d,]/.test(nextFormatted[i])) {
                matchedParts++;
            }
            newPos = i + 1;
        }

        setCursor(newPos);
    };

    return (
        <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            name={name}
            value={displayValue}
            onChange={handleChange}
            onFocus={(e) => {
                if (props.onFocus) props.onFocus(e);
                // Optional: select all on focus if needed, but standard input behavior is usually fine
            }}
            placeholder={placeholder}
            className={cn(
                "w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900",
                className
            )}
            {...props}
        />
    );
};

export default QuantityInput;
