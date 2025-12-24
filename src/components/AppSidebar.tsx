import { History, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// 模拟一些历史数据
const mockHistory = [
    "如何成为全栈工程师",
    "红烧肉的制作教程",
    "2025年前端技术趋势",
    "React Hooks 深度解析",
    "马斯克火星殖民计划",
];

export function AppSidebar({ onNewChat }: { onNewChat: () => void }) {
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
                    {mockHistory.map((item, index) => (
                        <button
                            key={index}
                            className="w-full text-left px-3 py-2 text-sm text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors flex items-center gap-2 truncate"
                        >
                            <History size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate">{item}</span>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </aside>
    );
}