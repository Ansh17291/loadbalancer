import React from "react";
import StatCard from "./StatCard";
import { Server, CheckCircle, AlertTriangle } from "lucide-react";

const ServersContent = ({ serverData = [] }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-white">Server Management</h2>
      <button className="bg-black hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
        Add Server
      </button>
    </div>

    <div className="grid gap-4">
      {serverData.map((server, index) => (
        <div
          key={index}
          className="bg-black p-6 rounded-xl border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {server.name}
                </h3>
                <p className="text-gray-400">Load: {server.load}%</p>
              </div>
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                server.status === "healthy"
                  ? "bg-green-900 text-green-400"
                  : "bg-yellow-900 text-yellow-400"
              }`}
            >
              {server.status === "healthy" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {server.status}
            </div>
          </div>
          <div className="bg-black rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full ${
                server.load > 80
                  ? "bg-red-500"
                  : server.load > 60
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
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

export default ServersContent;
