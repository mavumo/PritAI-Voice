import { 
  type Call, type InsertCall,
  type Intake, type InsertIntake,
  type SystemLog, type InsertSystemLog,
  type SystemConfig, type InsertSystemConfig,
  type User, type InsertUser 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Call methods
  getCall(id: string): Promise<Call | undefined>;
  getCallByCallSid(callSid: string): Promise<Call | undefined>;
  getActiveCalls(): Promise<Call[]>;
  getAllCalls(): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined>;

  // Intake methods
  getIntake(id: string): Promise<Intake | undefined>;
  getIntakesByStatus(status: string): Promise<Intake[]>;
  getAllIntakes(): Promise<Intake[]>;
  getRecentIntakes(limit?: number): Promise<Intake[]>;
  createIntake(intake: InsertIntake): Promise<Intake>;
  updateIntake(id: string, updates: Partial<Intake>): Promise<Intake | undefined>;

  // System log methods
  getSystemLogs(limit?: number): Promise<SystemLog[]>;
  getSystemLogsByType(type: string): Promise<SystemLog[]>;
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;

  // System config methods
  getSystemConfig(): Promise<SystemConfig | undefined>;
  updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig>;

  // Dashboard stats
  getTodayStats(): Promise<{
    callsToday: number;
    activeCalls: number;
    newIntakes: number;
    avgResponseTime: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private calls: Map<string, Call>;
  private intakes: Map<string, Intake>;
  private systemLogs: Map<string, SystemLog>;
  private systemConfig: SystemConfig;

  constructor() {
    this.users = new Map();
    this.calls = new Map();
    this.intakes = new Map();
    this.systemLogs = new Map();
    
    // Initialize default system config
    this.systemConfig = {
      id: randomUUID(),
      businessHoursEnabled: true,
      responseMode: "friendly",
      twilioWebhookUrl: null,
      openaiApiStatus: "connected",
      lastUpdated: new Date(),
    };
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Call methods
  async getCall(id: string): Promise<Call | undefined> {
    return this.calls.get(id);
  }

  async getCallByCallSid(callSid: string): Promise<Call | undefined> {
    return Array.from(this.calls.values()).find(call => call.callSid === callSid);
  }

  async getActiveCalls(): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(call => call.status === 'active');
  }

  async getAllCalls(): Promise<Call[]> {
    return Array.from(this.calls.values()).sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const id = randomUUID();
    const call: Call = {
      ...insertCall,
      id,
      startTime: new Date(),
      endTime: null,
      duration: null,
      summary: insertCall.summary || null,
      callSid: insertCall.callSid || null,
      sessionId: insertCall.sessionId || null,
      matterType: insertCall.matterType || null,
      audioUrl: insertCall.audioUrl || null,
    };
    this.calls.set(id, call);
    return call;
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    const call = this.calls.get(id);
    if (!call) return undefined;
    
    const updatedCall = { ...call, ...updates };
    this.calls.set(id, updatedCall);
    return updatedCall;
  }

  // Intake methods
  async getIntake(id: string): Promise<Intake | undefined> {
    return this.intakes.get(id);
  }

  async getIntakesByStatus(status: string): Promise<Intake[]> {
    return Array.from(this.intakes.values()).filter(intake => intake.status === status);
  }

  async getAllIntakes(): Promise<Intake[]> {
    return Array.from(this.intakes.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecentIntakes(limit: number = 10): Promise<Intake[]> {
    const allIntakes = await this.getAllIntakes();
    return allIntakes.slice(0, limit);
  }

  async createIntake(insertIntake: InsertIntake): Promise<Intake> {
    const id = randomUUID();
    const intake: Intake = {
      ...insertIntake,
      id,
      createdAt: new Date(),
      reviewedAt: null,
      status: insertIntake.status || 'pending',
      email: insertIntake.email || null,
      callId: insertIntake.callId || null,
      urgency: insertIntake.urgency || null,
      additionalInfo: insertIntake.additionalInfo || null,
    };
    this.intakes.set(id, intake);
    return intake;
  }

  async updateIntake(id: string, updates: Partial<Intake>): Promise<Intake | undefined> {
    const intake = this.intakes.get(id);
    if (!intake) return undefined;
    
    const updatedIntake = { ...intake, ...updates };
    this.intakes.set(id, updatedIntake);
    return updatedIntake;
  }

  // System log methods
  async getSystemLogs(limit: number = 50): Promise<SystemLog[]> {
    const logs = Array.from(this.systemLogs.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return logs.slice(0, limit);
  }

  async getSystemLogsByType(type: string): Promise<SystemLog[]> {
    return Array.from(this.systemLogs.values()).filter(log => log.type === type);
  }

  async createSystemLog(insertLog: InsertSystemLog): Promise<SystemLog> {
    const id = randomUUID();
    const log: SystemLog = {
      ...insertLog,
      id,
      timestamp: new Date(),
      details: insertLog.details || null,
      level: insertLog.level || 'info',
      relatedId: insertLog.relatedId || null,
    };
    this.systemLogs.set(id, log);
    return log;
  }

  // System config methods
  async getSystemConfig(): Promise<SystemConfig | undefined> {
    return this.systemConfig;
  }

  async updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
    this.systemConfig = {
      ...this.systemConfig,
      ...updates,
      lastUpdated: new Date(),
    };
    return this.systemConfig;
  }

  // Dashboard stats
  async getTodayStats(): Promise<{
    callsToday: number;
    activeCalls: number;
    newIntakes: number;
    avgResponseTime: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allCalls = Array.from(this.calls.values());
    const callsToday = allCalls.filter(call => 
      new Date(call.startTime).getTime() >= today.getTime()
    ).length;
    
    const activeCalls = allCalls.filter(call => call.status === 'active').length;
    
    const allIntakes = Array.from(this.intakes.values());
    const newIntakes = allIntakes.filter(intake => 
      new Date(intake.createdAt).getTime() >= today.getTime()
    ).length;
    
    // Calculate average response time (mock value for now)
    const avgResponseTime = 1.2;
    
    return {
      callsToday,
      activeCalls,
      newIntakes,
      avgResponseTime,
    };
  }
}

export const storage = new MemStorage();
