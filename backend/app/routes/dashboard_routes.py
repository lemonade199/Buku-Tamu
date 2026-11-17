from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from backend.app.models.base import get_db_session
from backend.app.repositories.visitor_repository import VisitorRepository
from backend.app.repositories.pass_repository import PassRepository

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/v1/dashboard')

@dashboard_bp.route('/metrics', methods=['GET'])
@jwt_required()
def get_dashboard_metrics():
    db = get_db_session()
    try:
        visitor_repo = VisitorRepository(db)
        pass_repo = PassRepository(db)

        pass_counts = pass_repo.count_by_status()
        recent_visitors = visitor_repo.get_recent(5)

        data = {
            'total_visitors_today': visitor_repo.count_today(),
            'active_visitors': visitor_repo.count_active(),
            'completed_visitors_today': visitor_repo.count_completed_today(),
            'available_pass': pass_counts.get('AVAILABLE', 0),
            'in_use_pass': pass_counts.get('IN_USE', 0),
            'pass_stats': pass_counts,
            'recent_visitors': [v.to_dict() for v in recent_visitors]
        }

        return jsonify({
            'success': True,
            'data': data
        }), 200
    finally:
        db.close()
