import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER || '+15104432123';

if (!accountSid || !authToken) {
  throw new Error('Twilio credentials are required');
}

const client = twilio(accountSid, authToken);

export class TwilioService {
  static generateTwiMLResponse(websocketUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${websocketUrl}" />
    </Connect>
</Response>`;
  }

  static async makeCall(to: string, callbackUrl: string): Promise<string> {
    try {
      const call = await client.calls.create({
        from: phoneNumber,
        to: to,
        url: callbackUrl,
      });
      return call.sid;
    } catch (error) {
      throw new Error(`Failed to make call: ${error}`);
    }
  }

  static async endCall(callSid: string): Promise<void> {
    try {
      await client.calls(callSid).update({ status: 'completed' });
    } catch (error) {
      throw new Error(`Failed to end call: ${error}`);
    }
  }

  static async getCallDetails(callSid: string) {
    try {
      const call = await client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        from: call.from,
        to: call.to,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
      };
    } catch (error) {
      throw new Error(`Failed to get call details: ${error}`);
    }
  }
}
