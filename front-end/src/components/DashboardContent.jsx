import React from "react";
import StatCard from "./StatCard";
import { Globe, Shield, Server, Zap } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

const DashboardContent = ({
  totalRequests = "-",
  blockedRequests = "-",
  activeServers = 0,
  responseTime = "-",
  isConnected = true,
  trafficData = [],
  serverData = [],
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
      <div
        className={`flex items-center gap-2 px-3 py-1 rounded-full ${
          isConnected
            ? "bg-green-900 text-green-400"
            : "bg-red-900 text-red-400"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-400" : "bg-red-400"
          }`}
        />
        {isConnected ? "Connected" : "Disconnected"}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Requests"
        value={totalRequests}
        change={12}
        icon={Globe}
      />
      <StatCard
        title="Blocked Attacks"
        value={blockedRequests}
        change={-8}
        icon={Shield}
        color="red"
      />
      <StatCard
        title="Active Servers"
        value={activeServers}
        change={0}
        icon={Server}
        color="green"
      />
      <StatCard
        title="Response Time"
        value={`${responseTime}ms`}
        change={-5}
        icon={Zap}
        color="yellow"
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          Traffic & Attack Mitigation
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F9FAFB",
              }}
            />
            <Area
              type="monotone"
              dataKey="normal"
              stackId="1"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="malicious"
              stackId="2"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="blocked"
              stackId="3"
              stroke="#F59E0B"
              fill="#F59E0B"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          Server Load Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={serverData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F9FAFB",
              }}
            />
            <Bar dataKey="load" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export default DashboardContent;
