import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';

// 基础尺寸配置
const NODE_MAX_WIDTH = 300;  // 必须和 CSS 里的 max-w-[300px] 对应
const NODE_BASE_HEIGHT = 50; // 单行文本的基础高度
const LINE_HEIGHT = 24;      // 每一行文字大概占用的高度
const CHARS_PER_LINE = 20;   // 估算：大概每 20 个字会换一行 (取决于字体大小)

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: 'LR',
        nodesep: 50,  // 垂直间距
        ranksep: 100, // 水平间距
        ranker: 'network-simplex'
    });

    nodes.forEach((node) => {
        const label = (node.data.label as string) || '';

        // --- 核心算法：智能计算节点尺寸 ---

        // 1. 估算宽度：如果字少，宽度就小；如果字多，最大也就是 NODE_MAX_WIDTH
        // (假设平均每个中文字符宽 14px，padding 左右各 16px)
        const estimatedWidth = Math.max(100, Math.min(NODE_MAX_WIDTH, label.length * 15 + 32));

        // 2. 估算高度：看文字需要几行
        // Math.ceil(总字数 / 每行字数) = 行数
        // 但为了保险，我们稍微算多一点点
        const lines = Math.ceil(label.length / CHARS_PER_LINE);
        const estimatedHeight = NODE_BASE_HEIGHT + (lines - 1) * LINE_HEIGHT;

        // 告诉 Dagre 这个节点的真实胖瘦
        dagreGraph.setNode(node.id, {
            width: estimatedWidth,
            height: estimatedHeight
        });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // 重新获取我们在上面计算出的宽高，确保中心点偏移正确
        const w = nodeWithPosition.width;
        const h = nodeWithPosition.height;

        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
                // Dagre 给的是中心点坐标，ReactFlow 需要左上角坐标
                // 所以要减去宽高的一半
                x: nodeWithPosition.x - w / 2,
                y: nodeWithPosition.y - h / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};