from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from pymongo import MongoClient
from datetime import datetime
from bson.objectid import ObjectId
import os
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
import smtplib
from email.mime.text import MIMEText
from twilio.rest import Client
from math import radians, cos, sin, asin, sqrt
from sklearn.cluster import KMeans
# ML model loading
spam_model = None
spam_vectorizer = None
incident_model = None
incident_vectorizer = None

try:
    spam_model = joblib.load("spam_detector_model.pkl")
    spam_vectorizer = joblib.load("spam_vectorizer.pkl")
    incident_model = joblib.load("incident_classifier.pkl")
    incident_vectorizer = spam_vectorizer  # assume same for now
    print("Models loaded successfully.")
except Exception as e:
    print(f"Failed to load models: {e}")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

client = MongoClient("mongodb://localhost:27017/")
db = client["crime_reports"]
incidents_collection = db["incidents"]

# === ML MODEL SETUP ===

def create_dummy_spam_model():
    data = pd.DataFrame({
        "text": ["Help me!", "There's a robbery", "Buy now!", "Free money", "Shooting", "spam message"],
        "label": [0, 0, 1, 1, 0, 1]
    })
    vectorizer = CountVectorizer()
    X = vectorizer.fit_transform(data["text"])
    y = data["label"]
    model = MultinomialNB()
    model.fit(X, y)
    joblib.dump(model, "spam_detector_model.pkl")
    joblib.dump(vectorizer, "spam_vectorizer.pkl")

def create_dummy_incident_model():
    data = pd.DataFrame({
        "text": ["shooting", "fire", "accident", "flood", "robbery", "murder"],
        "label": ["violence", "fire", "accident", "disaster", "theft", "violence"]
    })
    vectorizer = CountVectorizer()
    X = vectorizer.fit_transform(data["text"])
    y = data["label"]
    model = MultinomialNB()
    model.fit(X, y)
    joblib.dump(model, "incident_classifier.pkl")
    joblib.dump(vectorizer, "incident_vectorizer.pkl")

def load_or_train_model(path, creator):
    if not os.path.exists(path):
        creator()
    return joblib.load(path)

spam_model = load_or_train_model("spam_detector_model.pkl", create_dummy_spam_model)
spam_vectorizer = load_or_train_model("spam_vectorizer.pkl", create_dummy_spam_model)
incident_model = load_or_train_model("incident_classifier.pkl", create_dummy_incident_model)
incident_vectorizer = load_or_train_model("incident_vectorizer.pkl", create_dummy_incident_model)

# === EMAIL + SMS PLACEHOLDERS ===

EMAIL_USER = "your_email@gmail.com"
EMAIL_PASS = "your_password"

TWILIO_SID = "your_twilio_sid"
TWILIO_AUTH = "your_twilio_auth_token"
TWILIO_PHONE = "+1234567890"

def send_email_alert(to_email, subject, content):
    try:
        msg = MIMEText(content)
        msg["Subject"] = subject
        msg["From"] = EMAIL_USER
        msg["To"] = to_email
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
    except Exception as e:
        print("Email error:", e)

def send_sms_alert(to_number, message):
    try:
        client = Client(TWILIO_SID, TWILIO_AUTH)
        client.messages.create(
            body=message,
            from_=TWILIO_PHONE,
            to=to_number
        )
    except Exception as e:
        print("SMS error:", e)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    return R * 2 * asin(sqrt(a))

def send_alerts_to_nearby_users(incident):
    user_list = [
        {"email": "user1@example.com", "phone": "+1111111111", "lat": 33.7, "lng": 72.8},
    ]
    for user in user_list:
        dist = haversine(float(incident["latitude"]), float(incident["longitude"]), user["lat"], user["lng"])
        if dist <= 20 and incident["severity"] == "high":
            subject = "🚨 Emergency Nearby!"
            msg = f"A {incident['type']} was reported near your area.\nLocation: {incident['location']}\nDescription: {incident['description']}"
            send_email_alert(user["email"], subject, msg)
            send_sms_alert(user["phone"], msg)

def is_suspicious(description):
    suspicious_keywords = ["bomb", "terror", "attack", "gun", "explosive", "threat", "kill", "murder"]
    desc_lower = description.lower()
    return any(word in desc_lower for word in suspicious_keywords)

# === ROUTES ===

@app.route("/")
def index():
    return jsonify({"status": "server running"}), 200

@app.route("/check_spam", methods=["POST"])
def check_spam():
    description = request.json.get("description", "")
    if spam_model and spam_vectorizer:
        vec = spam_vectorizer.transform([description])
        return jsonify({"is_spam": bool(spam_model.predict(vec)[0])}), 200
    return jsonify({"error": "Models not loaded"}), 500

@app.route("/predict-type", methods=["POST"])
def predict_type():
    description = request.json.get("description", "")
    if incident_model and incident_vectorizer:
        vec = incident_vectorizer.transform([description])
        return jsonify({"predicted_type": incident_model.predict(vec)[0]}), 200
    return jsonify({"error": "Classifier not loaded"}), 500

@app.route("/report", methods=["POST"])
def report_incident():
    data = request.get_json()
    required = ["location", "severity", "description"]
    if not all(data.get(field) for field in required):
        return jsonify({"status": "error", "message": "Missing fields"}), 400

    desc = data["description"]
    is_spam = False
    if spam_model and spam_vectorizer:
        is_spam = bool(spam_model.predict(spam_vectorizer.transform([desc]))[0])

    predicted_type = "unknown"
    if incident_model and incident_vectorizer:
        predicted_type = incident_model.predict(incident_vectorizer.transform([desc]))[0]

    lat = float(data.get("latitude", 0))
    lon = float(data.get("longitude", 0))
    now = datetime.utcnow()

    # Auto-flag logic based on spam detection
    if is_spam:
        spam_flag = True
        flagged = True
    else:
        spam_flag = False
        flagged = False

    incident = {
        "type": predicted_type,
        "location": data["location"],
        "severity": data["severity"],
        "description": desc,
        "latitude": lat,
        "longitude": lon,
        "timestamp": now,
        "approved": False,
        "flagged": flagged,
        "spam": spam_flag
    }

    result = incidents_collection.insert_one(incident)
    incident["_id"] = str(result.inserted_id)
    incident["timestamp"] = now.isoformat()

    # Emit only if not spam
    if not spam_flag:
        socketio.emit("new_incident", incident)

    return jsonify({"status": "success", "data": incident}), 201



# ... [You can paste all remaining routes from your original code here: incidents, flagged, remove, hotspots, etc.]
@app.route("/incidents", methods=["GET"])
def get_incidents():
    try:
        query = {"approved": True, "flagged": False, "spam": False}
        incidents = [
            {**doc, "_id": str(doc["_id"]), "timestamp": doc["timestamp"].isoformat()}
            for doc in incidents_collection.find(query).sort("timestamp", -1)
        ]
        return jsonify({"status": "success", "data": incidents}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ── Admin Routes ──────────────────────────────────────────────────────────
@app.route('/admin/incidents/<incident_id>/remove', methods=['DELETE'])
def remove_incident(incident_id):
    result = incidents_collection.delete_one({"_id": ObjectId(incident_id)})
    if result.deleted_count == 1:
        return jsonify({"status": "success", "message": "Incident removed"})
    else:
        return jsonify({"status": "error", "message": "Incident not found"}), 404


@app.route("/admin/incidents", methods=["GET"])
def get_admin_incidents():
    try:
        incidents = [
            {
                **doc,
                "_id": str(doc["_id"]),
                "timestamp": doc["timestamp"].isoformat(),
                "flagged": doc.get("flagged", False),
                "approved": doc.get("approved", False),
            }
            for doc in incidents_collection.find().sort("timestamp", -1)
        ]
        return jsonify({"status": "success", "data": incidents}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ⬆️ (Unchanged: all your imports, models, spam logic, email/SMS, helper functions...)

@app.route("/admin/incidents/<incident_id>/approve", methods=["POST"])
def approve_incident(incident_id):
    try:
        result = incidents_collection.update_one(
            {"_id": ObjectId(incident_id)},
            {"$set": {"approved": True, "flagged": False}}
        )
        if result.matched_count == 0:
            return jsonify({"status": "error", "message": "Incident not found"}), 404

        doc = incidents_collection.find_one({"_id": ObjectId(incident_id)})
        doc["_id"] = str(doc["_id"])
        doc["timestamp"] = doc["timestamp"].isoformat()

        # ✅ Emit to frontend
        socketio.emit("new_incident", doc)

        # ✅ Send alerts to nearby users
        send_alerts_to_nearby_users(doc)

        return jsonify({"status": "success", "message": "Incident approved"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/admin/incidents/<incident_id>/reject", methods=["POST"])
def reject_incident_admin(incident_id):
    try:
        result = incidents_collection.delete_one({"_id": ObjectId(incident_id)})
        if result.deleted_count == 0:
            return jsonify({"status": "error", "message": "Incident not found"}), 404
        return jsonify({"status": "success", "message": "Incident rejected and deleted"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/admin/flag", methods=["POST"])
def flag_incident():
    try:
        data = request.json
        incident_id = data.get("id")
        flagged = data.get("flagged")

        if not incident_id or flagged is None:
            return jsonify({"status": "error", "message": "Missing id or flag"}), 400

        result = incidents_collection.update_one({"_id": ObjectId(incident_id)}, {"$set": {"flagged": flagged}})
        if result.matched_count == 0:
            return jsonify({"status": "error", "message": "Incident not found"}), 404

        return jsonify({"status": "success", "message": "Flag updated", "flagged": flagged}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/admin/incidents/flagged", methods=["GET"])
def get_flagged_reports():
    try:
        flagged = [
            {
                **doc,
                "_id": str(doc["_id"]),
                "timestamp": doc["timestamp"].isoformat()
            }
            for doc in incidents_collection.find({"flagged": True}).sort("timestamp", -1)
        ]
        return jsonify({"status": "success", "data": flagged}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/remove_report/<report_id>", methods=["DELETE"])
def remove_report(report_id):
    try:
        result = incidents_collection.delete_one({"_id": ObjectId(report_id)})
        if result.deleted_count == 0:
            return jsonify({"status": "error", "message": "Report not found"}), 404
        return jsonify({"status": "success", "message": "Report removed"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/hotspots", methods=["GET"])
def get_hotspots():
    incidents = list(incidents_collection.find({
        "latitude": {"$exists": True},
        "longitude": {"$exists": True},
        "approved": True,
        "flagged": False,
        "spam": False
    }))

    if not incidents:
        return jsonify([])

    coords = np.array([[float(inc["latitude"]), float(inc["longitude"])] for inc in incidents])

    k = min(5, len(coords))  # max 5 clusters or total incidents
    kmeans = KMeans(n_clusters=k, random_state=42)
    labels = kmeans.fit_predict(coords)
    centroids = kmeans.cluster_centers_

    hotspots = []
    for i in range(k):
        count = np.sum(labels == i)
        hotspots.append({
            "lat": float(centroids[i][0]),
            "lng": float(centroids[i][1]),
            "count": int(count)
        })

    return jsonify(hotspots)


if __name__ == '__main__':
    socketio.run(app, debug=True)
