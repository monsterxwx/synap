'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow, Controls, Background, useNodesState, useEdgesState,
  Node, Edge, ReactFlowProvider, useReactFlow, getNodesBounds
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { Loader2, ArrowRight, Lightbulb, Paperclip, FileText, X } from 'lucide-react';
import { toast } from "sonner"
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getLayoutedElements } from '@/lib/layout';
import MindMapNode from '@/components/MindMapNode';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { PricingModal } from '@/components/PricingModal';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';

const nodeTypes = { mindmap: MindMapNode };

// Schema 定义
const NodeSchema = z.object({
  label: z.string().optional(),
  children: z.array(z.lazy(() => NodeSchema)).optional(),
});

function MindMapBoard({
  initialPrompt,
  resetTrigger
}: {
  initialPrompt: string,
  resetTrigger: () => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(initialPrompt);

  const { getNodes, getEdges, fitView } = useReactFlow();

  // --- 核心逻辑: AI SDK ---
  const {
    object: partialMindMap,
    submit,
    isLoading: isAiLoading,
  } = useObject({
    api: '/api/generate',
    schema: NodeSchema,
    onFinish: ({ object }) => {
      if (object) {
        updateGraph(object);
        setTimeout(() => fitView({ duration: 800 }), 200);
      }
    },
    onError: (err) => {
      console.error("生成出错:", err);
      toast.error("生成中断，但已保留现有进度");
    }
  });

  // --- 核心逻辑: 防抖与稳健图表更新 ---
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (partialMindMap && Object.keys(partialMindMap).length > 0) {
      if (!hasGenerated) setHasGenerated(true);

      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        updateGraph(partialMindMap);
      }, 50);
    }
  }, [partialMindMap, hasGenerated]);


  const updateGraph = (data: any) => {
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
          onExpand: onExpandNode,
          onToggle: onToggleNode
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
      console.warn("Graph update skipped due to parse error:", e);
    }
  };


  // --- 文件处理 ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件过大", {
        description: "请上传小于 10MB 的文件",
      })
      return;
    }
    const loadId = toast.loading("正在解析文件...");
    setIsParsing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-file', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("解析成功", { id: loadId, description: `已提取 ${file.name}` });
      setSelectedFile({ name: file.name, content: data.text });
    } catch (error) {
      toast.error("解析失败", {
        id: loadId,
        description: "请检查文件格式是否正确,支持 txt, md,docx, doc,pdf 格式",
      });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateClick = () => {
    if (!inputValue.trim() && !selectedFile) return;

    let finalPrompt = inputValue;
    if (selectedFile) {
      finalPrompt = `
        用户上传了文件：${selectedFile.name}
        文件内容如下：
        ----------------
        ${selectedFile.content}
        ----------------
        用户的额外要求：${inputValue || "请根据上述文件内容生成思维导图，总结核心观点。"}
        `;
    }
    submit({ prompt: finalPrompt, mode: 'create' });
  };


  // --- 扩写逻辑 ---
  const onExpandNode = async (parentId: string, parentLabel: string) => {
    if (isAiLoading) {
      toast.warning("请等待当前生成完毕");
      return;
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
          data: { label: child.label, onExpand: onExpandNode, onToggle: onToggleNode },
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

      setTimeout(() => window.requestAnimationFrame(() => fitView({ duration: 800 })), 100);

    } catch (error) {
      toast.error("扩写失败", { id: toastId });
    }
  };

  const onToggleNode = useCallback((nodeId: string) => {
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

  const downloadImage = () => {
    const nodes = getNodes();
    if (nodes.length === 0) return;
    const nodesBounds = getNodesBounds(nodes);
    const padding = 50;
    const imageWidth = nodesBounds.width + (padding * 2);
    const imageHeight = nodesBounds.height + (padding * 2);
    const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;

    if (viewportNode) {
      toPng(viewportNode, {
        backgroundColor: '#fff',
        width: imageWidth,
        height: imageHeight,
        pixelRatio: 2,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px) scale(1)`,
        },
      }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'mindmap-full.png';
        link.href = dataUrl;
        link.click();
      });
    }
  };

  // --- 1. 空状态 (UI 样式还原) ---
  if (!hasGenerated && !isAiLoading) {
    return (
      <div className="flex rounded-[12] flex-col items-center justify-center h-full w-full bg-white p-4 animate-in fade-in duration-500">
        <div className="max-w-2xl w-full flex flex-col items-center gap-8">

          {/* Slogan */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
              <Lightbulb className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">AI 生成思维导图</h1>
            <p className="text-slate-500">探索各类话题，激发新灵感。输入任何想法，一键生成。</p>
          </div>

          {/* --- 大输入卡片区域 --- */}
          <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden relative group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">

            {/* 1. 文本输入区域 */}
            <div className="relative">
              <Textarea
                placeholder={selectedFile ? "您可以补充指令，例如：'总结第三章内容'..." : "请输入你的问题或话题，或者上传文件..."}
                className="w-full min-h-[140px] max-h-[300px] overflow-y-auto resize-none border-none shadow-none focus-visible:ring-0 text-lg p-5 bg-transparent text-slate-700 placeholder:text-slate-400"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerateClick();
                  }
                }}
              />
            </div>

            {/* 2. 文件展示区域 (胶囊) */}
            {selectedFile && (
              <div className="px-5 pb-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="inline-flex items-center gap-3 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 pl-3 pr-2 py-2 rounded-xl text-sm transition-colors group/file cursor-default">
                  <div className="bg-white p-1.5 rounded-lg shadow-sm text-blue-600">
                    <FileText size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium max-w-[200px] truncate text-xs sm:text-sm">{selectedFile.name}</span>
                    <span className="text-[10px] text-slate-400">已解析文本</span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="ml-2 p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-all"
                    title="移除附件"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* 3. 底部工具栏 */}
            <div className="flex justify-between items-center px-4 py-3 bg-white border-t border-slate-100">

              {/* 左侧：工具区 */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.docx,.md,.txt"
                  onChange={handleFileSelect}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isParsing}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                      text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-full px-3 py-2 h-auto gap-2 transition-all
                      ${isParsing ? 'cursor-not-allowed opacity-70' : ''}
                    `}
                >
                  {isParsing ? (
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                  ) : (
                    <div className="bg-slate-100 p-1.5 rounded-md group-hover:bg-blue-100 transition-colors">
                      <Paperclip size={16} className="text-slate-600 group-hover:text-blue-600" />
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {isParsing ? '正在解析...' : '添加附件'}
                  </span>
                </Button>
              </div>

              {/* 右侧：生成按钮 */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerateClick}
                  disabled={(!inputValue.trim() && !selectedFile) || isParsing || isAiLoading}
                  className={`
                      rounded-xl px-6 py-5 font-medium transition-all shadow-md hover:shadow-lg
                      ${(!inputValue.trim() && !selectedFile)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200'
                    }
                    `}
                >
                  {isAiLoading ? (
                    <Loader2 size={18} className="animate-spin mr-2" />
                  ) : (
                    <>
                      开始生成 <ArrowRight size={18} className="ml-2 opacity-80" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 推荐话题 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {['头脑风暴新产品创意', '制定在线课程学习计划', '月度预算规划'].map(text => (
              <button
                key={text}
                onClick={() => {
                  setInputValue(text);
                  // 稍微延迟一下触发，让 input 状态先更新，体验更好
                  setTimeout(() => submit({ prompt: text, mode: 'create' }), 0);
                }}
                className="text-sm text-slate-600 bg-white border rounded-lg px-4 py-3 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm transition-all text-left flex items-center justify-between group"
              >
                {text}
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // --- 2. 生成后/加载中状态 (画布) ---
  return (
    <div className="w-full h-full relative bg-slate-50">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button variant="outline" className="bg-white shadow-sm" onClick={downloadImage}>
          下载全图
        </Button>
      </div>

      {isAiLoading && (
        <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur border shadow-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm text-blue-600 animate-in slide-in-from-top-2">
          <Loader2 size={16} className="animate-spin" />
          <span>AI 正在思考与生成...</span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background gap={20} color="#e2e8f0" />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function Home() {
  const [resetKey, setResetKey] = useState(0);

  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const handleNewChat = () => setResetKey(p => p + 1);

  return (
    <div className="flex h-screen w-full flex-col bg-[#edf0f2] overflow-hidden">
      <AppHeader onUpgradeClick={() => setIsPricingOpen(true)} />
      <div className="flex gap-2 flex-1 overflow-hidden p-4 pt-0!">
        <div className="hidden md:block">
          <AppSidebar onNewChat={handleNewChat} />
        </div>
        <main className="flex-1 relative">
          <ReactFlowProvider>
            <MindMapBoard key={resetKey} initialPrompt="" resetTrigger={handleNewChat} />
          </ReactFlowProvider>
        </main>
      </div>
      <PricingModal open={isPricingOpen} onOpenChange={setIsPricingOpen} />
    </div>
  );
}