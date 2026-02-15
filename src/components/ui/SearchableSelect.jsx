'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export default function SearchableSelect({
    options = [],
    value = '',
    onChange,
    placeholder = 'Pilih opsi...',
    searchPlaceholder = 'Cari...',
    className = '',
    triggerClassName = '',
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (option) => {
        onChange({ target: { value: option.value } });
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={triggerClassName || `w-full h-[48px] px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between text-left
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                    ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-300 dark:hover:border-gray-600'}`}
            >
                <span className={`block truncate text-sm ${!selectedOption ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-8 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors
                                        ${value === option.value ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {value === option.value && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500 italic">
                                Tidak ada hasil ditemukan
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d1d5db;
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #374151;
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #4b5563;
                }
            `}</style>
        </div>
    );
}
