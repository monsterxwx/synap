"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Coins, CreditCard, LogOut, Settings, User as UserIcon } from "lucide-react";

interface UserNavProps {
    user: User;
}

// 定义各等级的月度上限，用于计算进度条
const TIER_LIMITS: Record<string, number> = {
    'basic': 500,
    'pro': 3000,
    'unlimited': -1 // -1 代表无限
};

// 定义等级显示的名称
const TIER_NAMES: Record<string, string> = {
    'basic': '免费版',
    'pro': 'Pro 会员',
    'unlimited': '无限版'
};

export function UserNav({ user }: UserNavProps) {
    const router = useRouter();
    const supabase = createClient();
    const [credits, setCredits] = useState<number>(0);
    const [tier, setTier] = useState<string>('basic');

    const fetchCredits = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('credits, tier')
            .eq('id', user.id)
            .single();

        if (data) {
            setCredits(data.credits || 0);
            setTier(data.tier || 'basic');
        }
    }, [user, supabase]);

    useEffect(() => {
        fetchCredits();

        const handleLocalRefresh = () => fetchCredits();
        window.addEventListener('user:refresh-credits', handleLocalRefresh);

        const channel = supabase
            .channel('realtime-credits')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    const newRow = payload.new as any;
                    if (newRow) {
                        setCredits(newRow.credits || 0);
                        setTier(newRow.tier || 'basic');
                    }
                }
            )
            .subscribe();

        return () => {
            window.removeEventListener('user:refresh-credits', handleLocalRefresh);
            supabase.removeChannel(channel);
        };
    }, [fetchCredits, supabase, user.id]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    // === 计算进度条逻辑 ===
    const { progress, maxCredits, isUnlimited } = useMemo(() => {
        const isUnlimited = tier === 'unlimited';
        const max = TIER_LIMITS[tier] || 500;

        // 计算百分比: (当前 / 总量) * 100
        // 注意：credits 是"剩余积分"，进度条通常显示"剩余量"或者"已用量"
        // 这里我们做成"剩余电量"风格：条越长，剩余越多
        let pct = 0;
        if (isUnlimited) {
            pct = 100;
        } else {
            pct = Math.min(100, Math.max(0, (credits / max) * 100));
        }

        return { progress: pct, maxCredits: max, isUnlimited };
    }, [credits, tier]);

    const emailInitial = user.email ? user.email[0].toUpperCase() : "U";
    const avatarUrl = user.user_metadata?.avatar_url;
    // 优先显示 Full Name，如果没有则截取邮箱前缀
    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || "User";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="relative border-none shadow-none h-auto py-1 pl-1 pr-4 rounded-full  hover:shadow-md transition-all bg-white flex items-center gap-3"
                >
                    <Avatar className="h-6 w-6 border border-slate-100">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="bg-slate-800 text-white">{emailInitial}</AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                        <Coins size={14} className="text-slate-500" strokeWidth={2.5} />
                        <span className="font-bold text-slate-700 text-xs font-mono pt-0.5">
                            {isUnlimited ? '∞' : credits}
                        </span>
                    </div>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-72 p-2" align="end" forceMount>
                {/* 1. 用户信息头部 */}
                <div className="flex items-center gap-3 p-2 mb-2">
                    <Avatar className="h-10 w-10 border border-slate-200">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="bg-[#1d293d] text-white">
                            {emailInitial}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-slate-900 truncate text-sm">{displayName}</span>
                        <span className="text-xs text-slate-500 truncate">{user.email}</span>
                    </div>
                </div>

                {/* 2. 积分进度条卡片 (仿照图一) */}
                <div className=" rounded-lg pl-3 pr-3 pb-2">
                    <div className="flex justify-between items-center mb-2 text-xs">
                        <span className="font-bold text-slate-700">
                            {TIER_NAMES[tier] || '免费版'}
                        </span>
                        <span className="text-slate-500 font-mono">
                            {isUnlimited ? '无限使用' : `剩余 ${credits}/${maxCredits}`}
                        </span>
                    </div>

                    {/* 进度条轨道 */}
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        {/* 进度条填充 (蓝色) */}
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => alert("开发中: 账单")}>
                        <CreditCard className="mr-2 h-4 w-4 text-slate-500" />
                        <span>订阅与账单</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer py-2.5">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
