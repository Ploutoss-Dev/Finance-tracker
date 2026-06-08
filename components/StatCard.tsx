interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  accent?: 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple';
  large?: boolean;
}

const accentMap = {
  green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  red: 'text-red-400 bg-red-500/10 border-red-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  accent = 'blue',
  large = false,
}: StatCardProps) {
  const positive = change !== undefined ? change >= 0 : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        {icon && (
          <div className={`p-2 rounded-lg border ${accentMap[accent]}`}>
            {icon}
          </div>
        )}
      </div>

      <p className={`font-bold text-white mb-1 ${large ? 'text-3xl' : 'text-2xl'}`}>
        {value}
      </p>

      {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}

      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {positive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
          {changeLabel && <span className="text-gray-600 text-xs">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
