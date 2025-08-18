export class BusinessHoursService {
  private static readonly BUSINESS_HOURS = {
    start: 8, // 8 AM
    end: 18,  // 6 PM
    timezone: 'America/Los_Angeles', // PST/PDT
    workDays: [1, 2, 3, 4, 5] // Monday to Friday
  };

  static isBusinessHours(): boolean {
    const now = new Date();
    const pstTime = new Date(now.toLocaleString('en-US', { 
      timeZone: this.BUSINESS_HOURS.timezone 
    }));
    
    const currentDay = pstTime.getDay();
    const currentHour = pstTime.getHours();
    
    // Check if it's a business day
    if (!this.BUSINESS_HOURS.workDays.includes(currentDay)) {
      return false;
    }
    
    // Check if it's within business hours
    return currentHour >= this.BUSINESS_HOURS.start && currentHour < this.BUSINESS_HOURS.end;
  }

  static getBusinessHoursMessage(): string {
    if (this.isBusinessHours()) {
      return "We're currently open during business hours.";
    }
    
    return "We're currently closed. Our business hours are Monday through Friday, 8 AM to 6 PM Pacific Time. Please leave a message and we'll call you back during business hours.";
  }

  static getNextBusinessDay(): Date {
    const now = new Date();
    const pstTime = new Date(now.toLocaleString('en-US', { 
      timeZone: this.BUSINESS_HOURS.timezone 
    }));
    
    let nextBusinessDay = new Date(pstTime);
    
    // If it's after hours on a business day, go to next business day
    if (this.BUSINESS_HOURS.workDays.includes(pstTime.getDay()) && 
        pstTime.getHours() >= this.BUSINESS_HOURS.end) {
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }
    
    // Find next business day
    while (!this.BUSINESS_HOURS.workDays.includes(nextBusinessDay.getDay())) {
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }
    
    // Set to business hour start time
    nextBusinessDay.setHours(this.BUSINESS_HOURS.start, 0, 0, 0);
    
    return nextBusinessDay;
  }

  static getCurrentPSTTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      timeZone: this.BUSINESS_HOURS.timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' PST';
  }
}
