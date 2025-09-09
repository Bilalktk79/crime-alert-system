import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from "react-router-dom"; // ✅ ek hi jagah se sab
import { socket } from "./socket";
import AdminDashboard from "./AdminDashboard";
import "./index.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MapView from "./MapView";


function App() {
  const [theme, setTheme] = useState("light");

  // Theme toggle logic
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.body.className = newTheme;
  };

  // Alert from socket
  useEffect(() => {
    socket.on("alert_sent", (data) => {
      toast.info(`📢 ${data.message}`, {
        autoClose: 5000,
        position: "top-right",
      });
    });

    return () => {
      socket.off("alert_sent");
    };
  }, []);

  return (
    <Router>
      <div className={`app-container ${theme}`}>
        <nav className="navbar">
          <h1>🚨 Neighborhood Crime & Emergency Map</h1>
          <div>
            <Link to="/">Home</Link> | <Link to="/admin">Admin</Link>
          </div>
          <button onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
        </nav>

        <Routes>
          <Route path="/" element={<HomeApp />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>

        <ToastContainer />
      </div>
    </Router>
  );
}

// ✅ Spam Checker Function
const checkSpam = async (description) => {
  try {
    const res = await fetch(`${API_BASE}/check_spam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    const data = await res.json();
    return data.is_spam;
  } catch (err) {
    console.error("Spam check failed:", err);
    return false;
  }
};

// ✅ Incident Type Predictor
const predictType = async (description) => {
  try {
    const res = await fetch(`${API_BASE}/predict_type`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    const data = await res.json();
    return data.predicted_type || "unknown";
  } catch (err) {
    console.error("Type prediction failed:", err);
    return "unknown";
  }
};

function HomeApp() {
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
  const [filter, setFilter] = useState({ severity: "", location: "" });
  const [alertIncident, setAlertIncident] = useState(null);

  // ✅ Auto-detect location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setFormData((prev) => ({ ...prev, latitude, longitude }));
        },
        (err) => {
          console.error("Location not detected. Please allow GPS.", err);
        }
      );
    }
  }, []);

  // ✅ Socket + fetch incidents
  useEffect(() => {
  socket.on("alert_sent", (data) => {
  toast.info(`📢 ${data.message}`, { autoClose: 5000 });
});


    fetchIncidents();
    const socket = io(API_BASE);

    socket.on("new_incident", (incident) => {
      setIncidents((prev) => [incident, ...prev]);
      if (incident.severity === "high" || incident.severity === "critical") {
        setAlertIncident(incident);
        setTimeout(() => setAlertIncident(null), 10000);
      }
    });

    return () => socket.disconnect();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      const data = await res.json();
      if (data.status === "success") {
        setIncidents(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch incidents", err);
    }
  };

  // ✅ Form Submit Logic (axios used)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.latitude || !formData.longitude) {
      toast.error("📍 Location not detected. Please allow GPS.");
      return;
    }

    const isSpam = await checkSpam(formData.description);
    if (isSpam) {
      toast.warning("⚠️ Spam detected! This report will not appear on the map.");
      return;
    }

    const predictedType = await predictType(formData.description);
    const finalData = { ...formData, type: predictedType };

    try {
      const res = await axios.post(`${API_BASE}/report`, finalData);
      console.log("✅ Submitted:", res.data);
      toast.success("✅ Report submitted successfully and will appear on the map.");

      setFormData({
        type: "",
        location: "",
        severity: "low",
        description: "",
        latitude: finalData.latitude,
        longitude: finalData.longitude,
      });

      if (finalData.severity === "high" || finalData.severity === "critical") {
        setTimeout(() => {
          navigate("/", {
            state: {
              flyTo: {
                lat: finalData.latitude,
                lng: finalData.longitude,
              },
            },
          });
        }, 500);
      }

      fetchIncidents();
    } catch (err) {
      console.error("❌ Submit Error:", err.response?.data || err.message);
      toast.error("❌ Failed to submit incident. Please try again");
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    const severityMatch = !filter.severity || i.severity === filter.severity;
    const locationMatch = !filter.location || i.location.toLowerCase().includes(filter.location.toLowerCase());
    return severityMatch && locationMatch;
  });

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      {alertIncident && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
          ⚠️ {alertIncident.type.toUpperCase()} reported at {alertIncident.location}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-right">
          <Link to="/admin" className="text-blue-700 font-semibold underline">
            Go to Admin Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-center">Neighborhood Crime & Emergency Map</h1>

        {/* ✅ Incident Report Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
          <select
            name="severity"
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            className="w-full border p-2"
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <input
            type="text"
            name="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="Incident Type (will auto-predict)"
            className="w-full border p-2"
            readOnly
          />

          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Location Name"
            className="w-full border p-2"
            required
          />

          <textarea
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description"
            className="w-full border p-2"
            required
          />

          <input
            type="text"
            value={formData.latitude || ""}
            readOnly
            className="border rounded px-2 py-1 w-full mb-2 bg-gray-100"
            placeholder="Latitude"
          />
          <input
            type="text"
            value={formData.longitude || ""}
            readOnly
            className="border rounded px-2 py-1 w-full mb-2 bg-gray-100"
            placeholder="Longitude"
          />

          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Submit Incident
          </button>
        </form>

        {/* ✅ Toast Container */}
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
        />

        {/* ✅ Filters */}
        <div className="flex space-x-4">
          <select
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            className="border p-2"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <input
            type="text"
            value={filter.location}
            onChange={(e) => setFilter({ ...filter, location: e.target.value })}
            placeholder="Filter by Location"
            className="border p-2 flex-1"
          />
        </div>

        {/* ✅ Incident Cards with Spam Label */}
        {filteredIncidents.map((incident) => (
          <div key={incident._id} className="border rounded p-4 mb-2 shadow bg-white">
            {incident.is_spam && (
              <div className="bg-red-100 text-red-700 px-2 py-1 rounded mb-2 text-sm font-semibold inline-block">
                ⚠️ Spam Report
              </div>
            )}
            <p><strong>Type:</strong> {incident.type}</p>
            <p><strong>Severity:</strong> {incident.severity}</p>
            <p><strong>Location:</strong> {incident.location}</p>
            <p><strong>Description:</strong> {incident.description}</p>
          </div>
        ))}

        <MapView incidents={filteredIncidents} />
      </div>
    </div>
  );
}

export default App;