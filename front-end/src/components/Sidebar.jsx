import React from "react";
import {
  Shield,
  BarChart3,
  Activity,
  Server,
  Upload,
  CreditCard,
  Settings,
} from "lucide-react";

const Sidebar = ({ activeTab, setActiveTab }) => (
  <div className="bg-black w-64 min-h-screen p-6 border-r border-gray-800">
    <div className="flex items-center gap-3 mb-8">
      <Shield className="h-8 w-8 text-blue-500" />
      <h1 className="text-xl font-bold text-white">StromGuard</h1>
    </div>

    <nav className="space-y-2">
      {[
        { id: "dashboard", icon: BarChart3, label: "Dashboard" },
        { id: "analytics", icon: Activity, label: "Analytics" },
        { id: "servers", icon: Server, label: "Servers" },
        { id: "protection", icon: Shield, label: "DDoS Protection" },
        { id: "upload", icon: Upload, label: "Upload Config" },
        { id: "pricing", icon: CreditCard, label: "Pricing" },
        { id: "settings", icon: Settings, label: "Settings" },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            activeTab === item.id
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </button>
      ))}
    </nav>
  </div>
);

export default Sidebar;
