import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // 1. 更新 Request 中的 cookie，以便后续的 Server Component 能读取到最新状态
                        request.cookies.set(name, value);
                        // 2. 更新 Response 中的 cookie，以便浏览器能保存最新的 Token
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    /**
     * ⚠️ 重要:
     * 必须在这里调用 getUser()。
     * 这会触发 Supabase 检查 Token 是否过期，如果过期会自动刷新，
     * 并通过上面的 setAll 将新 Token 写入 Response Cookie。
     */
    await supabase.auth.getUser();

    return response;
}