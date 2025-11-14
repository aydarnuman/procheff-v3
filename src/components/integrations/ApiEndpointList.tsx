"use client";

import { ApiEndpoint } from "@/lib/integrations/api-stats-service";
import { Copy, ExternalLink, Shield, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ApiEndpointListProps {
  endpoints: ApiEndpoint[];
}

export function ApiEndpointList({ endpoints }: ApiEndpointListProps) {
  const copyEndpoint = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Endpoint kopyalandı!");
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-green-500/20 text-green-300";
      case "POST":
        return "bg-blue-500/20 text-blue-300";
      case "PUT":
        return "bg-yellow-500/20 text-yellow-300";
      case "DELETE":
        return "bg-red-500/20 text-red-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400";
      case "maintenance":
        return "text-yellow-400";
      case "deprecated":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const groupedEndpoints = endpoints.reduce((acc, endpoint) => {
    if (!acc[endpoint.category]) {
      acc[endpoint.category] = [];
    }
    acc[endpoint.category].push(endpoint);
    return acc;
  }, {} as Record<string, ApiEndpoint[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedEndpoints).map(([category, categoryEndpoints]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-gray-400 mb-3">{category}</h3>
          <div className="space-y-2">
            {categoryEndpoints.map((endpoint, index) => (
              <div
                key={`${endpoint.path}-${endpoint.method}-${index}`}
                className="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${getMethodColor(
                          endpoint.method
                        )}`}
                      >
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-300">{endpoint.path}</code>
                      {endpoint.authentication && (
                        <span title="Requires authentication">
                          <Shield className="w-3 h-3 text-yellow-400" />
                        </span>
                      )}
                      <span className={`text-xs ${getStatusColor(endpoint.status)}`}>
                        {endpoint.status === "maintenance" && <AlertCircle className="w-3 h-3 inline mr-1" />}
                        {endpoint.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{endpoint.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {endpoint.rateLimit}/hour
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyEndpoint(endpoint.path)}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                      title="Copy endpoint"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.open(`/api-docs#${endpoint.path}`, "_blank")}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                      title="View documentation"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}