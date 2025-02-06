import { Timestamp, FieldValue } from 'firebase/firestore';

export interface Team {
  id: string;
  name: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  ownerId: string; // The user who created/owns the team
  settings?: TeamSettings;
  metadata?: Record<string, any>;
}

export interface TeamSettings {
  allowEmployeeJobCreation: boolean;
  requireJobApproval: boolean;
  maxEmployees?: number;
  customFields?: CustomField[];
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[]; // For select type fields
}

export interface TeamMember {
  userId: string;
  teamId: string;
  role: 'owner' | 'admin' | 'employee';
  joinedAt: Timestamp | FieldValue;
  status: 'active' | 'inactive' | 'pending';
} 