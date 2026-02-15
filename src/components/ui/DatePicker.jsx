'use client';

import { useState, useRef, useEffect } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

export default function DatePicker({
    selected,
    onChange,
    placeholder = 'dd/mm/yyyy',
    minDate,
    maxDate,
    className = '',
    inputClassName = '',
    showTimeSelect = false,
    onOpenChange,
    ...props
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const wrapperRef = useRef(null);

    // Format Date object to dd/mm/yyyy
    const formatDate = (date) => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        let dateStr = `${day}/${month}/${year}`;

        if (showTimeSelect) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            dateStr += ` ${hours}:${minutes}`;
        }
        return dateStr;
    };

    // Parse dd/mm/yyyy to Date object
    const parseDate = (str) => {
        const parts = str.split(' ');
        const datePart = parts[0];
        const timePart = parts[1] || '00:00';

        const dParts = datePart.split('/');
        const tParts = timePart.split(':');

        // Only parse if year is fully entered (4 digits)
        if (dParts.length === 3 && dParts[2].length === 4) {
            const day = parseInt(dParts[0], 10);
            const month = parseInt(dParts[1], 10) - 1;
            const year = parseInt(dParts[2], 10);
            const hours = tParts.length >= 1 ? parseInt(tParts[0], 10) : 0;
            const minutes = tParts.length >= 2 ? parseInt(tParts[1], 10) : 0;

            const date = new Date(year, month, day, hours, minutes);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        return null;
    };

    // Update input value when selected date changes
    useEffect(() => {
        if (selected) {
            setInputValue(formatDate(selected));
        } else {
            setInputValue('');
        }
    }, [selected]);

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Notify parent about open state changes
    useEffect(() => {
        if (onOpenChange) {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);

        // Try to parse the date
        const parsedDate = parseDate(value);
        if (parsedDate) {
            onChange(parsedDate);
        }
    };

    const handleDateChange = (date) => {
        onChange(date);
        setInputValue(formatDate(date));
        setIsOpen(false);
    };

    const handleCalendarClick = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            <div ref={wrapperRef} className={`relative ${className}`}>
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue || (selected ? formatDate(selected) : '')}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        className={inputClassName || `w-full h-[48px] px-3 py-2 pr-10 border border-gray-200 rounded-xl
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                                 text-gray-900 placeholder:text-gray-400`}
                    />
                    <button
                        type="button"
                        onClick={handleCalendarClick}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 
                                 hover:bg-gray-100 rounded transition-colors"
                    >
                        <Calendar className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {isOpen && (
                    <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1">
                        <ReactDatePicker
                            selected={selected}
                            onChange={handleDateChange}
                            minDate={minDate}
                            maxDate={maxDate}
                            inline
                            showTimeSelect={showTimeSelect}
                            calendarClassName="compact-calendar"
                            {...props}
                        />
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                    .compact-calendar {
                        font-family: inherit;
                        font-size: 0.7rem;
                    }

                    .react-datepicker {
                        border: 1px solid #e5e7eb;
                        border-radius: 0.5rem;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        font-size: 0.7rem;
                    }

                    .react-datepicker__header {
                        background-color: #f9fafb;
                        border-bottom: 1px solid #e5e7eb;
                        border-top-left-radius: 0.5rem;
                        border-top-right-radius: 0.5rem;
                        padding-top: 0.25rem;
                        padding-bottom: 0.25rem;
                    }

                    .react-datepicker__current-month {
                        font-size: 0.7rem;
                        font-weight: 600;
                        color: #111827;
                        margin-bottom: 0.125rem;
                    }

                    .react-datepicker__day-names {
                        margin-bottom: 0;
                    }

                    .react-datepicker__day-name {
                        color: #6b7280;
                        font-size: 0.6rem;
                        font-weight: 600;
                        width: 1.5rem;
                        line-height: 1.5rem;
                        margin: 0.08rem;
                        text-align: center;
                        display: inline-block;
                    }

                    .react-datepicker__day {
                        width: 1.5rem;
                        line-height: 1.5rem;
                        margin: 0.08rem;
                        border-radius: 0.25rem;
                        color: #374151;
                        font-size: 0.7rem;
                        text-align: center;
                        display: inline-block;
                    }

                    .react-datepicker__day:hover {
                        background-color: #eff6ff;
                        color: #2563eb;
                    }

                    .react-datepicker__day--selected,
                    .react-datepicker__day--keyboard-selected {
                        background-color: #2563eb;
                        color: white;
                        font-weight: 600;
                    }

                    .react-datepicker__day--selected:hover,
                    .react-datepicker__day--keyboard-selected:hover {
                        background-color: #1d4ed8;
                    }

                    .react-datepicker__day--disabled {
                        color: #d1d5db;
                        cursor: not-allowed;
                    }

                    .react-datepicker__day--disabled:hover {
                        background-color: transparent;
                        color: #d1d5db;
                    }

                    .react-datepicker__day--outside-month {
                        color: #d1d5db;
                    }

                    .react-datepicker__day--today {
                        font-weight: 600;
                        border: 1px solid #2563eb;
                        background-color: transparent;
                        color: #2563eb;
                    }

                    .react-datepicker__day--today:hover {
                        background-color: #eff6ff;
                    }

                    .react-datepicker__navigation {
                        top: 0.3rem;
                        width: 1.1rem;
                        height: 1.1rem;
                    }

                    .react-datepicker__navigation-icon::before {
                        border-color: #6b7280;
                        border-width: 1.5px 1.5px 0 0;
                        height: 4px;
                        width: 4px;
                        top: 4px;
                    }

                    .react-datepicker__navigation:hover *::before {
                        border-color: #2563eb;
                    }

                    .react-datepicker__month {
                        margin: 0.3rem;
                    }

                    .react-datepicker__triangle {
                        display: none;
                    }

                    .react-datepicker__month-container {
                        width: 200px;
                    }

                    .react-datepicker__week {
                        display: flex;
                    }
                `
            }} />
        </>
    );
}
