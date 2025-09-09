import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// 🛠 Fix for default Leaflet marker
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
});
L.Marker.prototype.options.icon = DefaultIcon;

// 🔴 User Location Red Marker
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 📍 Map fly-to component for latest incident
function FlyToLatest({ incidents }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(incidents) || incidents.length === 0) return;

    const latest = [...incidents]
      .filter(
        (i) =>
          (i.severity === "high" || i.severity === "critical") &&
          typeof i.latitude === "number" &&
          typeof i.longitude === "number"
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (latest) {
      map.flyTo([latest.latitude, latest.longitude], 14, { duration: 2 });
    }
  }, [incidents, map]);

  return null;
}

// 🎨 Icon per severity level
function getColorIcon(severity) {
  const colorMap = {
    low: "green",
    medium: "orange",
    high: "red",
    critical: "black",
  };
  const color = colorMap[severity] || "blue";
  const pulse = severity === "high" || severity === "critical";

  return L.divIcon({
    className: "custom-icon",
    html: `<div style="
      background-color:${color};
      width:15px;
      height:15px;
      border-radius:50%;
      ${pulse ? "box-shadow: 0 0 10px 4px rgba(255,0,0,0.6); animation: pulse 1s infinite;" : ""}
    "></div>`,
  });
}

// ✅ FINAL MapView component
export default function MapView({ incidents = [] }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [hotspots, setHotspots] = useState([]);

  // 🛰️ Get user GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationError(null);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLocationError("Location not detected. Please allow GPS.");
        }
      );
    } else {
      setLocationError("Geolocation not supported by your browser.");
    }
  }, []);

  // 🔴 Load red zone hotspots only once
  useEffect(() => {
    fetch("http://localhost:5000/hotspots")
      .then((res) => res.json())
      .then((data) => setHotspots(data))
      .catch((err) => console.error("Hotspot fetch failed:", err));
  }, []);

  return (
    <>
      {locationError && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-2 text-sm text-center shadow-md">
          {locationError}
        </div>
      )}

      <MapContainer
        center={[33.6844, 73.0479]} // Default: Islamabad
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "500px", width: "100%", borderRadius: "1rem" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToLatest incidents={incidents} />

        {/* 🧍‍♂️ User Location */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* 🔴 Crime Hotspots (Red Zones) */}
        {hotspots.map((spot, index) => (
          <Circle
            key={index}
            center={[spot.lat, spot.lng]}
            radius={spot.count * 300}
            pathOptions={{ color: "red", fillColor: "red", fillOpacity: 0.4 }}
          />
        ))}

        {/* 📌 Incident Markers */}
        {Array.isArray(incidents) &&
          incidents.map((incident, idx) => {
            const {
              latitude,
              longitude,
              type,
              severity,
              location,
              description,
              timestamp,
              is_spam,
            } = incident;

            if (
              typeof latitude !== "number" ||
              typeof longitude !== "number" ||
              isNaN(latitude) ||
              isNaN(longitude)
            ) {
              return null;
            }

            return (
              <Marker
                key={idx}
                position={[latitude, longitude]}
                icon={getColorIcon(severity)}
              >
                <Popup>
                  <div>
                    <strong>Type:</strong> {type || "N/A"}<br />
                    <strong>Severity:</strong> {severity || "N/A"}<br />
                    <strong>Description:</strong> {description || "N/A"}<br />
                    <strong>Location:</strong> {location || "N/A"}<br />
                    <strong>Time:</strong>{" "}
                    {timestamp
                      ? new Date(timestamp).toLocaleString()
                      : "N/A"}
                    <br />
                    {is_spam && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-red-600 text-white rounded shadow">
                        🚫 Marked as Spam
                      </span>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </>
  );
}
