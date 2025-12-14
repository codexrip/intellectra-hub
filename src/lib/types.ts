import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  walletBalance: number;
  xp: number;
  level: number;
  rating: number;
  isFrozen: boolean;
  frozenUntil: Timestamp | null;
}

export type Urgency = 'Low' | 'Medium' | 'High' | 'Extreme';
export type RequestType = 'Project Material' | 'Collaboration' | 'Teaching Material' | 'Others';
export type RequestStatus = 'Open' | 'Closed' | 'Completed';

export interface Request {
  id: string;
  requesterId: string;
  title: string;
  description: string;
  urgency: Urgency;
  type: RequestType;
  cost: number;
  status: RequestStatus;
  createdAt: Timestamp;
}

export interface Solution {
  id: string;
  requestId: string;
  solverId: string;
  content: string;
  isAccepted: boolean;
  createdAt: Timestamp;
  solver?: {
    displayName: string;
    photoURL: string;
  };
}

export interface SecurityLog {
  id?: string;
  email: string;
  failedAttempts: number;
  lastAttemptTime: Timestamp;
}
