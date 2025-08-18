import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Call } from "@shared/schema";

export function CallMonitor() {
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const { toast } = useToast();
  const { addMessageListener } = useWebSocket('/ws');

  const { data: calls, isLoading } = useQuery({
    queryKey: ['/api/calls/active'],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (calls && Array.isArray(calls)) {
      setActiveCalls(calls);
    }
  }, [calls]);

  useEffect(() => {
    const removeListener = addMessageListener((message) => {
      switch (message.type) {
        case 'call_started':
          setActiveCalls(prev => [...prev, message.call]);
          break;
        case 'call_ended':
          setActiveCalls(prev => prev.filter(call => call.id !== message.callId));
          break;
      }
    });

    return () => {
      removeListener();
    };
  }, [addMessageListener]);

  const handleEndCall = async (callId: string) => {
    try {
      await apiRequest('POST', `/api/calls/${callId}/end`);
      toast({
        title: "Call ended",
        description: "The call has been successfully terminated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end the call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const duration = Math.floor((now - start) / 1000);
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    return `${minutes}m ${seconds}s ago`;
  };

  const getMatterTypeColor = (matterType: string | null) => {
    if (!matterType) return "bg-gray-100 text-gray-800";
    
    const colorMap: Record<string, string> = {
      "Real Estate Purchase": "bg-blue-100 text-blue-800",
      "Landlord Dispute": "bg-red-100 text-red-800",
      "Property Sale": "bg-purple-100 text-purple-800",
      "Intake": "bg-blue-100 text-blue-800",
      "Info Request": "bg-green-100 text-green-800",
    };
    
    return colorMap[matterType] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Calls</h3>
          <p className="text-sm text-gray-600">Real-time call monitoring</p>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading calls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900" data-testid="text-active-calls-title">Active Calls</h3>
        <p className="text-sm text-gray-600">Real-time call monitoring</p>
      </div>
      <div className="p-6">
        {activeCalls.length > 0 ? (
          <div className="space-y-4">
            {activeCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                data-testid={`card-call-${call.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" data-testid="status-call-active"></div>
                  <div>
                    <p className="font-medium text-gray-900" data-testid={`text-phone-${call.id}`}>
                      {call.phoneNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Connected {formatDuration(call.startTime.toString())}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getMatterTypeColor(call.matterType)}`}
                    data-testid={`text-matter-type-${call.id}`}
                  >
                    {call.matterType || "Connecting..."}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEndCall(call.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 border-red-200"
                    data-testid={`button-end-call-${call.id}`}
                  >
                    <i className="fas fa-phone-slash mr-1"></i>
                    End
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" data-testid="text-no-active-calls">
            <i className="fas fa-phone-slash text-gray-300 text-4xl mb-4"></i>
            <p className="text-gray-500">No active calls</p>
          </div>
        )}
      </div>
    </div>
  );
}
