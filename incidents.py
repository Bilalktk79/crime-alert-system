from flask import Blueprint, jsonify
from database.mongo import get_all_incidents

incidents_bp = Blueprint("incidents", __name__)

@incidents_bp.route("/", methods=["GET"])
def get_incidents():
    incidents = get_all_incidents()
    for i in incidents:
        i["_id"] = str(i["_id"])
    return jsonify(incidents)