import React from 'react';
import { ProgressionAlgorithm } from '../utils/progressionAlgorithm';
import './ProgressionRecommendation.css';

interface WalkingSession {
  date: string;
  duration: number;
  completed: boolean;
}

interface ProgressionRecommendationProps {
  sessions: WalkingSession[];
  onAcceptRecommendation: (duration: number) => void;
}

const ProgressionRecommendation: React.FC<ProgressionRecommendationProps> = ({
  sessions,
  onAcceptRecommendation
}) => {
  const recommendation = ProgressionAlgorithm.getRecommendation(sessions);
  const stats = ProgressionAlgorithm.getProgressStats(sessions);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  };

  const formatTotalTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="progression-recommendation">
      <div className="recommendation-card">
        <h3>Today's Recommendation</h3>
        <div className="recommendation-content">
          <div className="recommended-duration">
            <span className="duration-number">{formatTime(recommendation.recommendedDuration)}</span>
            <span className={`confidence-indicator ${recommendation.confidenceLevel}`}>
              {recommendation.confidenceLevel} confidence
            </span>
          </div>
          <p className="recommendation-reason">{recommendation.reason}</p>
          <button 
            className="accept-btn"
            onClick={() => onAcceptRecommendation(recommendation.recommendedDuration)}
          >
            Use This Duration
          </button>
        </div>
      </div>

      <div className="progress-stats">
        <h4>Your Progress</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{stats.totalSessions}</span>
            <span className="stat-label">Total Sessions</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.completedSessions}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{formatTotalTime(stats.totalWalkingTime)}</span>
            <span className="stat-label">Total Time</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.currentStreak}</span>
            <span className="stat-label">Day Streak</span>
          </div>
        </div>
        
        {stats.averageDuration > 0 && (
          <div className="average-duration">
            <span>Average session: {formatTime(stats.averageDuration)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressionRecommendation;