'use client';

export default function EmptyState({
    icon: Icon,
    title = 'Tidak ada data',
    description,
    action,
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            {Icon && (
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-gray-400" />
                </div>
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
            {description && (
                <p className="text-gray-500 text-center max-w-sm">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
