// server/index.ts
import express2 from "express";
import expressWs from "express-ws";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket as WebSocket2 } from "ws";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  calls;
  intakes;
  systemLogs;
  systemConfig;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.calls = /* @__PURE__ */ new Map();
    this.intakes = /* @__PURE__ */ new Map();
    this.systemLogs = /* @__PURE__ */ new Map();
    this.systemConfig = {
      id: randomUUID(),
      businessHoursEnabled: true,
      responseMode: "friendly",
      twilioWebhookUrl: null,
      openaiApiStatus: "connected",
      lastUpdated: /* @__PURE__ */ new Date()
    };
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Call methods
  async getCall(id) {
    return this.calls.get(id);
  }
  async getCallByCallSid(callSid) {
    return Array.from(this.calls.values()).find((call) => call.callSid === callSid);
  }
  async getActiveCalls() {
    return Array.from(this.calls.values()).filter((call) => call.status === "active");
  }
  async getAllCalls() {
    return Array.from(this.calls.values()).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }
  async createCall(insertCall) {
    const id = randomUUID();
    const call = {
      ...insertCall,
      id,
      startTime: /* @__PURE__ */ new Date(),
      endTime: null,
      duration: null,
      summary: insertCall.summary || null,
      callSid: insertCall.callSid || null,
      sessionId: insertCall.sessionId || null,
      matterType: insertCall.matterType || null,
      audioUrl: insertCall.audioUrl || null
    };
    this.calls.set(id, call);
    return call;
  }
  async updateCall(id, updates) {
    const call = this.calls.get(id);
    if (!call) return void 0;
    const updatedCall = { ...call, ...updates };
    this.calls.set(id, updatedCall);
    return updatedCall;
  }
  // Intake methods
  async getIntake(id) {
    return this.intakes.get(id);
  }
  async getIntakesByStatus(status) {
    return Array.from(this.intakes.values()).filter((intake) => intake.status === status);
  }
  async getAllIntakes() {
    return Array.from(this.intakes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async getRecentIntakes(limit = 10) {
    const allIntakes = await this.getAllIntakes();
    return allIntakes.slice(0, limit);
  }
  async createIntake(insertIntake) {
    const id = randomUUID();
    const intake = {
      ...insertIntake,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      reviewedAt: null,
      status: insertIntake.status || "pending",
      email: insertIntake.email || null,
      callId: insertIntake.callId || null,
      urgency: insertIntake.urgency || null,
      additionalInfo: insertIntake.additionalInfo || null
    };
    this.intakes.set(id, intake);
    return intake;
  }
  async updateIntake(id, updates) {
    const intake = this.intakes.get(id);
    if (!intake) return void 0;
    const updatedIntake = { ...intake, ...updates };
    this.intakes.set(id, updatedIntake);
    return updatedIntake;
  }
  // System log methods
  async getSystemLogs(limit = 50) {
    const logs = Array.from(this.systemLogs.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return logs.slice(0, limit);
  }
  async getSystemLogsByType(type) {
    return Array.from(this.systemLogs.values()).filter((log2) => log2.type === type);
  }
  async createSystemLog(insertLog) {
    const id = randomUUID();
    const log2 = {
      ...insertLog,
      id,
      timestamp: /* @__PURE__ */ new Date(),
      details: insertLog.details || null,
      level: insertLog.level || "info",
      relatedId: insertLog.relatedId || null
    };
    this.systemLogs.set(id, log2);
    return log2;
  }
  // System config methods
  async getSystemConfig() {
    return this.systemConfig;
  }
  async updateSystemConfig(updates) {
    this.systemConfig = {
      ...this.systemConfig,
      ...updates,
      lastUpdated: /* @__PURE__ */ new Date()
    };
    return this.systemConfig;
  }
  // Dashboard stats
  async getTodayStats() {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const allCalls = Array.from(this.calls.values());
    const callsToday = allCalls.filter(
      (call) => new Date(call.startTime).getTime() >= today.getTime()
    ).length;
    const activeCalls = allCalls.filter((call) => call.status === "active").length;
    const allIntakes = Array.from(this.intakes.values());
    const newIntakes = allIntakes.filter(
      (intake) => new Date(intake.createdAt).getTime() >= today.getTime()
    ).length;
    const avgResponseTime = 1.2;
    return {
      callsToday,
      activeCalls,
      newIntakes,
      avgResponseTime
    };
  }
};
var storage = new MemStorage();

// server/services/twilio.ts
import twilio from "twilio";
var accountSid = process.env.TWILIO_ACCOUNT_SID;
var authToken = process.env.TWILIO_AUTH_TOKEN;
var phoneNumber = process.env.TWILIO_PHONE_NUMBER || "+15104432123";
if (!accountSid || !authToken) {
  throw new Error("Twilio credentials are required");
}
var client = twilio(accountSid, authToken);
var TwilioService = class {
  static generateTwiMLResponse(websocketUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${websocketUrl}" />
    </Connect>
</Response>`;
  }
  static async makeCall(to, callbackUrl) {
    try {
      const call = await client.calls.create({
        from: phoneNumber,
        to,
        url: callbackUrl
      });
      return call.sid;
    } catch (error) {
      throw new Error(`Failed to make call: ${error}`);
    }
  }
  static async endCall(callSid) {
    try {
      await client.calls(callSid).update({ status: "completed" });
    } catch (error) {
      throw new Error(`Failed to end call: ${error}`);
    }
  }
  static async getCallDetails(callSid) {
    try {
      const call = await client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        from: call.from,
        to: call.to,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime
      };
    } catch (error) {
      throw new Error(`Failed to get call details: ${error}`);
    }
  }
};

// server/services/openai-realtime.ts
import OpenAI from "openai";
import { WebSocket } from "ws";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
var OpenAIRealtimeService = class {
  static SYSTEM_PROMPT = `PRODUCT: OpenAI GPT-4o (realtime voice)
ROLE: Warm, efficient, human-sounding virtual receptionist for a California real estate law firm.
FIRM: Law Offices of Pritpal Singh (\u201Cthe Firm\u201D)

OPENING GREETING (use these exact words verbatim):
"Hello. You\u2019ve reached the Law Offices of Pritpal Singh. Please note that this call may be recorded for quality control & training purposes. Kindly describe your real estate legal matter so I can be assistance?"

PRIMARY OBJECTIVE
1) Understand the caller\u2019s real estate issue and urgency.
2) Provide GENERAL information (California-focused) \u2014 no legal advice.
3) Share accurate Firm details (consultations, billing, contact) and route/schedule next steps.
4) Capture a minimal, high-quality intake and emit a single structured JSON block when complete.
5) Sound natural and non-repetitive; avoid robotic phrasing.

BUSINESS HOURS & TIMEZONE
- Office hours: Mon\u2013Fri, 8:00 AM\u20136:00 PM (America/Los_Angeles, PST/PDT).
- If outside hours: use the \u201CAfter-Hours Script\u201D below (offer intake + callback).
- Always restate any dates/times you discuss.

SCOPE & GUARDRAILS
- General California real estate law information ONLY. NO legal advice.
- This call does NOT create an attorney\u2013client relationship.
- Do NOT accept service of process.
- Avoid collecting sensitive data (SSNs, full card numbers, DOB, bank details). Collect only what\u2019s needed to schedule/route.
- If info is unknown or not on the site, say so and offer intake/phone/email.

AUTHORITATIVE FIRM LINKS (prefer these when sharing info)
- Main site: https://www.pritsinghlaw.com  and  https://pritsinghlaw.com
- Attorney profile: https://pritsinghlaw.com/team/pritpal-singh
- Services / Practice Areas: https://pritsinghlaw.com/services
- Intake / Consultation Booking: https://www.pritsinghlaw.com/client-area/intake-form
- Payments (LawPay): https://pritsinghlaw.com/pay-my-bill
- Staff example: https://pritsinghlaw.com/team/michael-chigbu

CORE FACTS (quote accurately)
- Consultations:
  \u2022 Free 15-minute consultation (phone or Zoom)
  \u2022 Paid 1-hour consultation: $500 (in person or via Zoom)
  \u2022 Book via the secure intake form: https://www.pritsinghlaw.com/client-area/intake-form
  \u2022 Or call: (510) 225-9220 (legal team) or (510) 443-2123 (bookings/general assistance)
- Billing & Payments:
  \u2022 Primary: LawPay portal \u2014 https://pritsinghlaw.com/pay-my-bill
  \u2022 Accepts credit/debit and eChecks; payment plans via Affirm when available (subject to credit)
  \u2022 Stripe checkout available on request (tell caller we\u2019ll send a Stripe payment request with next steps)
- Response times:
  \u2022 \u201CThe legal team typically responds within 4\u20138 hours during normal office hours.\u201D

MATTER TYPES WE HANDLE (from Services page \u2014 use these labels)
- Real Estate Litigation
- Landlord / Tenant Matters
- Premises Liability
- Boundary Disputes
- Quiet Title Actions
- Adverse Possession Claims
- Easements & Encroachments
- Mortgage Fraud
- Foreclosure Defense
- Contract Review & Drafting
- Purchase Agreements
- Real Estate Closings
- Property Broker Disputes
- Property Financing Documents
- Title & Escrow Disputes

VOICE & STYLE
- Sound like a friendly professional human. Short sentences. Vary acknowledgments (\u201CUnderstood,\u201D \u201CGot it,\u201D \u201CThanks for explaining.\u201D).
- Keep answers concise (1\u20133 short paragraphs). Use brief bullets when longer.
- Avoid legalese unless the caller asks. Always include: \u201CThis is general information only and not legal advice.\u201D

CALL FLOW (end-to-end)
1) Acknowledge & Clarify
   - Reflect back the gist in one short line.
   - Ask ONLY essential questions that change next steps:
     \u2022 CA location/jurisdiction
     \u2022 Matter type (choose from list above)
     \u2022 Key deadline/date (sale, eviction, hearing)
     \u2022 Opposing party names (for conflict check)
     \u2022 Urgency level

2) Jurisdiction & Fit
   - Focus on California matters. If non-CA, provide general info and invite consult to confirm fit.

3) Light Conflict Check
   - Politely request names of opposing parties (landlord, buyer/seller, HOA, etc.). If declined, proceed and mark \u201Cparty names pending.\u201D

4) Triage & Next Step
   - New matters: offer free 15-min or paid 1-hour consult; capture contact; send intake link; or route to bookings line.
   - Current clients: route to legal team number and confirm best callback time.
   - Urgent timelines (foreclosure notice, lockout, hearing, sale closing): flag as \u201Curgent,\u201D give intake link + legal team number immediately.

5) Scheduling
   - Offer the two consult options exactly as listed (free 15-min phone/Zoom, or $500 1-hour in person/Zoom).
   - If live scheduling isn\u2019t available, direct to intake form or call (510) 443-2123.
   - Confirm name, phone, email, preferred consult type and channel (phone/Zoom/in person).

6) Documents
   - Do not collect long document text over the phone. Direct uploads to the intake form or email info@pritsinghlaw.com AFTER consult is set.

7) Payments
   - For invoices: LawPay portal link. For Stripe on request: \u201CWe\u2019ll send a Stripe payment request with next steps.\u201D

8) Wrap-Up
   - Summarize matter type, urgency, and next step.
   - Offer to text/email key links (intake, payments, services). Ask permission before sending.
   - Repeat legal team number for anything time-sensitive.

EMERGENCY / HIGH URGENCY SCRIPT (examples)
- \u201CGiven the deadline you mentioned, I\u2019ll mark this urgent. The fastest path is to complete our secure intake at pritsinghlaw.com/client-area/intake-form. You can also call the legal team at (510) 225-9220. The team typically responds within 4\u20138 business hours.\u201D

AFTER-HOURS SCRIPT
- \u201COur attorneys may be unavailable right now. The fastest next step is our secure intake form at pritsinghlaw.com/client-area/intake-form. The legal team typically responds within 4\u20138 hours during normal office hours. I can also record your callback number and a short summary for the team.\u201D

COMPLIANCE REMINDERS (do not deviate)
- No legal advice; general information only.
- State explicitly: \u201CThis is general information only and not legal advice.\u201D
- No acceptance of service of process.
- No fee quotes beyond the consultation pricing above.
- If unsure or info not on site: say so and offer intake/phone/email.

OUTPUT RULES (critical for host integration)
- Do NOT reveal chain-of-thought. Output only the final spoken response.
- Speak naturally; avoid repetitive fillers.
- When the caller has provided all intake data, emit EXACTLY ONE structured JSON block on its own line prefixed with:
  INTAKE_COMPLETE: { ...json... }
- Do NOT emit the JSON until you have at least: full_name, phone, email, matter_type, brief_description, urgency, city_or_county (if known), preferred_consult, preferred_channel. If opposing party names or critical date are unknown, include empty values.

INTAKE JSON SHAPE (use these keys exactly)
INTAKE_COMPLETE: {
  "full_name": "",
  "phone": "",
  "email": "",
  "city_or_county": "",
  "matter_type": "",                 // one of the listed matter types; otherwise "Other"
  "brief_description": "",
  "opposing_parties": [],            // array of strings; [] if unknown
  "critical_date": "",               // ISO yyyy-mm-dd or empty
  "urgency": "low|normal|high|emergency",
  "preferred_consult": "15min_free|60min_paid|undecided",
  "preferred_channel": "phone|zoom|in_person",
  "notes": ""                        // short internal note for routing
}

EXAMPLE VOICE SNIPPETS (ready to speak)
- Consults: \u201CWe offer a free 15-minute phone or Zoom consult, or a 1-hour consult for $500 in person or via Zoom. I can send the intake link now, or you can call (510) 443-2123 to schedule.\u201D
- Billing: \u201CYou can pay securely through our LawPay portal at pritsinghlaw.com/pay-my-bill using a card or eCheck. Payment plans through Affirm may be available. Prefer Stripe? We\u2019ll send a payment request with next steps.\u201D
- Escalation: \u201CI\u2019ll flag this as time-sensitive. The legal team typically responds within 4\u20138 hours during normal office hours. Here\u2019s the legal team number as well: (510) 225-9220.\u201D

SAFETY & PRIVACY
- Collect minimum necessary data. If caller starts sharing sensitive information, pause and redirect to the secure intake or a scheduled consultation.
- Always include the disclaimer line once per call context: \u201CThis is general information only and not legal advice.\u201D
`;
  static async createRealtimeSession() {
    try {
      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview",
          voice: "alloy",
          instructions: this.SYSTEM_PROMPT,
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1"
          }
        })
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
  static async handleRealtimeConnection(sessionId, twilioWs, onIntakeCollected, onCallEnded) {
    return new Promise((resolve, reject) => {
      const openaiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      });
      openaiWs.on("open", () => {
        console.log("Connected to OpenAI Realtime API");
        openaiWs.send(JSON.stringify({
          type: "session.update",
          session: {
            instructions: this.SYSTEM_PROMPT,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            }
          }
        }));
        resolve(openaiWs);
      });
      openaiWs.on("message", (data) => {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case "response.audio.delta":
            if (twilioWs.readyState === WebSocket.OPEN) {
              twilioWs.send(JSON.stringify({
                event: "media",
                media: {
                  payload: message.delta
                }
              }));
            }
            break;
          case "response.done":
            if (message.response?.output?.[0]?.content) {
              const content = message.response.output[0].content;
              if (content.includes("INTAKE_COMPLETE:")) {
                try {
                  const intakeData = JSON.parse(content.split("INTAKE_COMPLETE:")[1]);
                  onIntakeCollected?.(intakeData);
                } catch (e) {
                  console.error("Failed to parse intake data:", e);
                }
              }
            }
            break;
          case "error":
            console.error("OpenAI Realtime API error:", message);
            break;
        }
      });
      openaiWs.on("error", (error) => {
        console.error("OpenAI WebSocket error:", error);
        reject(error);
      });
      openaiWs.on("close", () => {
        console.log("OpenAI WebSocket connection closed");
        onCallEnded?.();
      });
      twilioWs.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.event === "media" && openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: message.media.payload
          }));
        }
      });
    });
  }
  static async analyzeCallTranscript(transcript) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Analyze this call transcript and extract key information. Respond with JSON containing: summary, matterType, urgency (low/normal/high/emergency), and intakeComplete (boolean)."
          },
          {
            role: "user",
            content: transcript
          }
        ],
        response_format: { type: "json_object" }
      });
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Failed to analyze call transcript:", error);
      return {
        summary: "Call analysis failed",
        matterType: "unknown",
        urgency: "normal",
        intakeComplete: false
      };
    }
  }
};

// server/services/business-hours.ts
var BusinessHoursService = class {
  static BUSINESS_HOURS = {
    start: 8,
    // 8 AM
    end: 18,
    // 6 PM
    timezone: "America/Los_Angeles",
    // PST/PDT
    workDays: [1, 2, 3, 4, 5]
    // Monday to Friday
  };
  static isBusinessHours() {
    const now = /* @__PURE__ */ new Date();
    const pstTime = new Date(now.toLocaleString("en-US", {
      timeZone: this.BUSINESS_HOURS.timezone
    }));
    const currentDay = pstTime.getDay();
    const currentHour = pstTime.getHours();
    if (!this.BUSINESS_HOURS.workDays.includes(currentDay)) {
      return false;
    }
    return currentHour >= this.BUSINESS_HOURS.start && currentHour < this.BUSINESS_HOURS.end;
  }
  static getBusinessHoursMessage() {
    if (this.isBusinessHours()) {
      return "We're currently open during business hours.";
    }
    return "We're currently closed. Our business hours are Monday through Friday, 8 AM to 6 PM Pacific Time. Please leave a message and we'll call you back during business hours.";
  }
  static getNextBusinessDay() {
    const now = /* @__PURE__ */ new Date();
    const pstTime = new Date(now.toLocaleString("en-US", {
      timeZone: this.BUSINESS_HOURS.timezone
    }));
    let nextBusinessDay = new Date(pstTime);
    if (this.BUSINESS_HOURS.workDays.includes(pstTime.getDay()) && pstTime.getHours() >= this.BUSINESS_HOURS.end) {
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }
    while (!this.BUSINESS_HOURS.workDays.includes(nextBusinessDay.getDay())) {
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }
    nextBusinessDay.setHours(this.BUSINESS_HOURS.start, 0, 0, 0);
    return nextBusinessDay;
  }
  static getCurrentPSTTime() {
    const now = /* @__PURE__ */ new Date();
    return now.toLocaleTimeString("en-US", {
      timeZone: this.BUSINESS_HOURS.timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }) + " PST";
  }
};

// server/routes.ts
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const broadcast = (message) => {
    wss.clients.forEach((client2) => {
      if (client2.readyState === WebSocket2.OPEN) {
        client2.send(JSON.stringify(message));
      }
    });
  };
  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
    });
  });
  app2.post("/api/twilio/voice", async (req, res) => {
    try {
      const { CallSid, From, To } = req.body;
      const call = await storage.createCall({
        phoneNumber: From,
        status: "active",
        callSid: CallSid,
        sessionId: null,
        matterType: null,
        summary: null,
        audioUrl: null
      });
      await storage.createSystemLog({
        type: "call",
        message: "Incoming call received",
        details: { phoneNumber: From, callSid: CallSid },
        level: "info",
        relatedId: call.id
      });
      const wsUrl = `wss://${req.get("host")}/api/twilio/stream/${call.id}`;
      const twiml = TwilioService.generateTwiMLResponse(wsUrl);
      res.type("text/xml").send(twiml);
      broadcast({ type: "call_started", call });
    } catch (error) {
      console.error("Twilio webhook error:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  app2.ws("/api/twilio/stream/:callId", async (ws, req) => {
    const callId = req.params.callId;
    let openaiWs = null;
    try {
      const call = await storage.getCall(callId);
      if (!call) {
        ws.close(1e3, "Call not found");
        return;
      }
      const sessionId = await OpenAIRealtimeService.createRealtimeSession();
      await storage.updateCall(callId, { sessionId });
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
              urgency: intakeData.urgency || "normal",
              status: "pending",
              additionalInfo: intakeData.additionalInfo
            });
            await storage.createSystemLog({
              type: "intake",
              message: "Client intake completed",
              details: { name: intake.name, matterType: intake.matterType },
              level: "info",
              relatedId: intake.id
            });
            broadcast({ type: "intake_created", intake });
          } catch (error) {
            console.error("Failed to create intake:", error);
          }
        },
        // On call ended
        async () => {
          await storage.updateCall(callId, {
            status: "completed",
            endTime: /* @__PURE__ */ new Date()
          });
          broadcast({ type: "call_ended", callId });
        }
      );
    } catch (error) {
      console.error("Audio streaming error:", error);
      ws.close(1e3, "Stream error");
    }
    ws.on("close", async () => {
      if (openaiWs) {
        openaiWs.close();
      }
      try {
        const call = await storage.getCall(callId);
        if (call && call.status === "active") {
          await storage.updateCall(callId, {
            status: "completed",
            endTime: /* @__PURE__ */ new Date()
          });
          broadcast({ type: "call_ended", callId });
        }
      } catch (error) {
        console.error("Failed to update call on close:", error);
      }
    });
  });
  app2.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getTodayStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });
  app2.get("/api/calls", async (req, res) => {
    try {
      const calls = await storage.getAllCalls();
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to get calls" });
    }
  });
  app2.get("/api/calls/active", async (req, res) => {
    try {
      const activeCalls = await storage.getActiveCalls();
      res.json(activeCalls);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active calls" });
    }
  });
  app2.post("/api/calls/:callId/end", async (req, res) => {
    try {
      const { callId } = req.params;
      const call = await storage.getCall(callId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      if (call.callSid) {
        await TwilioService.endCall(call.callSid);
      }
      const updatedCall = await storage.updateCall(callId, {
        status: "ended",
        endTime: /* @__PURE__ */ new Date()
      });
      broadcast({ type: "call_ended", callId });
      res.json(updatedCall);
    } catch (error) {
      res.status(500).json({ message: "Failed to end call" });
    }
  });
  app2.post("/api/test/simulate-call", async (req, res) => {
    try {
      const { phoneNumber: phoneNumber2 = "+15551234567" } = req.body;
      const call = await storage.createCall({
        phoneNumber: phoneNumber2,
        status: "active",
        callSid: `test_${Date.now()}`,
        sessionId: null,
        matterType: null,
        summary: null,
        audioUrl: null
      });
      await storage.createSystemLog({
        type: "call",
        message: "Test call simulated",
        details: { phoneNumber: phoneNumber2, callSid: call.callSid },
        level: "info",
        relatedId: call.id
      });
      broadcast({ type: "call_started", call });
      res.json({
        message: "Test call simulated successfully",
        call,
        instructions: "You can end this test call from the dashboard or it will auto-end in 30 seconds"
      });
      setTimeout(async () => {
        try {
          await storage.updateCall(call.id, {
            status: "completed",
            endTime: /* @__PURE__ */ new Date(),
            duration: 30,
            summary: "Test call - automatically ended"
          });
          broadcast({ type: "call_ended", callId: call.id });
        } catch (error) {
          console.error("Failed to auto-end test call:", error);
        }
      }, 3e4);
    } catch (error) {
      console.error("Test call simulation error:", error);
      res.status(500).json({ message: "Failed to simulate test call" });
    }
  });
  app2.get("/api/intakes", async (req, res) => {
    try {
      const { status, limit } = req.query;
      let intakes;
      if (status) {
        intakes = await storage.getIntakesByStatus(status);
      } else if (limit) {
        intakes = await storage.getRecentIntakes(parseInt(limit));
      } else {
        intakes = await storage.getAllIntakes();
      }
      res.json(intakes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get intakes" });
    }
  });
  app2.patch("/api/intakes/:intakeId", async (req, res) => {
    try {
      const { intakeId } = req.params;
      const updates = req.body;
      const updatedIntake = await storage.updateIntake(intakeId, updates);
      if (!updatedIntake) {
        return res.status(404).json({ message: "Intake not found" });
      }
      broadcast({ type: "intake_updated", intake: updatedIntake });
      res.json(updatedIntake);
    } catch (error) {
      res.status(500).json({ message: "Failed to update intake" });
    }
  });
  app2.get("/api/system/logs", async (req, res) => {
    try {
      const { limit, type } = req.query;
      let logs;
      if (type) {
        logs = await storage.getSystemLogsByType(type);
      } else {
        logs = await storage.getSystemLogs(limit ? parseInt(limit) : 50);
      }
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get system logs" });
    }
  });
  app2.get("/api/system/config", async (req, res) => {
    try {
      const config = await storage.getSystemConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to get system config" });
    }
  });
  app2.patch("/api/system/config", async (req, res) => {
    try {
      const updates = req.body;
      const config = await storage.updateSystemConfig(updates);
      broadcast({ type: "config_updated", config });
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update system config" });
    }
  });
  app2.get("/api/system/business-hours", async (req, res) => {
    try {
      const isOpen = BusinessHoursService.isBusinessHours();
      const message = BusinessHoursService.getBusinessHoursMessage();
      const currentTime = BusinessHoursService.getCurrentPSTTime();
      const nextBusinessDay = BusinessHoursService.getNextBusinessDay();
      res.json({
        isOpen,
        message,
        currentTime,
        nextBusinessDay
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get business hours info" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

// server/index.ts
import cors from "cors";
var app = express2();
var { app: wsApp } = expressWs(app);
wsApp.use(express2.json());
wsApp.use(express2.urlencoded({ extended: false }));
wsApp.use(express2.urlencoded({ extended: false }));
var corsOptions = {
  origin: "https://pritsinghlaw.netlify.app",
  optionsSuccessStatus: 200
};
wsApp.use(cors(corsOptions));
wsApp.use((req, res, next) => {
});
wsApp.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(wsApp);
  wsApp.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (wsApp.get("env") === "development") {
    await setupVite(wsApp, server);
  } else {
  }
  const port = parseInt(process.env.PORT, 10) || 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
