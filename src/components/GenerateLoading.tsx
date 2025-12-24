export const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
        <div className="flex gap-2 mb-4">
            {/* 模拟几个闪烁的节点 */}
            <div className="w-12 h-8 bg-slate-200 rounded animate-pulse"></div>
            <div className="w-8 h-1 bg-slate-300 self-center"></div>
            <div className="w-12 h-8 bg-slate-200 rounded animate-pulse delay-100"></div>
            <div className="w-8 h-1 bg-slate-300 self-center"></div>
            <div className="w-12 h-8 bg-slate-200 rounded animate-pulse delay-200"></div>
        </div>
        <p className="text-slate-600 font-medium animate-pulse">正在梳理逻辑结构...</p>
        <p className="text-xs text-slate-400 mt-2">AI 正在阅读您的内容并构建知识图谱</p>
    </div>
);