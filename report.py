from flask import Blueprint, request, jsonify
from database.mongo import insert_report

report_bp = Blueprint("report", __name__)

@report_bp.route("/", methods=["POST"])
def report():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON data"}), 400

    report_id = insert_report(data)
    return jsonify({"message": "Report submitted", "id": report_id}), 201