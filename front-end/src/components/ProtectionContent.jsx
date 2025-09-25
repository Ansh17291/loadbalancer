const ProtectionContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">DDoS Protection</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Attacks Blocked Today" value="1,247" change={-15} icon={Shield} color="red" />
        <StatCard title="Protection Level" value="High" change={0} icon={AlertTriangle} color="yellow" />
        <StatCard title="Mitigation Rate" value="99.2%" change={2} icon={TrendingDown} color="green" />
      </div>

      <div className="bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Protection Rules</h3>
        <div className="space-y-4">
          {[
            { name: 'Rate Limiting', status: 'Active', description: 'Limit requests per IP' },
            { name: 'GeoIP Blocking', status: 'Active', description: 'Block requests from specific countries' },
            { name: 'Bot Detection', status: 'Active', description: 'Identify and block malicious bots' },
            { name: 'WAF Rules', status: 'Inactive', description: 'Web Application Firewall protection' },
          ].map((rule, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray rounded-lg">
              <div>
                <h4 className="text-white font-medium">{rule.name}</h4>
                <p className="text-gray-400 text-sm">{rule.description}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                rule.status === 'Active' ? 'bg-green-900 text-green-400' : 'bg-gray-600 text-gray-400'
              }`}>
                {rule.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );


  export default ProtectionContent;