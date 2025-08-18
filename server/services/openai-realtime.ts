import OpenAI from 'openai';
import { WebSocket } from 'ws';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIRealtimeService {
  private static readonly SYSTEM_PROMPT = `You are a professional AI receptionist for The Law Offices of Pritpal Singh, a California real estate law firm. Your role is to:

1. BUSINESS HOURS: Mon-Fri 8AM-6PM PST/PDT. Check current time and handle accordingly.

2. INTAKE COLLECTION: For new clients, collect:
   - Full name
   - Phone number  
   - Email address
   - Brief description of their real estate matter
   - Urgency level

3. MATTER TYPES: California real estate law including:
   - Purchase/sale transactions
   - Landlord-tenant disputes
   - Property development
   - Zoning issues
   - Real estate litigation
   - Title issues

4. GENERAL INFORMATION: Provide general information about California real estate law but NEVER give specific legal advice. Always include disclaimer: "This is general information only and not legal advice."

5. BILLING INQUIRIES: Direct to https://pritsinghlaw.com/pay-my-bill

6. EMERGENCY: For urgent matters (eviction notices, contract deadlines), escalate immediately.

7. AFTER HOURS: Capture message and promise callback next business day.

Be professional, empathetic, and efficient. Keep responses concise but thorough.`;

  static async createRealtimeSession(): Promise<string> {
    try {
      // Create a realtime session with OpenAI
      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview',
          voice: 'alloy',
          instructions: this.SYSTEM_PROMPT,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const session = await response.json();
      return session.id;
    } catch (error) {
      throw new Error(`Failed to create OpenAI realtime session: ${error}`);
    }
  }

  static async handleRealtimeConnection(
    sessionId: string,
    twilioWs: WebSocket,
    onIntakeCollected?: (intake: any) => void,
    onCallEnded?: () => void
  ): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const openaiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      openaiWs.on('open', () => {
        console.log('Connected to OpenAI Realtime API');
        
        // Send initial session configuration
        openaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: this.SYSTEM_PROMPT,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        }));

        resolve(openaiWs);
      });

      openaiWs.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        // Handle different message types from OpenAI
        switch (message.type) {
          case 'response.audio.delta':
            // Forward audio to Twilio
            if (twilioWs.readyState === WebSocket.OPEN) {
              twilioWs.send(JSON.stringify({
                event: 'media',
                media: {
                  payload: message.delta
                }
              }));
            }
            break;
            
          case 'response.done':
            // Check if intake information was collected
            if (message.response?.output?.[0]?.content) {
              const content = message.response.output[0].content;
              if (content.includes('INTAKE_COMPLETE:')) {
                try {
                  const intakeData = JSON.parse(content.split('INTAKE_COMPLETE:')[1]);
                  onIntakeCollected?.(intakeData);
                } catch (e) {
                  console.error('Failed to parse intake data:', e);
                }
              }
            }
            break;
            
          case 'error':
            console.error('OpenAI Realtime API error:', message);
            break;
        }
      });

      openaiWs.on('error', (error) => {
        console.error('OpenAI WebSocket error:', error);
        reject(error);
      });

      openaiWs.on('close', () => {
        console.log('OpenAI WebSocket connection closed');
        onCallEnded?.();
      });

      // Forward audio from Twilio to OpenAI
      twilioWs.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.event === 'media' && openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: message.media.payload
          }));
        }
      });
    });
  }

  static async analyzeCallTranscript(transcript: string): Promise<{
    summary: string;
    matterType: string;
    urgency: string;
    intakeComplete: boolean;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: 'system',
            content: 'Analyze this call transcript and extract key information. Respond with JSON containing: summary, matterType, urgency (low/normal/high/emergency), and intakeComplete (boolean).'
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        response_format: { type: 'json_object' },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Failed to analyze call transcript:', error);
      return {
        summary: 'Call analysis failed',
        matterType: 'unknown',
        urgency: 'normal',
        intakeComplete: false
      };
    }
  }
}
