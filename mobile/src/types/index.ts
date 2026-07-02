export type UserRole = 'client' | 'provider' | 'enterprise' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: UserRole | 'enterprise' | 'admin';
  secondary_role?: UserRole | null;
  active_role?: UserRole | 'enterprise' | 'admin';
  kyc_status: string;
  phone_number?: string;
  profile_picture?: string;
  city?: string;
  address?: string;
  country?: string;
  bio?: string;
  nina?: string;
  can_access_platform?: boolean;
  kyc_block_message?: string;
  kyc_access_status?: 'incomplete' | 'pending_review' | 'rejected' | 'approved';
  profile_complete?: boolean;
  profile_missing_fields?: string[];
  provider_profile?: { skills?: string[]; categories?: string[] } | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at?: string;
  wallet_address?: string | null;
}

export interface Mission {
  id: string;
  title: string;
  description?: string;
  status: string;
  budget: number;
  currency: string;
  pickup_address?: string;
  delivery_address?: string;
  deadline?: string;
  created_at?: string;
  category?: { id: string; name: string };
  category_name?: string;
  provider?: { id: string; first_name: string; last_name: string; profile_picture?: string; phone_number?: string };
  client?: { id: string; first_name: string; last_name: string; profile_picture?: string; phone_number?: string };
  application_count?: number;
  applications_count?: number;
  required_deposit?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  deposit_deadline?: string;
  expiry_decision_pending?: boolean;
  expiry_decision_due_at?: string;
  final_price?: number;
  progress?: number;
  expected_duration?: number;
  estimated_duration?: number;
  started_at?: string;
  completed_at?: string;
  rated?: boolean;
  is_applied?: boolean;
  can_apply?: boolean;
  distance_km?: number;
  payment_id?: string;
  payment_status?: string;
  blockchain_status?: string;
  escrow_tx_hash?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  requires_gps_tracking?: boolean;
  deposit_required?: boolean;
  requirement_labels?: string[];
  deposit_policy?: {
    deposit_reason?: string;
    merchandise_value?: number;
    required_deposit?: number;
  };
  counterparty?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone_number?: string;
    city?: string;
    bio?: string;
    reputation_score?: number;
  };
  can_view_counterparty?: boolean;
  assigned_enterprise_id?: string | null;
  assigned_enterprise_name?: string | null;
  executing_employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  } | null;
}

export interface MissionStats {
  active_missions?: number;
  pending_missions?: number;
  completed_missions?: number;
  total_spent?: number;
  total_earned?: number;
  reputation_score?: number;
  level?: string;
  deposit_balance?: number;
  deposit_locked?: number;
  total_missions?: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export type Operator = 'orange' | 'moov';

export interface PaymentMethod {
  id: string;
  type: 'mobile_money' | 'card' | 'bank_account';
  is_default: boolean;
  is_verified: boolean;
  phone_number?: string;
  operator?: string;
  display_name?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Payment {
  id: string;
  mission: string;
  amount: number;
  platform_fee: number;
  escrow_amount: number;
  provider_amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  operator?: string;
  phone_number?: string;
  escrow_tx_hash?: string;
  is_escrow_funded?: boolean;
  created_at: string;
}

export interface ProviderSummary {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  reputation_score?: number;
  completed_missions?: number;
  level?: string;
  identity_verified?: boolean;
}

export interface MissionApplication {
  id: string;
  mission: string;
  mission_title?: string;
  mission_budget?: string | number;
  mission_currency?: string;
  provider?: ProviderSummary;
  proposed_price?: number | null;
  estimated_duration?: number | null;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  responded_at?: string | null;
  created_at: string;
}

export interface MissionSolicitation {
  id: string;
  mission: string;
  mission_title: string;
  mission_budget: string | number;
  mission_currency: string;
  mission_status?: string;
  pickup_address?: string;
  deadline?: string;
  target_type?: 'provider' | 'enterprise';
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  responded_at?: string | null;
  created_at: string;
  provider?: ProviderSummary;
  client?: { id: string; first_name: string; last_name: string; profile_picture?: string };
}

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'pending_evidence'
  | 'arbitration'
  | 'resolved'
  | 'appealed'
  | 'closed';

export interface Dispute {
  id: string;
  mission_id: string;
  mission_title: string;
  mission_budget?: string | number;
  mission_currency?: string;
  plaintiff?: { id: string; first_name: string; last_name: string };
  defendant?: { id: string; first_name: string; last_name: string };
  reason: string;
  description: string;
  requested_resolution?: string;
  status: DisputeStatus;
  decision?: string;
  decision_reason?: string;
  evidence_count?: number;
  message_count?: number;
  created_at: string;
  resolved_at?: string | null;
  evidence?: DisputeEvidence[];
  messages?: DisputeMessage[];
}

export interface DisputeEvidence {
  id: string;
  evidence_type: string;
  title?: string;
  description?: string;
  file?: string;
  is_accepted?: boolean;
  submitted_by?: { id: string; first_name: string; last_name: string };
  created_at: string;
}

export interface DisputeMessage {
  id: string;
  message: string;
  is_internal?: boolean;
  sender?: { id: string; first_name: string; last_name: string };
  created_at: string;
}

export interface ReputationScore {
  id: string;
  overall_score: number;
  level: string;
  total_missions: number;
  successful_missions: number;
  failed_missions: number;
  cancelled_missions: number;
  average_rating: number;
  rating_count: number;
  dispute_count: number;
  on_time_rate: number;
  success_rate?: number;
  success_rate_score?: number;
  rating_score?: number;
  dispute_score?: number;
  volume_score?: number;
}

export interface ReputationHistoryItem {
  id: string;
  event_type: string;
  mission_title?: string | null;
  old_score: number;
  new_score: number;
  change_amount: number;
  description: string;
  created_at: string;
}
