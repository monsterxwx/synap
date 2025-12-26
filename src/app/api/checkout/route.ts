import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia', // 使用最新版本即可
});

export async function POST(req: Request) {
    try {
        // 1. 验证用户登录
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { priceId, tierName } = await req.json();

        // 2. 创建 Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer_email: user.email, // 自动填入用户邮箱
            line_items: [
                {
                    price: priceId, // 前端传来的价格 ID
                    quantity: 1,
                },
            ],
            mode: 'subscription', // 订阅模式
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?success=true`, // 支付成功回调
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?canceled=true`, // 取消回调
            // 关键：把用户 ID 和购买等级存到 metadata，方便 Webhook 处理
            metadata: {
                userId: user.id,
                tier: tierName, // 'pro' 或 'unlimited'
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
