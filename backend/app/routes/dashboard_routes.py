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
        recent_visitors = visitor_repo.get_recent(8)
        pending_visitors = visitor_repo.get_pending()
        total_pass_count = pass_repo.count_total()
        active_pass_count = pass_repo.count_active()

        data = {
            'total_visitors_today': visitor_repo.count_today(),
            'total_visitors_all_time': visitor_repo.count_total(),
            'visitors_this_month': visitor_repo.count_this_month(),
            'active_visitors': visitor_repo.count_active(),
            'pending_registrations_count': visitor_repo.count_pending(),
            'completed_visitors_today': visitor_repo.count_completed_today(),
            'total_pass': total_pass_count,
            'active_pass_count': active_pass_count,
            'available_pass': pass_counts.get('AVAILABLE', 0),
            'pending_pass': pass_counts.get('PENDING', 0),
            'in_use_pass': pass_counts.get('IN_USE', 0),
            'inactive_pass': pass_counts.get('INACTIVE', 0),
            'lost_pass': pass_counts.get('LOST', 0),
            'maintenance_pass': pass_counts.get('MAINTENANCE', 0),
            'pass_stats': pass_counts,
            'pending_visitors': [v.to_dict() for v in pending_visitors],
            'recent_visitors': [v.to_dict() for v in recent_visitors],
            'hourly_stats': visitor_repo.get_hourly_stats_today(),
            'weekly_trend': visitor_repo.get_weekly_trend(),
            'monthly_stats': visitor_repo.get_monthly_stats(),
            'top_institutions': visitor_repo.get_top_institutions(),
            'recent_activities': visitor_repo.get_recent_activities(),
        }

        return jsonify({
            'success': True,
            'data': data
        }), 200
    finally:
        db.close()
