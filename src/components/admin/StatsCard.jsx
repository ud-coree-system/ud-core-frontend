import { cn } from '@/lib/utils';

export default function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className
}) {
    return (
        <div className={cn(
            'bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow',
            className
        )}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                        {value}
                    </p>
                    {description && (
                        <p className="text-xs text-gray-500 mt-2">
                            {description}
                        </p>
                    )}
                    {trend && (
                        <div className={cn(
                            'flex items-center gap-1 mt-2 text-xs font-medium',
                            trend.positive ? 'text-green-600' : 'text-red-600'
                        )}>
                            <span>{trend.positive ? '↑' : '↓'}</span>
                            <span>{trend.value}</span>
                            <span className="text-gray-500 font-normal">{trend.label}</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                )}
            </div>
        </div>
    );
}
