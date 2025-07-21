import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

interface WalkingMapProps {
  sessions: WalkingSession[];
  currentTrack: GPSCoordinate[];
  isTracking: boolean;
}

// Hook to get user's current position
const useCurrentPosition = () => {
  const [position, setPosition] = React.useState<[number, number] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('Got current position:', pos.coords.latitude, pos.coords.longitude);
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setError(null);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError(error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setError('Geolocation not supported');
    }
  }, []);

  return { position, error };
};

// Component to update map center when position changes
const MapCenterController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);
  
  return null;
};

const WalkingMap: React.FC<WalkingMapProps> = ({ sessions, currentTrack, isTracking }) => {
  const { position: currentPosition, error: locationError } = useCurrentPosition();
  
  // Find all GPS tracks
  const allTracks = sessions.filter(session => session.gpsTrack && session.gpsTrack.length > 0);
  
  // Calculate map center and zoom
  const allCoordinates: GPSCoordinate[] = [
    ...currentTrack,
    ...allTracks.flatMap(session => session.gpsTrack || [])
  ];

  // Calculate center - priority: current tracking -> GPS history -> current location -> default
  let center: [number, number] = [37.7749, -122.4194]; // Default to San Francisco
  
  if (currentTrack.length > 0) {
    // If currently tracking, center on the most recent position
    const latest = currentTrack[currentTrack.length - 1];
    center = [latest.lat, latest.lng];
  } else if (allCoordinates.length > 0) {
    // If we have historical GPS data, center on that
    const latitudes = allCoordinates.map(coord => coord.lat);
    const longitudes = allCoordinates.map(coord => coord.lng);
    center = [
      (Math.max(...latitudes) + Math.min(...latitudes)) / 2,
      (Math.max(...longitudes) + Math.min(...longitudes)) / 2
    ];
  } else if (currentPosition) {
    // Otherwise use current position if available
    center = currentPosition;
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="walking-map">
      {allCoordinates.length === 0 && !currentPosition && (
        <div className="map-overlay">
          <p>📍 Enable GPS tracking to see your walking routes on the map!</p>
          {locationError && <p style={{fontSize: '12px', color: 'red'}}>Location error: {locationError}</p>}
          {!locationError && !currentPosition && <p style={{fontSize: '12px', color: 'blue'}}>Detecting your location...</p>}
        </div>
      )}
      <MapContainer center={center} zoom={13} style={{ height: '400px', width: '100%' }}>
        <MapCenterController center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render completed walking sessions */}
        {allTracks.map((session, index) => {
          const track = session.gpsTrack!;
          const polylinePoints: [number, number][] = track.map(coord => [coord.lat, coord.lng]);
          
          return (
            <React.Fragment key={index}>
              <Polyline
                positions={polylinePoints}
                color={session.completed ? "#4CAF50" : "#FF9800"}
                weight={3}
                opacity={0.7}
              />
              {track.length > 0 && (
                <>
                  {/* Start marker */}
                  <Marker position={[track[0].lat, track[0].lng]}>
                    <Popup>
                      <div>
                        <strong>Start</strong><br />
                        {formatDate(session.date)}<br />
                        Duration: {formatDuration(session.duration)}<br />
                        Status: {session.completed ? 'Completed' : 'Incomplete'}
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* End marker (if different from start) */}
                  {track.length > 1 && (
                    <Marker position={[track[track.length - 1].lat, track[track.length - 1].lng]}>
                      <Popup>
                        <div>
                          <strong>End</strong><br />
                          {formatDate(session.date)}<br />
                          Duration: {formatDuration(session.duration)}<br />
                          Status: {session.completed ? 'Completed' : 'Incomplete'}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}
        
        {/* Render current active track */}
        {isTracking && currentTrack.length > 0 && (
          <>
            <Polyline
              positions={currentTrack.map(coord => [coord.lat, coord.lng])}
              color="#2196F3"
              weight={4}
              opacity={0.8}
            />
            
            {/* Current position marker */}
            {currentTrack.length > 0 && (
              <Marker position={[
                currentTrack[currentTrack.length - 1].lat, 
                currentTrack[currentTrack.length - 1].lng
              ]}>
                <Popup>
                  <div>
                    <strong>Current Position</strong><br />
                    Live tracking active
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default WalkingMap;