"use client";

import { History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter, useSearchParams } from 'next/navigation'; // 关键：引入 useSearchParams

interface MindMap {
    id: string;
    title: string;
    updated_at: string;
}

interface AppSidebarProps {
    onNewChat: () => void;
    history: MindMap[];
}

export function AppSidebar({ onNewChat, history = [] }: AppSidebarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 1. 获取当前 URL 上的 ID
    const activeId = searchParams.get('id');

    const handleHistoryClick = (id: string) => {
        router.replace(`/?id=${id}`);
    };

    return (
        <aside className="w-60 border-r bg-white rounded-[12] flex flex-col h-full shrink-0">
            <div className="p-4">
                <Button onClick={onNewChat} className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                    <Plus size={16} />
                    新建导图
                </Button>
            </div>
            <div className="px-4 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 mb-2 px-2">最近历史</h3>
            </div>
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-1">
                    {history.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">暂无历史记录</div>
                    ) : (
                        history.map((item) => {
                            // 2. 判断当前项是否被选中
                            const isActive = activeId === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleHistoryClick(item.id)}
                                    className={`
                                        w-full text-left px-3 py-2 text-sm rounded-md transition-all flex items-center gap-2 truncate
                                        ${isActive
                                            ? 'bg-blue-100 text-blue-700 font-medium shadow-sm' // 高亮样式：深色文字+背景
                                            : 'text-slate-600 hover:bg-slate-100' // 普通样式
                                        }
                                    `}
                                >
                                    <History
                                        size={14}
                                        className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                                    />
                                    <span className="truncate">{item.title}</span>
                                </button>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}
