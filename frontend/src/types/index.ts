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
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'LOST' | 'INACTIVE';
  slot?: string;
  handled_over_id?: number;
  handled_over_at?: string;
  achieve_id?: number;
  achieve_at?: string;
}

export interface VisitorItem {
  id_visitor: number;
  id_pass: number;
  no_pass?: string;
  fullname: string;
  telephone: string;
  institution?: string;
  representing?: string;
  purpose?: string;
  check_in_at: string;
  check_out_at?: string;
  capture_id: string;
  is_active: boolean;
}

export interface DashboardMetrics {
  total_visitors_today: number;
  active_visitors: number;
  completed_visitors_today: number;
  available_pass: number;
  in_use_pass: number;
  pass_stats: {
    AVAILABLE: number;
    IN_USE: number;
    MAINTENANCE: number;
    LOST: number;
  };
  recent_visitors: VisitorItem[];
}
