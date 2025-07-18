interface WalkingSession {
  date: string;
  duration: number;
  completed: boolean;
}

interface ProgressionRecommendation {
  recommendedDuration: number;
  reason: string;
  confidenceLevel: 'low' | 'medium' | 'high';
}

export class ProgressionAlgorithm {
  private static readonly MIN_DURATION = 180; // 3 minutes
  private static readonly MAX_DURATION = 1800; // 30 minutes
  private static readonly PROGRESSION_RATE = 0.1; // 10% increase
  private static readonly MIN_SESSIONS_FOR_PROGRESSION = 3;
  private static readonly COMPLETION_THRESHOLD = 0.8; // 80% completion rate

  static getRecommendation(sessions: WalkingSession[]): ProgressionRecommendation {
    if (sessions.length === 0) {
      return {
        recommendedDuration: this.MIN_DURATION,
        reason: "Starting with a gentle 3-minute walk",
        confidenceLevel: 'high'
      };
    }

    const recentSessions = this.getRecentSessions(sessions, 7); // Last 7 days
    const lastSession = sessions[sessions.length - 1];
    
    if (recentSessions.length < this.MIN_SESSIONS_FOR_PROGRESSION) {
      return {
        recommendedDuration: lastSession.duration,
        reason: "Continue with current duration to build consistency",
        confidenceLevel: 'medium'
      };
    }

    const completionRate = this.calculateCompletionRate(recentSessions);
    const consistency = this.calculateConsistency(recentSessions);
    const currentDuration = this.getMostCommonDuration(recentSessions);

    if (completionRate >= this.COMPLETION_THRESHOLD && consistency >= 0.7) {
      const newDuration = Math.min(
        Math.round(currentDuration * (1 + this.PROGRESSION_RATE)),
        this.MAX_DURATION
      );
      
      if (newDuration > currentDuration) {
        return {
          recommendedDuration: newDuration,
          reason: `Great progress! Ready for ${this.formatDuration(newDuration)}`,
          confidenceLevel: 'high'
        };
      }
    }

    if (completionRate < 0.5) {
      const newDuration = Math.max(
        Math.round(currentDuration * 0.9),
        this.MIN_DURATION
      );
      
      return {
        recommendedDuration: newDuration,
        reason: "Let's try a shorter duration to build confidence",
        confidenceLevel: 'medium'
      };
    }

    return {
      recommendedDuration: currentDuration,
      reason: "Keep building consistency at this level",
      confidenceLevel: 'medium'
    };
  }

  private static getRecentSessions(sessions: WalkingSession[], days: number): WalkingSession[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return sessions.filter(session => new Date(session.date) >= cutoffDate);
  }

  private static calculateCompletionRate(sessions: WalkingSession[]): number {
    if (sessions.length === 0) return 0;
    const completed = sessions.filter(s => s.completed).length;
    return completed / sessions.length;
  }

  private static calculateConsistency(sessions: WalkingSession[]): number {
    if (sessions.length === 0) return 0;
    
    // Calculate how many of the last 7 days had walking sessions
    const dates = sessions.map(s => new Date(s.date).toDateString());
    const uniqueDates = new Set(dates);
    
    return uniqueDates.size / 7; // Consistency over 7 days
  }

  private static getMostCommonDuration(sessions: WalkingSession[]): number {
    if (sessions.length === 0) return this.MIN_DURATION;
    
    const durations = sessions.map(s => s.duration);
    const frequency: { [key: number]: number } = {};
    
    durations.forEach(duration => {
      frequency[duration] = (frequency[duration] || 0) + 1;
    });
    
    return Number(Object.keys(frequency).reduce((a, b) => 
      frequency[Number(a)] > frequency[Number(b)] ? a : b
    ));
  }

  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  static getProgressStats(sessions: WalkingSession[]): {
    totalSessions: number;
    completedSessions: number;
    totalWalkingTime: number;
    currentStreak: number;
    averageDuration: number;
  } {
    const completed = sessions.filter(s => s.completed);
    const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    const completedTime = completed.reduce((sum, s) => sum + s.duration, 0);
    
    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      totalWalkingTime: totalTime,
      currentStreak: this.calculateCurrentStreak(sessions),
      averageDuration: completed.length > 0 ? Math.round(completedTime / completed.length) : 0
    };
  }

  private static calculateCurrentStreak(sessions: WalkingSession[]): number {
    if (sessions.length === 0) return 0;
    
    const sortedSessions = sessions
      .filter(s => s.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff === streak + 1) {
        // Allow for missing yesterday if we're checking today
        streak++;
      } else {
        break;
      }
      
      currentDate = sessionDate;
    }
    
    return streak;
  }
}