
import type { Session as SupabaseSession } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Session = SupabaseSession;

// Interfaces for nested JSON objects to be used within main types
export interface Address {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface DayOpeningHours {
  morning_open: string;
  morning_close: string;
  afternoon_open: string;
  afternoon_close: string;
}

export interface OpeningHours {
  [day: string]: DayOpeningHours | null;
}


export interface CancellationPolicy {
  enabled: boolean;
  feePercentage: number;
  timeLimitHours: number;
}

export interface LoyaltyProgram {
  enabled: boolean;
  stampsNeeded: number;
  reward: string;
}

export interface ClientRecord {
  notes: string;
}

export interface SocialMedia {
    instagram?: string;
    facebook?: string;
    website?: string;
}

export interface IntegrationSettings {
    googleCalendar?: boolean;
    whatsapp?: boolean;
    whatsapp_reminder_minutes?: number;
    googleCalendarClientId?: string | null;
    googleCalendarId?: string;
    stripeAccountId?: string | null;
    stripeAccountOnboarded?: boolean;
    mercadopagoAccessToken?: string | null;
    mercadopagoPublicKey?: string | null;
    mercadopagoRefreshToken?: string | null;
    mercadopagoUserId?: number | null;
    plan?: 'BASIC' | 'PRO' | 'PREMIUM' | string;
    plan_type?: 'monthly' | 'annual';
    plan_expires_at?: string; // ISO Date String
    plan_status?: 'active' | 'suspended';
    auto_confirm_appointments?: boolean;
}

export interface BlockedTimeSlot {
    start: string; // ISO Date String
    end: string;   // ISO Date String
}

export interface FinancialRecord {
  id: string;
  date: string; // ISO Date string
  amount: number;
  description: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
}

export interface Barber {
  id: string;
  name: string;
  avatarUrl: string;
  commissionPercentage?: number;
  bio?: string;
  specialties?: string[];
  portfolioImages?: string[];
  advances?: FinancialRecord[];
  consumptions?: FinancialRecord[];
}

export interface ServicePackage {
  id: string;
  name: string;
  serviceIds: string[];
  price: number;
  totalUses: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  // FIX: Changed 'benefits' to 'serviceIds' to match component usage.
  serviceIds: string[];
  // FIX: Added 'usesPerMonth' to match component usage.
  usesPerMonth: number;
}


export interface SubscriptionPlanDetails {
  id: string; 
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  maxBarbers: number; // Infinity for unlimited
  features: {
    analytics: boolean;
    marketing: boolean;
    googleCalendar: boolean;
    onlinePayments: boolean;
    packagesAndSubscriptions: boolean;
    // FIX: Added missing 'clientManagement' property to align with type definition.
    clientManagement: boolean;
  };
}

export interface PromotionRecipient {
  clientId: string;
  clientName: string;
  status: 'sent' | 'read';
  receivedAt: string; // ISO Date string
  readAt?: string;    // ISO Date string
}

export interface Promotion {
  id: string;
  title: string;
  message: string;
  sentAt: string; // ISO Date string
  recipients: PromotionRecipient[];
}

export interface ClientNotification {
  id: string; 
  promotionId: string;
  barbershopId: string;
  barbershopName: string;
  title: string;
  message: string;
  receivedAt: string; // ISO Date string
  isRead: boolean;
}

export interface WaitingListEntry {
  clientId: string;
  clientName: string;
  requestedAt: string; // ISO Date string
}

// Specific types for structured JSON data on User profile
export interface UserPurchasedPackage {
  id: string; // A unique ID for this specific purchase instance
  packageId: string; // ID of the ServicePackage template
  barbershopId: string;
  purchaseDate: string; // ISO Date string
  remainingUses: number;
}

export interface UserActiveSubscription {
  id: string; // A unique ID for this specific subscription instance
  subscriptionId: string; // ID of the SubscriptionPlan template
  barbershopId: string;
  startDate: string; // ISO Date string
  status: 'active' | 'cancelled';
}


// Main application types, mirroring Supabase tables
export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  user_type: 'CLIENT' | 'BARBERSHOP';
  birth_date: string | null;
  favorite_barbershop_ids: string[] | null;
  loyalty_stamps: Json | null;
  notifications: Json | ClientNotification[] | null;
  outstanding_debts: Json | null;
  rewards: Json | null;
  store_credits: Json | null;
  // FIX: Added purchased_packages and active_subscriptions to User type
  purchased_packages: Json | UserPurchasedPackage[] | null;
  active_subscriptions: Json | UserActiveSubscription[] | null;
}

export interface Barbershop {
  id: string;
  owner_id: string;
  name: string;
  // FIX: Added missing 'slug' property to align with database schema and component usage.
  slug: string | null;
  phone: string | null;
  description: string | null;
  image_url: string | null;
  gallery_images: string[] | null;
  social_media: Json | SocialMedia | null;
  created_at: string | null;
  rating: number | null;
  has_completed_setup: boolean | null;
  address: Json | Address | null;
  opening_hours: Json | OpeningHours | null;
  services: Json | Service[] | null;
  barbers: Json | Barber[] | null;
  packages: Json | ServicePackage[] | null;
  subscriptions: Json | SubscriptionPlan[] | null;
  cancellation_policy: Json | CancellationPolicy | null;
  integrations: Json | IntegrationSettings | null;
  loyalty_program: Json | LoyaltyProgram | null;
  client_records: Json | { [clientId: string]: ClientRecord } | null;
  promotions: Json | Promotion[] | null;
  waiting_list: Json | { [date: string]: WaitingListEntry[] } | null;
  blocked_dates: string[] | null;
  blocked_time_slots: Json | BlockedTimeSlot[] | null;
  trial_ends_at: string | null;
}

export interface Appointment {
  id: string;
  client_id: string;
  client_name: string | null;
  barbershop_id: string;
  barber_id: string | null;
  barber_name: string | null;
  service_id: string | null;
  service_name: string | null;
  price: number | null;
  start_time: Date; // Converted from string for app use
  end_time: Date;   // Converted from string for app use
  created_at: Date | null; // Converted from string for app use
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined' | 'paid';
  notes: string | null;
  is_reward: boolean | null;
  review_id: string | null;
  cancellation_fee: number | null;
  commission_amount: number | null;
  google_event_id?: string | null;
  mp_preference_id?: string | null;
  package_usage_id: string | null;
  subscription_usage_id: string | null;
}

export interface Review {
  id: string;
  appointment_id: string;
  client_id: string;
  client_name: string | null;
  barbershop_id: string;
  barber_id: string | null;
  rating: number;
  comment: string | null;
  created_at: Date; // Converted from string for app use
}