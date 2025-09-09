from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId

app = Flask(__name__)
CORS(app)

# MongoDB connection
client = MongoClient("mongodb://localhost:27017/")
db = client["crime_alert_app"]
reports_collection = db["reports"]

# 🟢 Route: Add a new crime report
@app.route("/report", methods=["POST"])
def add_report():
    try:
        data = request.get_json()
        result = reports_collection.insert_one(data)
        return jsonify({"message": "Report added", "id": str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🔵 Route: Get all incident reports
@app.route("/incidents", methods=["GET"])
def get_all_reports():
    try:
        reports = list(reports_collection.find())
        for r in reports:
            r["_id"] = str(r["_id"])
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟠 Route: Get only high severity alerts
@app.route("/alerts", methods=["GET"])
def get_high_alerts():
    try:
        alerts = list(reports_collection.find({"severity": "high"}))
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
        return jsonify(alerts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🔴 Route: Delete report by ID
@app.route("/remove_report/<report_id>", methods=["DELETE"])
def remove_report(report_id):
    try:
        result = reports_collection.delete_one({"_id": ObjectId(report_id)})
        if result.deleted_count == 1:
            return jsonify({"message": "Report removed successfully"}), 200
        else:
            return jsonify({"error": "Report not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
