import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CREDITS_MAP: Record<string, number> = {
    'pro': 3000,
    'unlimited': 999999999,
};

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('Stripe-Signature') as string;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 1. 首次支付
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckout(session);
    }

    // 2. 自动续费 (月付/年付到期后的自动扣款)
    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoice(invoice);
    }

    return NextResponse.json({ received: true });
}

// --- 辅助函数：同时获取 结束日期 和 周期(month/year) ---
async function fetchSubscriptionDetails(subId: string) {
    try {
        const sub = await stripe.subscriptions.retrieve(subId);
        // 获取周期：'month' 或 'year'
        // Stripe 结构通常在 items.data[0].price.recurring.interval
        const interval = sub.items.data[0].price.recurring?.interval || 'month';
        const endDate = new Date(sub.current_period_end * 1000).toISOString();
        return { interval, endDate };
    } catch (e) {
        console.warn('Fetch sub failed', e);
        // 兜底
        const d = new Date(); d.setDate(d.getDate() + 30);
        return { interval: 'month', endDate: d.toISOString() };
    }
}

async function handleCheckout(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;
    const subId = session.subscription as string;

    if (!userId || !tier) return;

    const { interval, endDate } = await fetchSubscriptionDetails(subId);
    const newCredits = CREDITS_MAP[tier] || 0;

    await supabase.from('profiles').update({
        tier,
        credits: newCredits,
        stripe_subscription_id: subId,
        stripe_customer_id: session.customer as string,
        subscription_end_date: endDate,
        billing_cycle: interval,   // <--- 存入周期
        last_reset_date: new Date().toISOString() // <--- 更新重置时间
    }).eq('id', userId);
}

async function handleInvoice(invoice: Stripe.Invoice) {
    const subId = invoice.subscription as string;
    if (!subId) return;

    const { data: user } = await supabase
        .from('profiles')
        .select('id, tier')
        .eq('stripe_subscription_id', subId)
        .single();

    if (!user) return;

    const { interval, endDate } = await fetchSubscriptionDetails(subId);
    const newCredits = CREDITS_MAP[user.tier] || 0;

    // 续费意味着必须重置积分
    await supabase.from('profiles').update({
        credits: newCredits,
        subscription_end_date: endDate,
        billing_cycle: interval,
        last_reset_date: new Date().toISOString()
    }).eq('id', user.id);
}
