import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { purchaseSubscription, type SubscriptionPlanId } from '@/lib/subscription';

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

    // Get plan from request
    const body = await request.json();
    const { planId } = body as { planId: SubscriptionPlanId };

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID gerekli' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Purchase subscription (fake payment for now)
    const result = await purchaseSubscription(user.id, planId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Satın alma başarılı!' },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: 'Satın alma işlemi başarısız oldu.' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
