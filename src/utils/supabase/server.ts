import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // 在 Server Component 中可能会抛出错误，因为此时不能设置 Cookie
                        // 这个 try/catch 块是为了忽略该错误，确保页面能正常渲染
                        // 真正的 Cookie 设置通常发生在 Middleware 或 Server Actions 中
                    }
                },
            },
        }
    );
}