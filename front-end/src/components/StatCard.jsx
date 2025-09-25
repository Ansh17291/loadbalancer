const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
<div className="bg-black p-6 rounded-xl border border-gray-700">
    <div className="flex items-center justify-between mb-4">
    <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
    <Icon className={`h-5 w-5 text-${color}-500`} />
    </div>
    <div className="flex items-end gap-2">
    <span className="text-2xl font-bold text-white">{value}</span>
    <span className={`text-sm ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
        {change > 0 ? '+' : ''}{change}%
    </span>
    </div>
</div>
);

export default StatCard;