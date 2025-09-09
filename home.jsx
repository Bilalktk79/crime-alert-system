import React, { useState, useEffect } from "react";
import MapView from "./MapView";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom"; // You used navigate but didn't import this

const API_BASE = "http://localhost:5000";

function Home() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: "",
    location: "",
    severity: "low",
    description: "",
    latitude: "",
    longitude: "",
  });

  const [incidents, setIncidents] = useState([]);
  const [filters, setFilters] = useState({ severity: "", location: "" });

  // Updated fetchIncidents with try/catch and comment
  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      const json = await res.json();
      if (json.status === "success") {
        setIncidents(json.data); // This will only include approved & non-flagged incidents
      }
    } catch (err) {
      console.error("Error fetching incidents:", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const socket = io(API_BASE);
    socket.on("new_incident", () => {
      fetchIncidents();
    });
    return () => socket.disconnect();
  }, []);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const json = await res.json();
    if (json.status === "success") {
      setFormData({
        type: "",
        location: "",
        severity: "low",
        description: "",
        latitude: "",
        longitude: "",
      });
      fetchIncidents();
    } else {
      alert(json.message);
    }
  };

  const filtered = incidents.filter((inc) => {
    return (
      (filters.severity ? inc.severity === filters.severity : true) &&
      (filters.location
        ? inc.location.toLowerCase().includes(filters.location.toLowerCase())
        : true)
    );
  });

  return (
    <div>
      <h2>Neighborhood Crime Reporter</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
        />
        <input
          placeholder="Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
        <select
          value={formData.severity}
          onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
        >
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <input
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <button type="submit">Report</button>
      </form>

      <h3>Incidents</h3>
      <input
        placeholder="Filter by Location"
        value={filters.location}
        onChange={(e) => setFilters({ ...filters, location: e.target.value })}
      />
      <select
        value={filters.severity}
        onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
      >
        <option value="">All Severities</option>
        <option value="low">Low</option>
        <option value="moderate">Moderate</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      <MapView incidents={filtered} />
    </div>
  );
}

export default Home;
