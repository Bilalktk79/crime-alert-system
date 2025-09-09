from flask import Blueprint, jsonify
from database.mongo import get_alerts

alerts_bp = Blueprint("alerts", __name__)

@alerts_bp.route("/", methods=["GET"])
def get_high_alerts():
    alerts = get_alerts()
    for a in alerts:
        a["_id"] = str(a["_id"])
    return jsonify(alerts)