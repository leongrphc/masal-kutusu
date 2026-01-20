import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/subscription';
import type { Database } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingSub) {
      return NextResponse.json({
        success: true,
        message: 'Subscription already exists'
      }, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    // Create user in users table if not exists
    const userData: Database['public']['Tables']['users']['Insert'] = {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || null,
    };

    const { error: userError } = await supabaseAdmin
      .from('users')
      // @ts-ignore - Supabase type inference issue
      .upsert(userData, {
        onConflict: 'id'
      });

    if (userError) {
      console.error('Error creating user:', userError);
    }

    // Create free subscription
    const now = new Date();
    const resetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day

    const subscriptionData: Database['public']['Tables']['subscriptions']['Insert'] = {
      user_id: user.id,
      plan: 'free',
      status: 'active',
      credits_remaining: 1,
      credits_total: 1,
      credits_reset_date: resetDate.toISOString(),
      started_at: now.toISOString(),
    };

    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      // @ts-ignore - Supabase type inference issue
      .insert(subscriptionData);

    if (subError) {
      console.error('Error creating subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to create subscription', detail: subError.message },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Free subscription created successfully'
    }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });

  } catch (error: any) {
    console.error('Init subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error.message },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
