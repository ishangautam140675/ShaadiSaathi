export type UserRole = 'OWNER' | 'FAMILY_MEMBER' | 'VIEWER';
export type FamilySide = 'bride' | 'groom' | 'mutual';

export interface AuthUser {
  id: string;
  family_id: string;
  name: string;
  email: string;
  role: UserRole;
  side: FamilySide;
  is_active: number;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  total_budget: number;
  currency: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  family_id: string;
  invited_by_user_id: string;
  email: string;
  name: string;
  role: 'FAMILY_MEMBER' | 'VIEWER';
  side: FamilySide;
  token_preview: string;
  expires_at: string;
  is_revoked: number;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
}
