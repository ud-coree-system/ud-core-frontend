import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className,
}) {
    const pages = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    // Add ellipsis if needed
    if (start > 2) pages.push('...');

    // Add pages in range
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    // Add ellipsis if needed
    if (end < totalPages - 1) pages.push('...');

    // Always show last page if more than 1 page
    if (totalPages > 1) pages.push(totalPages);

    if (totalPages <= 1) return null;

    return (
        <div className={cn('flex items-center justify-center gap-1', className)}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            {pages.map((page, index) => (
                <button
                    key={index}
                    onClick={() => typeof page === 'number' && onPageChange(page)}
                    disabled={page === '...'}
                    className={cn(
                        'min-w-[36px] h-9 px-3 rounded-lg font-medium text-sm transition-colors',
                        page === currentPage
                            ? 'bg-blue-500 text-white'
                            : page === '...'
                                ? 'cursor-default'
                                : 'hover:bg-gray-100 text-gray-700'
                    )}
                >
                    {page}
                </button>
            ))}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}
