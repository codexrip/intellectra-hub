import { Urgency, RequestType } from './types';

export const URGENCY_COST: Record<Urgency, number> = {
  'Low': 5,
  'Medium': 8,
  'High': 15,
  'Extreme': 20,
};

export const TYPE_COST: Record<RequestType, number> = {
  'Project Material': 5,
  'Collaboration': 3,
  'Teaching Material': 7,
  'Others': 10,
};

export const REWARD_PERCENTAGE = 0.8;
export const LEVEL_UP_BONUS = 300;
export const XP_PER_LEVEL = 100;

// 8 minutes in milliseconds
export const IDLE_TIMEOUT = 8 * 60 * 1000;

export const MAX_FAILED_ATTEMPTS_SHORT = 3;
export const SHORT_FREEZE_HOURS = 5;
export const MAX_FAILED_ATTEMPTS_LONG = 6;
export const LONG_FREEZE_HOURS = 24;
