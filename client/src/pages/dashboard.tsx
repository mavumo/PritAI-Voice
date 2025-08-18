import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState } from "react";
import { CallMonitor } from "@/components/call-monitor";
import { IntakeTable } from "@/components/intake-table";
import { SystemLogs } from "@/components/system-logs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  callsToday: number;
  activeCalls: number;
  newIntakes: number;
  avgResponseTime: number;
}

interface SystemConfig {
  businessHoursEnabled: boolean;
  responseMode: string;
  openaiApiStatus: string;
}

interface BusinessHours {
  isOpen: boolean;
  currentTime: string;
  message: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const { toast } = useToast();
  const { addMessageListener } = useWebSocket('/ws');

  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000,
  });

  const { data: systemConfig } = useQuery({
    queryKey: ['/api/system/config'],
  });

  const { data: businessHoursData } = useQuery({
    queryKey: ['/api/system/business-hours'],
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (dashboardStats) setStats(dashboardStats);
  }, [dashboardStats]);

  useEffect(() => {
    if (systemConfig) setConfig(systemConfig);
  }, [systemConfig]);

  useEffect(() => {
    if (businessHoursData) setBusinessHours(businessHoursData);
  }, [businessHoursData]);

  useEffect(() => {
    const removeListener = addMessageListener((message) => {
      if (message.type === 'config_updated') {
        setConfig(message.config);
      }
    });

    return removeListener;
  }, [addMessageListener]);

  const handleBusinessHoursToggle = async (enabled: boolean) => {
    try {
      await apiRequest('PATCH', '/api/system/config', {
        businessHoursEnabled: enabled,
      });
      
      toast({
        title: "Configuration updated",
        description: `Business hours ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update business hours setting.",
        variant: "destructive",
      });
    }
  };

  const handleResponseModeChange = async (mode: string) => {
    try {
      await apiRequest('PATCH', '/api/system/config', {
        responseMode: mode,
      });
      
      toast({
        title: "Configuration updated", 
        description: `Response mode changed to ${mode}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update response mode.",
        variant: "destructive",
      });
    }
  };

  const formatStatValue = (value: number, type: string) => {
    if (type === 'avgResponseTime') {
      return `${value}s`;
    }
    return value.toString();
  };

  const getStatIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      callsToday: "fas fa-phone text-blue-500",
      activeCalls: "fas fa-phone-volume text-green-500", 
      newIntakes: "fas fa-user-plus text-purple-500",
      avgResponseTime: "fas fa-stopwatch text-orange-500",
    };
    return iconMap[type] || "fas fa-chart-line text-gray-500";
  };

  const getStatChange = (type: string) => {
    // Mock percentage changes - in real app this would come from API
    const changes: Record<string, { value: string; positive: boolean }> = {
      callsToday: { value: "↗ 12%", positive: true },
      activeCalls: { value: "Current connections", positive: true },
      newIntakes: { value: "↗ 25%", positive: true },
      avgResponseTime: { value: "↘ 0.3s", positive: true },
    };
    return changes[type] || { value: "", positive: true };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900" data-testid="text-dashboard-title">Voice Agent Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">Monitor and manage your AI receptionist for +1 (510) 443-2123</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Current Time Display */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900" data-testid="text-current-time">
                {businessHours?.currentTime || 'Loading...'}
              </p>
              <p className="text-xs text-gray-500" data-testid="text-business-hours-status">
                {businessHours?.isOpen ? 'Business Hours Active' : 'After Hours'}
              </p>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-gray-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900" data-testid="text-admin-user">Admin User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats && Object.entries(stats).map(([key, value]) => {
            const change = getStatChange(key);
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid={`card-stat-${key}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 capitalize" data-testid={`text-stat-label-${key}`}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-3xl font-bold text-gray-900" data-testid={`text-stat-value-${key}`}>
                      {formatStatValue(value, key)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <i className={`${getStatIcon(key)} text-xl`}></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className={`text-sm font-medium ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {change.value}
                  </span>
                  {key !== 'activeCalls' && (
                    <span className="text-gray-500 text-sm ml-2">
                      {key === 'newIntakes' ? 'this week' : key === 'avgResponseTime' ? 'improved' : 'vs yesterday'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Calls Panel */}
          <div className="lg:col-span-2">
            <CallMonitor />
          </div>

          {/* System Configuration Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900" data-testid="text-config-title">Quick Configuration</h3>
              <p className="text-sm text-gray-600">System settings</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Business Hours Toggle */}
              {config && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900" data-testid="text-business-hours-label">Business Hours</p>
                    <p className="text-sm text-gray-600">Mon-Fri 8AM-6PM PST</p>
                  </div>
                  <Switch
                    checked={config.businessHoursEnabled}
                    onCheckedChange={handleBusinessHoursToggle}
                    data-testid="switch-business-hours"
                  />
                </div>
              )}

              {/* AI Response Mode */}
              {config && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="text-response-mode-label">
                    AI Response Mode
                  </label>
                  <Select 
                    value={config.responseMode} 
                    onValueChange={handleResponseModeChange}
                    data-testid="select-response-mode"
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Phone Number Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700" data-testid="text-phone-label">Phone Number</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full" data-testid="text-phone-status">
                    Active
                  </span>
                </div>
                <p className="text-lg font-mono text-gray-900" data-testid="text-phone-number">+1 (510) 443-2123</p>
                <p className="text-xs text-gray-500 mt-1">Webhook configured</p>
              </div>

              {/* OpenAI API Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700" data-testid="text-openai-label">OpenAI API</span>
                  <span 
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      config?.openaiApiStatus === 'connected' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                    data-testid="text-openai-status"
                  >
                    {config?.openaiApiStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Realtime API v1.0</p>
                <p className="text-xs text-gray-500">Last ping: 230ms</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Intake Submissions */}
        <div className="mt-8">
          <IntakeTable />
        </div>

        {/* System Logs Section */}
        <div className="mt-8">
          <SystemLogs />
        </div>
      </main>
    </div>
  );
}
