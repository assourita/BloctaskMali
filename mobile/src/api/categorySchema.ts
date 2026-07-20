import { apiRequest } from './client';

export interface FieldDefinition {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'date' | 'time' | 'datetime' | 'file' | 'gps' | 'textarea';
  label: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    mime_types?: string[];
    max_files?: number;
  };
  default?: any;
  placeholder?: string;
  help_text?: string;
}

export interface FieldBlock {
  id: string;
  label: string;
  description: string;
  fields: FieldDefinition[];
  enabled_by_default: boolean;
}

export interface CategoryRule {
  slug: string;
  label: string;
  mission_type: string;
  requires_deposit: boolean;
  deposit_mode: string;
  deposit_percent: number;
  deposit_fixed: number;
  deposit_floor: number;
  deposit_cap: number | null;
  requires_merchandise_value: boolean;
  requires_vehicle: boolean;
  requires_photo: boolean;
  requires_signature: boolean;
  requires_id_verification: boolean;
  requires_gps_tracking: boolean;
  requires_qr_validation: boolean;
  enterprise_only: boolean;
  min_reputation_score: number;
  requires_pickup: boolean;
  requires_delivery: boolean;
  show_contacts: boolean;
  location_label: string;
  date_label: string;
  show_time_range: boolean;
  deposit_reason: string;
  requirement_labels: string[];
  enabled_blocks: string[];
  custom_fields: FieldDefinition[];
  field_overrides: Record<string, FieldDefinition>;
}

export interface CategorySchema {
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    description: string;
  };
  rule: CategoryRule;
  enabled_blocks: FieldBlock[];
  all_blocks: FieldBlock[];
  custom_fields: FieldDefinition[];
  field_overrides: Record<string, FieldDefinition>;
  deposit_policy: {
    requires_deposit: boolean;
    deposit_mode: string;
    deposit_percent: number;
    deposit_fixed: number;
    deposit_floor: number;
    deposit_cap: number | null;
    deposit_reason: string;
    requires_merchandise_value: boolean;
  };
}

export async function getCategorySchema(slug: string): Promise<CategorySchema> {
  return apiRequest<CategorySchema>(`/categories/${slug}/schema/`);
}
