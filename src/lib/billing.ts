export const SUBSCRIPTION_PLAN_IDS = {
    PRO_MONTHLY: process.env.NEXT_PUBLIC_VARIANT_PRO_MONTHLY!,
    UNLIMITED_MONTHLY: process.env.NEXT_PUBLIC_VARIANT_UNLIMITED_MONTHLY!,
    PRO_YEARLY: process.env.NEXT_PUBLIC_VARIANT_PRO_YEARLY!,
    UNLIMITED_YEARLY: process.env.NEXT_PUBLIC_VARIANT_UNLIMITED_YEARLY!,
};

// 反向映射配置：通过 ID 查周期
export const VARIANT_CONFIG: Record<string, { interval: 'month' | 'year' }> = {
    [SUBSCRIPTION_PLAN_IDS.PRO_MONTHLY]: { interval: 'month' },
    [SUBSCRIPTION_PLAN_IDS.UNLIMITED_MONTHLY]: { interval: 'month' },
    [SUBSCRIPTION_PLAN_IDS.PRO_YEARLY]: { interval: 'year' },
    [SUBSCRIPTION_PLAN_IDS.UNLIMITED_YEARLY]: { interval: 'year' },
};
