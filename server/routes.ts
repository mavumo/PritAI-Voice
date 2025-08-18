import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { TwilioService } from "./services/twilio";
import { OpenAIRealtimeService } from "./services/openai-realtime";
import { BusinessHoursService } from "./services/business-hours";
import { insertCallSchema, insertIntakeSchema, insertSystemLogSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Broadcast to all connected clients
  const broadcast = (message: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Twilio webhook for incoming calls
  app.post('/api/twilio/voice', async (req, res) => {
    try {
      const { CallSid, From, To } = req.body;
      
      // Create call record
      const call = await storage.createCall({
        phoneNumber: From,
        status: 'active',
        callSid: CallSid,
        sessionId: null,
        matterType: null,
        summary: null,
        audioUrl: null,
      });

      // Log the incoming call
      await storage.createSystemLog({
        type: 'call',
        message: 'Incoming call received',
        details: { phoneNumber: From, callSid: CallSid },
        level: 'info',
        relatedId: call.id,
      });

      // Generate WebSocket URL for audio streaming
      const wsUrl = `wss://${req.get('host')}/api/twilio/stream/${call.id}`;
      
      // Return TwiML response
      const twiml = TwilioService.generateTwiMLResponse(wsUrl);
      res.type('text/xml').send(twiml);

      // Broadcast call update
      broadcast({ type: 'call_started', call });

    } catch (error) {
      console.error('Twilio webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Twilio audio streaming endpoint
  app.ws('/api/twilio/stream/:callId', async (ws, req) => {
    const callId = req.params.callId;
    let openaiWs: WebSocket | null = null;
    
    try {
      const call = await storage.getCall(callId);
      if (!call) {
        ws.close(1000, 'Call not found');
        return;
      }

      // Create OpenAI Realtime session
      const sessionId = await OpenAIRealtimeService.createRealtimeSession();
      await storage.updateCall(callId, { sessionId });

      // Connect to OpenAI Realtime API
      openaiWs = await OpenAIRealtimeService.handleRealtimeConnection(
        sessionId,
        ws,
        // On intake collected
        async (intakeData) => {
          try {
            const intake = await storage.createIntake({
              callId: call.id,
              name: intakeData.name,
              phoneNumber: intakeData.phoneNumber || call.phoneNumber,
              email: intakeData.email,
              matterType: intakeData.matterType,
              matterSummary: intakeData.matterSummary,
              urgency: intakeData.urgency || 'normal',
              status: 'pending',
              additionalInfo: intakeData.additionalInfo,
            });

            await storage.createSystemLog({
              type: 'intake',
              message: 'Client intake completed',
              details: { name: intake.name, matterType: intake.matterType },
              level: 'info',
              relatedId: intake.id,
            });

            broadcast({ type: 'intake_created', intake });
          } catch (error) {
            console.error('Failed to create intake:', error);
          }
        },
        // On call ended
        async () => {
          await storage.updateCall(callId, { 
            status: 'completed',
            endTime: new Date(),
          });
          broadcast({ type: 'call_ended', callId });
        }
      );

    } catch (error) {
      console.error('Audio streaming error:', error);
      ws.close(1000, 'Stream error');
    }

    ws.on('close', async () => {
      if (openaiWs) {
        openaiWs.close();
      }
      
      // Update call status
      try {
        const call = await storage.getCall(callId);
        if (call && call.status === 'active') {
          await storage.updateCall(callId, { 
            status: 'completed',
            endTime: new Date(),
          });
          broadcast({ type: 'call_ended', callId });
        }
      } catch (error) {
        console.error('Failed to update call on close:', error);
      }
    });
  });

  // Dashboard API endpoints
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const stats = await storage.getTodayStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get dashboard stats' });
    }
  });

  app.get('/api/calls', async (req, res) => {
    try {
      const calls = await storage.getAllCalls();
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get calls' });
    }
  });

  app.get('/api/calls/active', async (req, res) => {
    try {
      const activeCalls = await storage.getActiveCalls();
      res.json(activeCalls);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get active calls' });
    }
  });

  app.post('/api/calls/:callId/end', async (req, res) => {
    try {
      const { callId } = req.params;
      const call = await storage.getCall(callId);
      
      if (!call) {
        return res.status(404).json({ message: 'Call not found' });
      }

      if (call.callSid) {
        await TwilioService.endCall(call.callSid);
      }

      const updatedCall = await storage.updateCall(callId, { 
        status: 'ended',
        endTime: new Date(),
      });

      broadcast({ type: 'call_ended', callId });
      res.json(updatedCall);
    } catch (error) {
      res.status(500).json({ message: 'Failed to end call' });
    }
  });

  app.get('/api/intakes', async (req, res) => {
    try {
      const { status, limit } = req.query;
      let intakes;
      
      if (status) {
        intakes = await storage.getIntakesByStatus(status as string);
      } else if (limit) {
        intakes = await storage.getRecentIntakes(parseInt(limit as string));
      } else {
        intakes = await storage.getAllIntakes();
      }
      
      res.json(intakes);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get intakes' });
    }
  });

  app.patch('/api/intakes/:intakeId', async (req, res) => {
    try {
      const { intakeId } = req.params;
      const updates = req.body;
      
      const updatedIntake = await storage.updateIntake(intakeId, updates);
      
      if (!updatedIntake) {
        return res.status(404).json({ message: 'Intake not found' });
      }

      broadcast({ type: 'intake_updated', intake: updatedIntake });
      res.json(updatedIntake);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update intake' });
    }
  });

  app.get('/api/system/logs', async (req, res) => {
    try {
      const { limit, type } = req.query;
      let logs;
      
      if (type) {
        logs = await storage.getSystemLogsByType(type as string);
      } else {
        logs = await storage.getSystemLogs(limit ? parseInt(limit as string) : 50);
      }
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get system logs' });
    }
  });

  app.get('/api/system/config', async (req, res) => {
    try {
      const config = await storage.getSystemConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get system config' });
    }
  });

  app.patch('/api/system/config', async (req, res) => {
    try {
      const updates = req.body;
      const config = await storage.updateSystemConfig(updates);
      
      broadcast({ type: 'config_updated', config });
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update system config' });
    }
  });

  app.get('/api/system/business-hours', async (req, res) => {
    try {
      const isOpen = BusinessHoursService.isBusinessHours();
      const message = BusinessHoursService.getBusinessHoursMessage();
      const currentTime = BusinessHoursService.getCurrentPSTTime();
      const nextBusinessDay = BusinessHoursService.getNextBusinessDay();
      
      res.json({
        isOpen,
        message,
        currentTime,
        nextBusinessDay,
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get business hours info' });
    }
  });

  return httpServer;
}
