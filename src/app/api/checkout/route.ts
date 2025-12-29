import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

// 初始化 Lemon Squeezy
lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
});

export async function POST(req: Request) {
    try {
        // 1. 验证用户登录
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 注意：这里的 priceId 现在应该传 Lemon Squeezy 的 Variant ID
        const { priceId, tierName } = await req.json();

        // 1. 确保 Store ID 存在且为数字 (虽然 SDK 允许字符串，但转为数字最稳)
        const storeId = process.env.LEMONSQUEEZY_STORE_ID;

        // 2. 关键修改：强制转为整数
        const variantId = parseInt(priceId.toString(), 10);

        if (!storeId) {
            return NextResponse.json({ error: 'Store ID not found' }, { status: 500 });
        }

        // 2. 创建 Lemon Squeezy Checkout
        const checkout = await createCheckout(
            storeId!,
            variantId, // 对应 LS 的 Variant ID
            {
                checkoutData: {
                    email: user.email, // 预填用户邮箱
                    custom: {
                        user_id: user.id, // 透传用户ID
                        tier: tierName,   // 透传等级 ('pro' 或 'unlimited')
                    },
                },
                productOptions: {
                    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/?success=true`, // 支付成功跳转
                    receiptButtonText: 'Go to Dashboard',
                    // cancelUrl 不在 productOptions 里直接设置，通常在后台设置或依赖浏览器回退，
                    // 但可以通过 API 覆写 checkout 行为，此处简化处理。
                },
            }
        );
        // 获取支付链接
        const checkoutUrl = checkout.data?.data.attributes.url;

        if (!checkoutUrl) {
            console.error('Lemon Squeezy Checkout Error:', checkout.error);
            return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
        }

        return NextResponse.json({ url: checkoutUrl });

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
