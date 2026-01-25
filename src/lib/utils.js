import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Format number as Indonesian currency (Rupiah)
 */
export function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value) {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date, options = {}) {
    if (!date) return '-';
    const defaultOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Makassar',
    };
    return new Date(date).toLocaleDateString('id-ID', { ...defaultOptions, ...options });
}

/**
 * Format date to short format (DD/MM/YYYY)
 */
export function formatDateShort(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Makassar',
    });
}

/**
 * Format datetime
 */
export function formatDateTime(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Makassar',
    });
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date) {
    if (!date) return '-';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return formatDateShort(date);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Generate initials from name
 */
export function getInitials(name) {
    if (!name) return '';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Check if object is empty
 */
export function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}

/**
 * Get error message from API response
 */
export function getErrorMessage(error) {
    if (error.response?.data?.message) {
        return error.response.data.message;
    }
    if (error.response?.data?.errors?.length) {
        return error.response.data.errors.join(', ');
    }
    if (error.message) {
        return error.message;
    }
    return 'Terjadi kesalahan. Silakan coba lagi.';
}

/**
 * Generate unique ID
 */
export function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Convert date to ISO string (for input[type="date"])
 */
export function toDateInputValue(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

/**
 * Format date to YYYY-MM-DD in local time
 */
export function toLocalDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format date to DD-MM-YYYY for filenames
 */
export function formatDateFilename(date) {
    if (!date) {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    }
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

/**
 * Status badge colors
 */
export const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    active: 'bg-blue-100 text-blue-800',
    inactive: 'bg-gray-100 text-gray-800',
    closed: 'bg-purple-100 text-purple-800',
};

/**
 * Get status badge class
 */
export function getStatusClass(status) {
    return statusColors[status?.toLowerCase()] || statusColors.inactive;
}
