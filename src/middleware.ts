import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * 匹配所有路径，除了:
         * - _next/static (静态文件)
         * - _next/image (图片优化)
         * - favicon.ico (图标)
         * - public 文件夹下的静态资源 (可选，通常建议排除 .svg, .png 等)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};