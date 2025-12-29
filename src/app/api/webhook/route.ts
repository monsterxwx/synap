import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VARIANT_CONFIG } from '@/lib/billing';
import crypto from 'crypto';

// 初始化 Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 积分配置
const CREDITS_MAP: Record<string, number> = {
    'pro': 3000,
    'unlimited': 999999999,
};


export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('X-Signature') || '';
        const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

        // 1. 验证签名
        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
        const signatureBuffer = Buffer.from(signature, 'utf8');

        if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;

        // 2. 事件分发
        if (eventName === 'subscription_created') {
            await handleSubscriptionCreated(payload);
        } else if (eventName === 'subscription_updated') {
            await handleSubscriptionUpdated(payload);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// --- 处理新订阅 ---
async function handleSubscriptionCreated(payload: any) {
    const attributes = payload.data.attributes;
    const customData = payload.meta.custom_data;

    // 从 checkout 传递过来的数据
    const userId = customData?.user_id;
    const tier = customData?.tier;

    if (!userId || !tier) {
        console.error('Missing user_id or tier in custom_data');
        return;
    }

    const subId = payload.data.id;
    const customerId = attributes.customer_id;
    const endDate = attributes.renews_at;
    const variantId = String(attributes.variant_id); // 转为字符串查表

    // 核心修改：根据 ID 自动判断是月付还是年付
    const config = VARIANT_CONFIG[variantId];
    const billingCycle = config ? config.interval : 'month'; // 默认 fallback 到 month

    const newCredits = CREDITS_MAP[tier] || 0;

    // 更新数据库
    const { error } = await supabase.from('profiles').update({
        tier: tier,
        credits: newCredits,
        lemon_subscription_id: subId,
        lemon_customer_id: customerId,
        subscription_end_date: endDate,
        billing_cycle: billingCycle, // <--- 写入正确的周期
        last_reset_date: new Date().toISOString()
    }).eq('id', userId);

    if (error) console.error('Database update failed:', error);
}

// --- 处理续费/更新 ---
async function handleSubscriptionUpdated(payload: any) {
    const attributes = payload.data.attributes;
    const subId = payload.data.id;

    const { data: user, error } = await supabase
        .from('profiles')
        .select('id, tier, subscription_end_date')
        .eq('lemon_subscription_id', subId)
        .single();

    if (error || !user) return;

    const newEndDate = attributes.renews_at;
    const oldEndDate = user.subscription_end_date;

    // 只有当到期时间变化（说明续费成功）时，才重置积分
    if (newEndDate !== oldEndDate) {
        const newCredits = CREDITS_MAP[user.tier] || 0;

        // 注意：续费时通常周期不变，所以不用更新 billing_cycle，
        // 但如果支持“月转年”，可以通过 attributes.variant_id 再次检查 VARIANT_CONFIG 并更新

        await supabase.from('profiles').update({
            credits: newCredits,
            subscription_end_date: newEndDate,
            last_reset_date: new Date().toISOString(),
        }).eq('id', user.id);

        console.log(`Credits reset for user ${user.id} (Renal)`);
    }
}
