import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps, useNodeConnections } from '@xyflow/react';
import { PlusCircle, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'; // 记得安装 lucide-react 图标库

// 定义数据类型，增加一个 onExpand 回调
type NodeData = {
    label: string;
    onExpand?: (id: string, label: string) => Promise<void>;
    onToggle?: (id: string) => void; // 新增：折叠回调
    isCollapsed?: boolean; // 新增：当前是否折叠
};

const MindMapNode = ({ id, data }: NodeProps<NodeData>) => {
    const [loading, setLoading] = useState(false);

    const connections = useNodeConnections({
        handleType: 'source',
    });
    const showToggle = connections.length > 0;

    const handleExpandClick = async (e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止冒泡

        if (loading) return; // 防止重复点击
        if (!data.onExpand) return;

        setLoading(true); // 开始转圈

        try {
            // 等待父组件的异步操作完成（就是等待 page.tsx 里的 API 请求回来）
            await data.onExpand(id, data.label);
        } catch (error) {
            console.error("扩写出错", error);
        } finally {
            setLoading(false); // 无论成功失败，停止转圈
        }
    };

    return (
        <div className="group relative px-4 py-3 shadow-md rounded-lg bg-white border-2 border-slate-200 hover:border-slate-400 transition-colors  text-center">

            <Handle type="target" position={Position.Left} className="!bg-slate-400" />

            <div className="text-sm font-medium text-slate-700 max-w-[300px] break-words whitespace-pre-wrap leading-relaxed">
                {data.label}
            </div>

            {/* 折叠/展开 切换按钮 (放在节点右边连接处) */}
            {showToggle && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // 阻止冒泡
                        if (data.onToggle) data.onToggle(id);
                    }}
                    className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-300 rounded-full w-4 h-4 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                >
                    {/* 如果折叠了显示 >, 没折叠显示 v */}
                    {data.isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                </button>
            )}
            {/* 只有鼠标悬停时才显示的“扩写”按钮 */}
            <button
                onClick={handleExpandClick} // 使用刚才写的异步函数
                // 如果正在 loading，就强制显示(flex)，否则还是 hover 时才显示(hidden group-hover:flex)
                className={`absolute -right-3 -top-3 ${loading ? 'flex' : 'hidden group-hover:flex'} bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 transition-all shadow-sm`}
                title="扩写节点"
                disabled={loading} // 禁用点击
            >
                {loading ? (
                    // 显示转圈图标
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    // 显示加号图标
                    <PlusCircle size={14} />
                )}
            </button>

            <Handle type="source" position={Position.Right} className="!bg-slate-400" />
        </div>
    );
};

export default memo(MindMapNode);