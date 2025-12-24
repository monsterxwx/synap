import { Sparkles, User, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader() {
    return (
        <header className="h-14  flex items-center justify-between px-4 shrink-0 z-20 relative">
            {/* 左侧 Logo */}
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                    <Sparkles size={18} />
                </div>
                <span>MindGenius</span> {/* 给你的产品起个名字 */}
            </div>

            {/* 右侧 功能区 */}
            <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="hidden sm:flex gap-1 text-amber-600 border-amber-200 hover:bg-amber-50">
                    <Zap size={14} fill="currentColor" />
                    <span>升级 Pro</span>
                </Button>

                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-300 transition-colors">
                    <User size={18} />
                </div>
            </div>
        </header>
    );
}