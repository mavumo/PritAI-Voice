import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SystemLog } from "@shared/schema";

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const { addMessageListener } = useWebSocket('/ws');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/system/logs'],
    queryParams: { limit: 10 },
  });

  useEffect(() => {
    if (data) {
      setLogs(data);
    }
  }, [data]);

  useEffect(() => {
    const removeListener = addMessageListener((message) => {
      // Auto-refresh logs when system events occur
      if (['call_started', 'call_ended', 'intake_created'].includes(message.type)) {
        refetch();
      }
    });

    return removeListener;
  }, [addMessageListener, refetch]);

  const getLogIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      call: "fas fa-phone text-green-500",
      intake: "fas fa-user-plus text-blue-500",
      system: "fas fa-cog text-gray-500",
      error: "fas fa-exclamation-triangle text-red-500",
    };
    return iconMap[type] || "fas fa-info-circle text-gray-500";
  };

  const getLogBackground = (type: string) => {
    const bgMap: Record<string, string> = {
      call: "bg-green-50 border-green-200",
      intake: "bg-blue-50 border-blue-200", 
      system: "bg-gray-50 border-gray-200",
      error: "bg-red-50 border-red-200",
    };
    return bgMap[type] || "bg-gray-50 border-gray-200";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) + ' PST';
  };

  const handleRefreshLogs = () => {
    refetch();
  };

  const handleExportLogs = () => {
    const csv = logs.map(log => 
      `"${log.timestamp}","${log.type}","${log.level}","${log.message}","${JSON.stringify(log.details || {})}"`
    ).join('\n');
    
    const header = '"Timestamp","Type","Level","Message","Details"\n';
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">System Logs</h3>
              <p className="text-sm text-gray-600">Recent voice agent activity</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900" data-testid="text-system-logs-title">System Logs</h3>
            <p className="text-sm text-gray-600">Recent voice agent activity</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshLogs}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              data-testid="button-refresh-logs"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportLogs}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              data-testid="button-export-logs"
            >
              <i className="fas fa-download mr-2"></i>
              Export
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start space-x-3 p-3 border rounded-lg ${getLogBackground(log.type)}`}
                data-testid={`log-entry-${log.id}`}
              >
                <i className={`${getLogIcon(log.type)} mt-1`} data-testid={`icon-log-${log.type}`}></i>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900" data-testid={`text-log-message-${log.id}`}>
                    {log.message}
                  </p>
                  {log.details && (
                    <p className="text-xs text-gray-600" data-testid={`text-log-details-${log.id}`}>
                      {typeof log.details === 'string' ? log.details : 
                       Object.entries(log.details).map(([key, value]) => `${key}: ${value}`).join(' • ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-400" data-testid={`text-log-timestamp-${log.id}`}>
                    {formatTime(log.timestamp.toString())}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" data-testid="text-no-logs">
            <i className="fas fa-clipboard-list text-gray-300 text-4xl mb-4"></i>
            <p className="text-gray-500">No system logs available</p>
          </div>
        )}
      </div>
    </div>
  );
}
