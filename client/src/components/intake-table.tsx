import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Intake } from "@shared/schema";

export function IntakeTable() {
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addMessageListener } = useWebSocket('/ws');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/intakes'],
  });

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setIntakes(data);
    }
  }, [data]);

  useEffect(() => {
    const removeListener = addMessageListener((message) => {
      switch (message.type) {
        case 'intake_created':
          setIntakes(prev => [message.intake, ...prev]);
          break;
        case 'intake_updated':
          setIntakes(prev => prev.map(intake => 
            intake.id === message.intake.id ? message.intake : intake
          ));
          break;
      }
    });

    return () => {
      removeListener();
    };
  }, [addMessageListener]);

  const handleReviewIntake = async (intakeId: string) => {
    try {
      await apiRequest('PATCH', `/api/intakes/${intakeId}`, {
        status: 'reviewed',
        reviewedAt: new Date().toISOString(),
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/intakes'] });
      
      toast({
        title: "Intake reviewed",
        description: "The intake has been marked as reviewed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update intake status.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleConsult = async (intakeId: string) => {
    try {
      await apiRequest('PATCH', `/api/intakes/${intakeId}`, {
        status: 'scheduled',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/intakes'] });
      
      toast({
        title: "Consultation scheduled",
        description: "The consultation has been scheduled.",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to schedule consultation.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      reviewed: "bg-green-100 text-green-800",
      scheduled: "bg-blue-100 text-blue-800",
      completed: "bg-gray-100 text-gray-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  const getMatterTypeColor = (matterType: string) => {
    const colorMap: Record<string, string> = {
      "Real Estate Purchase": "bg-blue-100 text-blue-800",
      "Landlord Dispute": "bg-red-100 text-red-800", 
      "Property Sale": "bg-purple-100 text-purple-800",
      "Zoning Issues": "bg-orange-100 text-orange-800",
      "Title Issues": "bg-indigo-100 text-indigo-800",
    };
    return colorMap[matterType] || "bg-gray-100 text-gray-800";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Client Intake</h3>
              <p className="text-sm text-gray-600">Latest submissions from voice calls</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading intakes...</p>
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
            <h3 className="text-lg font-semibold text-gray-900" data-testid="text-intake-table-title">Recent Client Intake</h3>
            <p className="text-sm text-gray-600">Latest submissions from voice calls</p>
          </div>
          <Button 
            className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600"
            data-testid="button-view-all-intakes"
          >
            View All
          </Button>
        </div>
      </div>
      
      {intakes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matter Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {intakes.map((intake) => (
                <tr key={intake.id} className="hover:bg-gray-50" data-testid={`row-intake-${intake.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900" data-testid={`text-client-name-${intake.id}`}>
                        {intake.name}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-client-phone-${intake.id}`}>
                        {intake.phoneNumber}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getMatterTypeColor(intake.matterType)}`}
                      data-testid={`text-matter-type-${intake.id}`}
                    >
                      {intake.matterType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-client-email-${intake.id}`}>
                    {intake.email || 'Not provided'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-intake-time-${intake.id}`}>
                    {formatTime(intake.createdAt.toString())}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(intake.status || 'pending')}`}
                      data-testid={`text-intake-status-${intake.id}`}
                    >
                      {intake.status === 'pending' ? 'Pending Review' : 
                       intake.status === 'reviewed' ? 'Reviewed' :
                       intake.status === 'scheduled' ? 'Scheduled' : 'Completed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {intake.status === 'pending' ? (
                      <>
                        <button 
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => handleReviewIntake(intake.id)}
                          data-testid={`button-review-intake-${intake.id}`}
                        >
                          Review
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-900"
                          data-testid={`button-call-client-${intake.id}`}
                        >
                          Call Back
                        </button>
                      </>
                    ) : intake.status === 'reviewed' ? (
                      <>
                        <button 
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => handleScheduleConsult(intake.id)}
                          data-testid={`button-schedule-consult-${intake.id}`}
                        >
                          Schedule
                        </button>
                        <button 
                          className="text-gray-400 cursor-not-allowed"
                          disabled
                          data-testid={`button-call-disabled-${intake.id}`}
                        >
                          Call Back
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400" data-testid={`text-no-actions-${intake.id}`}>No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6">
          <div className="text-center py-8" data-testid="text-no-intakes">
            <i className="fas fa-users text-gray-300 text-4xl mb-4"></i>
            <p className="text-gray-500">No intake submissions yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
