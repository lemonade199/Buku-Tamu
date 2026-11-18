export interface User {
  id_user: number;
  fullname: string;
  username: string;
  email: string;
  role_code: 'ADMIN' | 'PETUGAS';
  role_name: string;
  telephone?: string;
  permissions: string[];
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface PassItem {
  id_pass: number;
  no_pass: string;
  status: 'AVAILABLE' | 'PENDING' | 'IN_USE' | 'MAINTENANCE' | 'LOST' | 'INACTIVE';
  slot?: string;
  handled_over_id?: number;
  handled_over_at?: string;
  achieve_id?: number;
  achieve_at?: string;
  current_holder?: {
    id_visitor: number;
    fullname: string;
    institution?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    check_in_at?: string;
  } | null;
}

export interface VisitorItem {
  id_visitor: number;
  id_pass: number;
  no_pass?: string;
  fullname: string;
  telephone?: string;
  institution?: string;
  representing?: string;
  purpose?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  check_in_at: string;
  check_out_at?: string;
  capture_id: string;
  is_active: boolean;
}

export interface HourlyStat {
  hour: string;
  count: number;
}

export interface WeeklyTrend {
  date: string;
  day: string;
  count: number;
}

export interface DashboardMetrics {
  total_visitors_today: number;
  total_visitors_all_time?: number;
  active_visitors: number;
  pending_registrations_count: number;
  completed_visitors_today: number;
  total_pass?: number;
  available_pass: number;
  pending_pass: number;
  in_use_pass: number;
  pass_stats: {
    AVAILABLE: number;
    PENDING?: number;
    IN_USE: number;
    MAINTENANCE: number;
    LOST: number;
  };
  pending_visitors?: VisitorItem[];
  recent_visitors: VisitorItem[];
  hourly_stats?: HourlyStat[];
  weekly_trend?: WeeklyTrend[];
}
