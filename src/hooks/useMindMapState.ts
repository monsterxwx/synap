import { useCallback, useRef, useEffect } from 'react';
import {
    useNodesState, useEdgesState, useReactFlow, getNodesBounds,
    Node, Edge
} from '@xyflow/react';
import { toast } from "sonner";
import { toPng } from 'html-to-image';
import { getLayoutedElements } from '@/lib/layout';

// [NEW] 辅助函数：将扁平的 Nodes/Edges 还原为树状 JSON
function buildTreeFromFlow(nodes: Node[], edges: Edge[], rootId = 'root'): any {
    const root = nodes.find(n => n.id === rootId);
    if (!root) return null;

    const build = (node: Node): any => {
        // 找到所有从当前节点出发的边
        const childEdges = edges.filter(e => e.source === node.id);
        // 找到对应的子节点
        const childNodes = childEdges
            .map(e => nodes.find(n => n.id === e.target))
            .filter((n): n is Node => !!n);

        // 按照 Y 轴坐标排序，保证视觉顺序和数据顺序一致
        childNodes.sort((a, b) => a.position.y - b.position.y);

        return {
            label: node.data.label,
            children: childNodes.length > 0 ? childNodes.map(build) : undefined,
        };
    };

    return build(root);
}

// [MODIFIED] 增加 onAutoSave 参数
export function useMindMapState(onAutoSave?: (treeData: any) => void, userTier: string = 'basic', onOpenPricing?: () => void) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { getNodes, getEdges, fitView } = useReactFlow();

    const tierRef = useRef(userTier);

    // 每次 userTier 变化时，更新 ref
    useEffect(() => {
        tierRef.current = userTier;
    }, [userTier]);

    // --- 核心算法：更新图数据 ---
    const updateGraph = useCallback((data: any) => {
        if (!data || typeof data !== 'object') return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        const traverse = (node: any, path: string, parentId: string | null) => {
            if (!node) return;
            const label = node.label || 'Thinking...';
            const currentId = path;

            newNodes.push({
                id: currentId,
                data: {
                    label: label,
                    onExpand: handleExpandNode, // 使用内部定义的 handleExpandNode
                    onToggle: handleToggleNode
                },
                position: { x: 0, y: 0 },
                type: 'mindmap',
            });

            if (parentId) {
                newEdges.push({
                    id: `e${parentId}-${currentId}`,
                    source: parentId,
                    target: currentId,
                    type: 'default',
                    animated: true,
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                });
            }

            if (node.children && Array.isArray(node.children)) {
                node.children.forEach((child: any, index: number) => {
                    traverse(child, `${currentId}-${index}`, currentId);
                });
            }
        };

        try {
            traverse(data, 'root', null);
            if (newNodes.length > 0) {
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
            }
        } catch (e) {
            console.warn("Graph update skipped:", e);
        }
    }, [setNodes, setEdges]);

    // --- 扩写逻辑 ---
    const handleExpandNode = async (parentId: string, parentLabel: string) => {
        // === 核心修改：权限拦截 ===
        if (tierRef.current === 'basic') {
            toast.error("无限扩写是 Pro 功能", {
                description: "免费版不支持 AI 节点扩写，请升级解锁。",
                action: {
                    label: "去升级",
                    onClick: () => onOpenPricing?.() // 调用弹窗
                }
            });
            return; // 直接返回，不发送请求
        }
        const toastId = toast.loading("正在思考...");
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                body: JSON.stringify({ prompt: parentLabel, mode: 'expand' }),
            });
            const data = await res.json();
            toast.dismiss(toastId);

            if (!data.children) return;

            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];

            data.children.forEach((child: any, index: number) => {
                const childId = `${parentId}-${Date.now()}-${index}`;
                newNodes.push({
                    id: childId,
                    data: { label: child.label, onExpand: handleExpandNode, onToggle: handleToggleNode },
                    position: { x: 0, y: 0 },
                    type: 'mindmap',
                });
                newEdges.push({
                    id: `e${parentId}-${childId}`,
                    source: parentId,
                    target: childId,
                    type: 'default',
                    animated: true,
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                });
            });

            const currentNodes = getNodes();
            const currentEdges = getEdges();

            const allNodes = [...currentNodes, ...newNodes];
            const allEdges = [...currentEdges, ...newEdges];

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(allNodes, allEdges);

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

            // 扩写成功后，通知 UserNav 组件重新拉取最新的积分
            window.dispatchEvent(new Event('user:refresh-credits'));

            setTimeout(() => window.requestAnimationFrame(() => fitView({ duration: 800 })), 100);

            // [NEW] 触发自动保存
            if (onAutoSave) {
                const treeData = buildTreeFromFlow(layoutedNodes, layoutedEdges);
                if (treeData) {
                    onAutoSave(treeData);
                }
            }

        } catch (error) {
            console.error(error);
            toast.error("扩写失败", { id: toastId });
        }
    };

    // --- 折叠/展开逻辑 ---
    const handleToggleNode = useCallback((nodeId: string) => {
        const node = getNodes().find((n) => n.id === nodeId);
        if (!node) return;

        const isCollapsed = node.data.isCollapsed || false;
        const shouldHide = !isCollapsed;

        const getChildNodeIds = (parentId: string, allEdges: Edge[]): string[] => {
            const childEdges = allEdges.filter((edge) => edge.source === parentId);
            const childIds = childEdges.map((edge) => edge.target);
            let grandChildIds: string[] = [];
            childIds.forEach(id => {
                grandChildIds = [...grandChildIds, ...getChildNodeIds(id, allEdges)];
            });
            return [...childIds, ...grandChildIds];
        };

        const currentEdges = getEdges();
        const childrenIds = getChildNodeIds(nodeId, currentEdges);

        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === nodeId) return { ...n, data: { ...n.data, isCollapsed: shouldHide } };
                if (childrenIds.includes(n.id)) return { ...n, hidden: shouldHide };
                return n;
            })
        );

        setEdges((eds) =>
            eds.map((e) => {
                if (childrenIds.includes(e.target)) return { ...e, hidden: shouldHide };
                return e;
            })
        );
    }, [getNodes, getEdges, setNodes, setEdges]);

    // --- 导出图片 ---
    const downloadImage = async () => {
        const nodes = getNodes();
        if (nodes.length === 0) return;

        const nodesBounds = getNodesBounds(nodes);
        const padding = 50;
        const imageWidth = nodesBounds.width + (padding * 2);
        const imageHeight = nodesBounds.height + (padding * 2);
        const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;

        if (viewportNode) {
            let watermarkContainer: HTMLElement | null = null;

            // === 核心修改：全屏倾斜水印 ===
            if (tierRef.current === 'basic') {
                watermarkContainer = document.createElement('div');
                // 容器：绝对定位，覆盖整个截图区域，禁止鼠标事件
                Object.assign(watermarkContainer.style, {
                    position: 'absolute',
                    top: `${-nodesBounds.y - 1000}px`, // 扩大范围覆盖，确保平移后也能覆盖到
                    left: `${-nodesBounds.x - 1000}px`,
                    width: `${imageWidth + 2000}px`,
                    height: `${imageHeight + 2000}px`,
                    zIndex: '9999',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    opacity: '0.4' // 整体透明度
                });

                // 生成足够多的水印文字 div
                const waterText = 'Synap Create Free';
                const count = 50; // 根据图的大小可能需要更多，这里生成 50 个试试
                let htmlContent = '';

                // 使用 grid 布局或者简单的重复 div
                for (let i = 0; i < count; i++) {
                    htmlContent += `
                        <div style="
                            transform: rotate(-45deg); 
                            font-size: 28px; 
                            color: #cbd5e1; 
                            font-weight: bold; 
                            font-family: sans-serif;
                            margin: 100px; 
                            white-space: nowrap;
                        ">
                            ${waterText}
                        </div>
                    `;
                }
                watermarkContainer.innerHTML = htmlContent;

                // 插入到 viewport
                viewportNode.appendChild(watermarkContainer);
            }

            try {
                const dataUrl = await toPng(viewportNode, {
                    backgroundColor: '#fff',
                    width: imageWidth,
                    height: imageHeight,
                    pixelRatio: 2,
                    style: {
                        width: `${imageWidth}px`,
                        height: `${imageHeight}px`,
                        transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px) scale(1)`,
                    },
                });

                const link = document.createElement('a');
                link.download = `Synap-${tierRef.current === 'basic' ? 'basic' : 'hd'}.png`;
                link.href = dataUrl;
                link.click();

            } catch (err) {
                console.error("Export failed", err);
                toast.error("导出失败");
            } finally {
                // 清理
                if (watermarkContainer && watermarkContainer.parentNode) {
                    watermarkContainer.parentNode.removeChild(watermarkContainer);
                }
            }
        }
    };

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        updateGraph,
        fitView,
        downloadImage,
        setNodes,
        setEdges
    };
}
