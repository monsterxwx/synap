"use client";

import { Sparkles, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client'; // 引入浏览器端客户端
import { User } from '@supabase/supabase-js';
import { UserNav } from '@/components/UserNav'; // 确保路径正确

export function AppHeader({ onUpgradeClick }: { onUpgradeClick?: () => void }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // 在组件加载时获取用户状态
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        getUser();

        // 监听登录状态变化 (可选，但推荐)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <header className="h-14 flex items-center justify-between px-4 shrink-0 z-20 relative  backdrop-blur-sm border-b border-slate-100">
            {/* 左侧 Logo */}
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <Sparkles size={18} />
                </div>
                <span>Synap</span>
            </div>

            {/* 右侧 功能区 */}
            <div className="flex items-center gap-3">
                {/* 升级按钮 (仅在非移动端显示) */}
                <Button
                    onClick={onUpgradeClick}
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                >
                    <Zap size={14} fill="currentColor" />
                    <span>升级 Pro</span>
                </Button>

                {/* 用户区域：根据登录状态切换 */}
                {loading ? (
                    // 1. 加载中状态
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                ) : user ? (
                    // 2. 已登录：显示头像菜单
                    <UserNav user={user} />
                ) : (
                    // 3. 未登录：显示登录按钮
                    <Link href="/login">
                        <Button size="sm" variant="default" className="h-8 px-4">
                            登录
                        </Button>
                    </Link>
                )}
            </div>
        </header>
    );
}