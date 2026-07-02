import { apiRequest } from './client';

export interface LandingProvider {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  profile_picture: string | null;
  skills: string[];
  level: string;
  reputation_score: number;
  completed_missions: number;
  review_count: number;
  avg_rating: number | null;
  identity_verified: boolean;
  is_available?: boolean;
}

export interface LandingData {
  stats?: {
    total_providers: number;
    open_missions: number;
    completed_missions: number;
  };
  featured_providers: LandingProvider[];
  featured_enterprises?: LandingEnterprise[];
  popular_categories?: string[];
}

export interface LandingEnterprise {
  id: string;
  company_name: string;
  city: string;
  website?: string;
  total_employees?: number;
  total_missions_posted?: number;
  reputation_score?: number;
  is_verified?: boolean;
  logo?: string | null;
}

export async function getLandingData(): Promise<LandingData> {
  return apiRequest<LandingData>(`/config/landing/?providers_limit=8&enterprises_limit=8`);
}

export async function getAllProviders(): Promise<LandingProvider[]> {
  const data = await apiRequest<LandingData>(`/config/landing/?providers_limit=40`);
  return data.featured_providers || [];
}

export async function getAllEnterprises(): Promise<LandingEnterprise[]> {
  const data = await apiRequest<LandingData>(`/config/landing/?enterprises_limit=40`);
  return data.featured_enterprises || [];
}
