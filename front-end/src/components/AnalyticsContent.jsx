const AnalyticsContent = () => (
<div className="space-y-6">
    <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Request Volume (24h)</h3>
        <ResponsiveContainer width="100%" height={400}>
        <LineChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
            contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
            }} 
            />
            <Line type="monotone" dataKey="normal" stroke="#10B981" strokeWidth={2} />
            <Line type="monotone" dataKey="malicious" stroke="#EF4444" strokeWidth={2} />
            <Line type="monotone" dataKey="blocked" stroke="#F59E0B" strokeWidth={2} />
        </LineChart>
        </ResponsiveContainer>
    </div>

    <div className="bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Attack Types</h3>
        <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Pie
            data={attackTypes}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            >
            {attackTypes.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            </Pie>
            <Tooltip 
            contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
            }} 
            />
        </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
        {attackTypes.map((type, index) => (
            <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                <span className="text-gray-300 text-sm">{type.name}</span>
            </div>
            <span className="text-white font-medium">{type.value}%</span>
            </div>
        ))}
        </div>
    </div>
    </div>
</div>
);

export default AnalyticsContent;