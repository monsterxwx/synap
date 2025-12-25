import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    // 创建运行在浏览器端的 Supabase 客户端
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}