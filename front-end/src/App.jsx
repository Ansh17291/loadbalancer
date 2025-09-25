import React, { useState, useEffect } from 'react';
import { Shield, BarChart3, Zap, Globe, Users, Settings, Upload, CreditCard, Activity, TrendingDown, Server, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import DashboardContent from './components/DashboardContent';
import AnalyticsContent from './components/AnalyticsContent';
import ServersContent from './components/ServersContent';
import ProtectionContent from './components/ProtectionContent';
import UploadContent from './components/UploadContent';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(true);

  // Mock data for charts
  const trafficData = [
    { time: '00:00', normal: 1200, malicious: 800, blocked: 750 },
    { time: '04:00', normal: 1800, malicious: 1200, blocked: 1100 },
    { time: '08:00', normal: 2400, malicious: 2000, blocked: 1950 },
    { time: '12:00', normal: 2800, malicious: 3200, blocked: 3100 },
    { time: '16:00', normal: 2200, malicious: 1800, blocked: 1750 },
    { time: '20:00', normal: 1600, malicious: 1000, blocked: 950 },
  ];

  const serverData = [
    { name: 'Server 1', load: 45, status: 'healthy' },
    { name: 'Server 2', load: 67, status: 'healthy' },
    { name: 'Server 3', load: 23, status: 'healthy' },
    { name: 'Server 4', load: 89, status: 'warning' },
  ];

  const attackTypes = [
    { name: 'DDoS', value: 45, color: '#ef4444' },
    { name: 'Brute Force', value: 25, color: '#f97316' },
    { name: 'Bot Traffic', value: 20, color: '#eab308' },
    { name: 'Others', value: 10, color: '#6b7280' },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      features: ['Up to 10K requests/month', 'Basic DDoS protection', '24/7 monitoring', '2 server backends'],
      popular: false
    },
    {
      name: 'Professional',
      price: '$99',
      period: '/month',
      features: ['Up to 100K requests/month', 'Advanced DDoS mitigation', 'Real-time analytics', '10 server backends', 'Custom rules'],
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$299',
      period: '/month',
      features: ['Unlimited requests', 'Enterprise DDoS protection', 'Custom integrations', 'Unlimited backends', '99.9% SLA'],
      popular: false
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(prev => Math.random() > 0.1 ? true : prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);


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


const DashboardContent = () => (
<div className="space-y-6">
    <div className="flex items-center justify-between">
    <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
        isConnected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
    }`}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        {isConnected ? 'Connected' : 'Disconnected'}
    </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <StatCard title="Total Requests" value="2.4M" change={12} icon={Globe} />
    <StatCard title="Blocked Attacks" value="156K" change={-8} icon={Shield} color="red" />
    <StatCard title="Active Servers" value="4" change={0} icon={Server} color="green" />
    <StatCard title="Response Time" value="42ms" change={-5} icon={Zap} color="yellow" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Traffic & Attack Mitigation</h3>
        <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={trafficData}>
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
            <Area type="monotone" dataKey="normal" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            <Area type="monotone" dataKey="malicious" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
            <Area type="monotone" dataKey="blocked" stackId="3" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
        </AreaChart>
        </ResponsiveContainer>
    </div>

    <div className="bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Server Load Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
        <BarChart data={serverData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
            contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
            }} 
            />
            <Bar dataKey="load" fill="#3B82F6" />
        </BarChart>
        </ResponsiveContainer>
    </div>
    </div>
</div>
);


const PricingContent = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Choose Your Plan</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Protect your applications with our enterprise-grade load balancer and DDoS mitigation service
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {pricingPlans.map((plan, index) => (
          <div key={index} className={`bg-black p-8 rounded-xl border ${
            plan.popular ? 'border-blue-500 relative' : 'border-gray-700'
          }`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-400">{plan.period}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button className={`w-full py-3 rounded-lg font-medium transition-colors ${
              plan.popular 
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-black hover:bg-gray-600 text-white'
            }`}>
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );



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


  const ServersContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Server Management</h2>
        <button className="bg-black hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          Add Server
        </button>
      </div>

      <div className="grid gap-4">
        {serverData.map((server, index) => (
          <div key={index} className="bg-black p-6 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Server className="h-6 w-6 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{server.name}</h3>
                  <p className="text-gray-400">Load: {server.load}%</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                server.status === 'healthy' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'
              }`}>
                {server.status === 'healthy' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {server.status}
              </div>
            </div>
            <div className="bg-black rounded-full h-2 mb-4">
              <div 
                className={`h-2 rounded-full ${server.load > 80 ? 'bg-red-500' : server.load > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${server.load}%` }}
              />
            </div>
            <div className="flex gap-2">
              <button className="bg-black hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors">
                Configure
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );


const Sidebar = () => (
<div className="bg-black w-64 min-h-screen p-6 border-r border-gray-800">
    <div className="flex items-center gap-3 mb-8">
    <Shield className="h-8 w-8 text-blue-500" />
    <h1 className="text-xl font-bold text-white">StromGuard</h1>
    </div>
    
    <nav className="space-y-2">
    {[
        { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
        { id: 'analytics', icon: Activity, label: 'Analytics' },
        { id: 'servers', icon: Server, label: 'Servers' },
        { id: 'protection', icon: Shield, label: 'DDoS Protection' },
        { id: 'upload', icon: Upload, label: 'Upload Config' },
        { id: 'pricing', icon: CreditCard, label: 'Pricing' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ].map((item) => (
        <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            activeTab === item.id
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        >
        <item.icon className="h-5 w-5" />
        {item.label}
        </button>
    ))}
    </nav>
</div>
);

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
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardContent />;
      case 'analytics': return <AnalyticsContent />;
      case 'servers': return <ServersContent />;
      case 'protection': return <ProtectionContent />;
      case 'upload': return <UploadContent />;
      case 'pricing': return <PricingContent />;
      default: return <DashboardContent />;
    }
  };

  const UploadContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Upload Configuration</h2>
      
      <div className="bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Website Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Domain Name</label>
            <input 
              type="text" 
              placeholder="example.com" 
              className="w-full bg-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 mb-2">SSL Certificate</label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Drop your SSL certificate here or click to upload</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Choose File
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Backend Servers (JSON)</label>
            <textarea 
              rows={6}
              placeholder={`[
  {"host": "192.168.1.100", "port": 8080},
  {"host": "192.168.1.101", "port": 8080}
]`}
              className="w-full bg-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">
            Deploy Configuration
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex bg-black min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;