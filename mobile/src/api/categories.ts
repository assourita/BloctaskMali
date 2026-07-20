import { apiRequest } from './client';
import type { CategorySchema } from './categorySchema';

export interface CategoryRules {
  slug: string;
  label: string;
  mission_type: string;
  requires_deposit: boolean;
  deposit_mode: string;
  deposit_percent: number;
  deposit_reason: string;
  requires_merchandise_value: boolean;
  requires_vehicle: boolean;
  requires_photo: boolean;
  requires_signature: boolean;
  requires_id_verification: boolean;
  requires_gps_tracking: boolean;
  enterprise_only: boolean;
  min_reputation_score: number;
  requires_pickup: boolean;
  requires_delivery: boolean;
  requirement_labels: string[];
  location_label: string;
  date_label: string;
  show_time_range: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  mission_count?: number;
  rules?: CategoryRules;
}

export interface DepositPreview {
  requires_deposit: boolean;
  estimated_deposit: number;
  deposit_mode: string;
  deposit_reason: string;
  requires_merchandise_value: boolean;
  rules?: CategoryRules;
}

export async function getCategories(): Promise<Category[]> {
  const data = await apiRequest<Category[] | { results: Category[] }>('/categories/');
  return Array.isArray(data) ? data : data.results || [];
}

export async function getDepositPreview(
  slug: string,
  budget: number,
  merchandiseValue?: number,
): Promise<DepositPreview> {
  const params = new URLSearchParams({ budget: String(budget) });
  if (merchandiseValue != null && merchandiseValue > 0) {
    params.set('merchandise_value', String(merchandiseValue));
  }
  return apiRequest<DepositPreview>(`/categories/${slug}/deposit_preview/?${params}`);
}

export async function getCategorySchema(slug: string): Promise<CategorySchema> {
  return apiRequest<CategorySchema>(`/categories/${slug}/schema/`);
}

export type { CategorySchema };
