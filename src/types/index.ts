// Core data model types, mirroring the Supabase schema.

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null; // ISO date string (YYYY-MM-DD)
  is_active: boolean;
  consent_text: string;
  requires_health_declaration: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  full_name: string;
  class_name: string | null;
  parent_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  event_id: string;
  child_id: string;
  parent_full_name: string;
  parent_phone: string;
  parent_id_number: string | null;
  notes: string | null;
  health_declaration_checked: boolean;
  general_consent_checked: boolean;
  photo_consent_checked: boolean | null;
  signature_data_url: string | null;
  pdf_storage_path: string;
  pdf_public_url: string | null;
  submitted_at: string;
  ip_address: string | null;
}

// Joined view used in the admin dashboard submissions table
export interface SubmissionWithRelations extends Submission {
  events: Pick<Event, 'id' | 'title' | 'event_date'> | null;
  children: Pick<Child, 'id' | 'full_name' | 'class_name'> | null;
}

export interface NewEventInput {
  title: string;
  description: string;
  event_date: string;
  consent_text: string;
  requires_health_declaration: boolean;
}

export interface ParentFormInput {
  parentFullName: string;
  parentPhone: string;
  parentIdNumber: string;
  notes: string;
  healthDeclarationChecked: boolean;
  generalConsentChecked: boolean;
  photoConsentChecked: boolean | null;
  signatureDataUrl: string; // base64 PNG from the signature canvas
}
