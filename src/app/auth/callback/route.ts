import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // 如果 URL 中有 next 参数，登录后跳转到那里，否则跳回首页
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host'); // 适配 Vercel 部署环境
            const isLocalEnv = process.env.NODE_ENV === 'development';

            if (isLocalEnv) {
                // 本地开发环境
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                // 生产环境 (Vercel)
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    // 如果出错，跳回登录页并带上错误信息
    return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}