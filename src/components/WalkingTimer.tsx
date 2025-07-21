import React, { useState, useEffect, useRef } from 'react';
import './WalkingTimer.css';
import WalkingAnimation from './WalkingAnimation';
import ProgressionRecommendation from './ProgressionRecommendation';
import WalkingMap from './WalkingMap';
import './WalkingMap.css';
import 'leaflet/dist/leaflet.css';

interface GPSCoordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

interface WalkingSession {
  date: string;
  duration: number;
  completed: boolean;
  gpsTrack?: GPSCoordinate[];
}

const WalkingTimer: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [targetTime, setTargetTime] = useState(300); // 5 minutes default
  const [sessions, setSessions] = useState<WalkingSession[]>([]);
  const [currentTrack, setCurrentTrack] = useState<GPSCoordinate[]>([]);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const currentTrackRef = useRef<GPSCoordinate[]>([]);

  useEffect(() => {
    const storedSessions = localStorage.getItem('walkingSessions');
    if (storedSessions) {
      setSessions(JSON.parse(storedSessions));
    }
  }, []);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 1;
          if (newTime >= targetTime) {
            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true;
            }
            return targetTime;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, targetTime]);

  // Separate effect to handle completion
  useEffect(() => {
    if (currentTime >= targetTime && isRunning && hasCompletedRef.current) {
      // Stop the timer immediately
      setIsRunning(false);
      setIsPaused(false);
      
      // Save session to localStorage
      const session: WalkingSession = {
        date: new Date().toISOString(),
        duration: targetTime,
        completed: true,
        gpsTrack: currentTrackRef.current.length > 0 ? currentTrackRef.current : undefined
      };
      
      setSessions(prevSessions => {
        const updatedSessions = [...prevSessions, session];
        localStorage.setItem('walkingSessions', JSON.stringify(updatedSessions));
        return updatedSessions;
      });
      
      // Reset current time
      setTimeout(() => {
        setCurrentTime(0);
      }, 0);
    }
  }, [currentTime, targetTime, isRunning]);

  // GPS tracking effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isRunning && !isPaused && gpsEnabled) {
      if ('geolocation' in navigator) {
        gpsWatchRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const coordinate: GPSCoordinate = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now()
            };
            setCurrentTrack(prev => [...prev, coordinate]);
          },
          (error) => {
            console.error('GPS tracking error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    } else {
      if (gpsWatchRef.current) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
    }

    return () => {
      if (gpsWatchRef.current) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, [isRunning, isPaused, gpsEnabled]);

  // Keep ref in sync with currentTrack state
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const requestGPSPermission = async () => {
    if ('geolocation' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          setGpsEnabled(true);
        } else if (permission.state === 'prompt') {
          navigator.geolocation.getCurrentPosition(
            () => setGpsEnabled(true),
            (error) => {
              console.error('GPS permission denied:', error);
              setGpsEnabled(false);
            }
          );
        }
      } catch (error) {
        console.error('GPS permission error:', error);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    hasCompletedRef.current = false;
    setCurrentTrack([]); // Reset GPS track for new session
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    hasCompletedRef.current = false;
    
    // Save incomplete session if any time was walked
    if (currentTime > 0) {
      const session: WalkingSession = {
        date: new Date().toISOString(),
        duration: currentTime,
        completed: false,
        gpsTrack: currentTrackRef.current.length > 0 ? currentTrackRef.current : undefined
      };
      
      const updatedSessions = [...sessions, session];
      setSessions(updatedSessions);
      localStorage.setItem('walkingSessions', JSON.stringify(updatedSessions));
    }
    
    setCurrentTime(0);
    setCurrentTrack([]); // Reset GPS track
  };


  const handleAcceptRecommendation = (duration: number) => {
    setTargetTime(duration);
  };

  const progress = (currentTime / targetTime) * 100;

  return (
    <div className="walking-timer">
      <ProgressionRecommendation 
        sessions={sessions}
        onAcceptRecommendation={handleAcceptRecommendation}
      />
      
      <WalkingAnimation isActive={isRunning && !isPaused} />
      
      <div className="gps-controls">
        <button 
          className={`btn btn-gps ${gpsEnabled ? 'active' : ''}`}
          onClick={requestGPSPermission}
          disabled={isRunning}
        >
          📍 {gpsEnabled ? 'GPS Enabled' : 'Enable GPS Tracking'}
        </button>
        {gpsEnabled && currentTrack.length > 0 && (
          <span className="gps-status">
            📊 {currentTrack.length} GPS points recorded
          </span>
        )}
      </div>
      
      <div className="timer-display">
        <div className="progress-circle">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="8"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#4CAF50"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="timer-text">
            <div className="current-time">{formatTime(currentTime)}</div>
            <div className="target-time">/ {formatTime(targetTime)}</div>
          </div>
        </div>
      </div>

      <div className="timer-controls">
        {!isRunning ? (
          <button className="btn btn-start" onClick={handleStart}>
            Start Walking
          </button>
        ) : (
          <div className="control-group">
            {isPaused ? (
              <button className="btn btn-resume" onClick={handleResume}>
                Resume
              </button>
            ) : (
              <button className="btn btn-pause" onClick={handlePause}>
                Pause
              </button>
            )}
            <button className="btn btn-stop" onClick={handleStop}>
              Stop
            </button>
          </div>
        )}
      </div>

      <div className="target-selector">
        <label htmlFor="target-time">Target Duration:</label>
        <select
          id="target-time"
          value={targetTime}
          onChange={(e) => setTargetTime(Number(e.target.value))}
          disabled={isRunning}
        >
          <option value={180}>3 minutes</option>
          <option value={300}>5 minutes</option>
          <option value={600}>10 minutes</option>
          <option value={900}>15 minutes</option>
          <option value={1200}>20 minutes</option>
          <option value={1800}>30 minutes</option>
        </select>
      </div>

      <WalkingMap 
        sessions={sessions}
        currentTrack={currentTrack}
        isTracking={isRunning && !isPaused && gpsEnabled}
      />
    </div>
  );
};

export default WalkingTimer;