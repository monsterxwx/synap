'use client';

import { Sparkles, Zap, Loader2, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { UserNav } from '@/components/UserNav';
import { cn } from '@/lib/utils'; // 确保引入 cn 工具用于动态类名

export function AppHeader({ onUpgradeClick }: { onUpgradeClick?: () => void }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // 状态：存储会员等级和积分
    const [isPro, setIsPro] = useState(false);
    const [tier, setTier] = useState<string>('basic');
    const [credits, setCredits] = useState<string | number>(0);

    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tier, credits')
                    .eq('id', user.id)
                    .single();

                const userTier = profile?.tier || 'basic';
                const userCredits = profile?.credits || 0;

                setTier(userTier);
                // 如果是 unlimited 套餐，积分显示为 "无限" 或图标，这里保持数字逻辑
                setCredits(userTier === 'unlimited' ? '9999+' : userCredits);
                setIsPro(userTier === 'pro' || userTier === 'unlimited');
            }
            setLoading(false);
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session?.user) {
                setIsPro(false);
                setCredits(0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <header className="h-14 flex items-center justify-between px-4 shrink-0 z-20 relative backdrop-blur-sm border-b border-slate-100 bg-[#f6f7f9]">
            {/* 左侧 Logo */}
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <Sparkles size={18} />
                </div>
                <span>Synap</span>
            </div>

            {/* 右侧 功能区 */}
            <div className="flex items-center gap-3">

                {/* 1. 升级/状态按钮 (放在胶囊左侧或根据需求调整位置) */}
                {user && (
                    <Button
                        onClick={onUpgradeClick}
                        variant="outline"
                        size="sm"
                        className={cn(
                            "hidden sm:flex gap-1 transition-colors rounded-lg px-3 h-7 ",
                            tier === 'unlimited'
                                ? "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100"
                                : " border-none shadow-none bg-[#2534de] text-white font-bold text-[12px]"
                        )}
                    >
                        {tier === 'unlimited' && <Zap size={14} fill="currentColor" />}
                        {tier === 'unlimited' ? (
                            <span className="font-bold">Unlimited</span>
                        ) : isPro ? (
                            <span>Pro 会员</span>
                        ) : (
                            <span>升级</span>
                        )}
                    </Button>
                )}

                {/* 用户区域：根据登录状态切换 */}
                {loading ? (
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
