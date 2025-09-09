// AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { socket } from "./socket"; // ✅ Must be './socket' if socket.js is in the same folder

const API_BASE = "http://localhost:5000";

export default function AdminDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const url = showFlaggedOnly
        ? `${API_BASE}/admin/incidents/flagged`
        : `${API_BASE}/admin/incidents`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Server error while fetching incidents");

      const json = await res.json();

      if (json.status === "success") {
        setIncidents(json.data);
        setError(null);
      } else {
        setError(json.message || "Failed to fetch incidents");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [showFlaggedOnly]);

  // ✅ UPDATED: Approve incident & emit via Socket.IO
  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/incidents/${id}/approve`, {
        method: "POST",
      });
      const json = await res.json();

      if (json.status === "success") {
        // ✅ Real-time broadcast
        socket.emit("incident_approved", json.data);
        fetchIncidents();
      } else {
        alert(json.message || "Failed to approve incident");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while approving");
    }
  };

  const toggleFlagIncident = async (id, currentFlagged) => {
    try {
      const res = await fetch(`${API_BASE}/admin/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, flagged: !currentFlagged }),
      });
      const json = await res.json();
      if (json.status === "success") {
        fetchIncidents();
      } else {
        alert(json.message || "Failed to update flag status");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const removeIncident = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/incidents/${id}/remove`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.status === "success") {
        fetchIncidents();
      } else {
        alert(json.message || "Failed to remove incident");
      }
    } catch (err) {
      alert("Network error while removing incident");
    }
  };

  const testSubmission = async () => {
    const formData = {
      type: "Test Incident",
      location: "Test Location",
      severity: "low",
      description: "This is a test incident from AdminDashboard.",
      latitude: 33.6844,
      longitude: 73.0479,
    };

    try {
      const res = await axios.post("http://localhost:5000/report", formData);
      console.log("✅ Submitted:", res.data);
      alert("✅ Incident submitted successfully");
    } catch (err) {
      console.error("❌ Submit Error:", err.response?.data || err.message);
      alert("❌ Failed to submit incident. Please try again");
    }
  };

  if (loading) return <p>Loading incidents...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Admin Dashboard - Incident Moderation</h2>

      <button
        onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
        style={{
          marginBottom: "1rem",
          backgroundColor: "#444",
          color: "white",
          padding: "8px 12px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {showFlaggedOnly ? "Show All Reports" : "Show Flagged Reports Only"}
      </button>

      <button
        onClick={testSubmission}
        style={{
          backgroundColor: "#2e8b57",
          color: "white",
          padding: "6px 10px",
          marginBottom: "1rem",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginLeft: "1rem",
        }}
      >
        Test Incident Submission
      </button>

      {incidents.length === 0 && <p>No incidents found.</p>}

      <table
        border="1"
        cellPadding="8"
        cellSpacing="0"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Type</th>
            <th>Location</th>
            <th>Severity</th>
            <th>Description</th>
            <th>Timestamp</th>
            <th>Approved</th>
            <th>Flagged</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <tr
              key={inc._id}
              style={{
                backgroundColor:
                  inc.spamLabel === "spam"
                    ? "#ffe5e5"
                    : inc.flagged
                    ? "#fdd"
                    : "transparent",
              }}
            >
              <td>{inc.type}</td>
              <td>{inc.location}</td>
              <td>{inc.severity}</td>
              <td>
                {inc.description}
                {inc.spamLabel === "spam" && (
                  <span
                    style={{
                      color: "red",
                      fontWeight: "bold",
                      marginLeft: "8px",
                    }}
                  >
                    🚩 SPAM
                  </span>
                )}
              </td>
              <td>{new Date(inc.timestamp).toLocaleString()}</td>
              <td>{inc.approved ? "Yes" : "No"}</td>
              <td>{inc.flagged ? "Yes" : "No"}</td>
              <td>
                {!inc.approved && (
                  <button
                    onClick={() => handleApprove(inc._id)}
                    style={{ marginRight: "5px", cursor: "pointer" }}
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => toggleFlagIncident(inc._id, inc.flagged)}
                  style={{ marginRight: "5px", cursor: "pointer" }}
                >
                  {inc.flagged ? "Unflag" : "Flag"}
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to remove this incident?"
                      )
                    ) {
                      removeIncident(inc._id);
                    }
                  }}
                  style={{
                    backgroundColor: "red",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
