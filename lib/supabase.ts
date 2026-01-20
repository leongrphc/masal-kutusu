import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: 'free' | 'basic' | 'premium' | 'unlimited';
          status: 'active' | 'cancelled' | 'expired';
          credits_remaining: number;
          credits_total: number;
          credits_reset_date: string | null;
          started_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: 'free' | 'basic' | 'premium' | 'unlimited';
          status?: 'active' | 'cancelled' | 'expired';
          credits_remaining?: number;
          credits_total?: number;
          credits_reset_date?: string | null;
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: 'free' | 'basic' | 'premium' | 'unlimited';
          status?: 'active' | 'cancelled' | 'expired';
          credits_remaining?: number;
          credits_total?: number;
          credits_reset_date?: string | null;
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'purchase' | 'usage' | 'refund' | 'bonus';
          amount: number;
          description: string;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'purchase' | 'usage' | 'refund' | 'bonus';
          amount: number;
          description: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'purchase' | 'usage' | 'refund' | 'bonus';
          amount?: number;
          description?: string;
          metadata?: any;
          created_at?: string;
        };
      };
    };
  };
};
