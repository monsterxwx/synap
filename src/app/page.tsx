'use client';

import { useCallback, useState, useRef } from 'react';
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

// 引入新写的布局组件
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { LoadingOverlay } from '@/components/GenerateLoading';

const nodeTypes = { mindmap: MindMapNode };
let idCounter = 1;

// --- 逻辑核心组件 ---
function MindMapBoard({
  initialPrompt,
  resetTrigger
}: {
  initialPrompt: string,
  resetTrigger: () => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hasGenerated, setHasGenerated] = useState(false); // 控制是否生成过
  const [loading, setLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [isParsing, setIsParsing] = useState(false); // 文件解析中的 loading 状态
  const fileInputRef = useRef<HTMLInputElement>(null); // 隐藏的 input 引用

  // 这里的 input 是指如果用户想重新生成时的输入，或者初始输入
  const [inputValue, setInputValue] = useState(initialPrompt);

  const { getNodes, getEdges, fitView } = useReactFlow();

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB 校验
    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件过大", {
        description: "请上传小于 10MB 的文件",
      })
      return;
    }
    const loadId = toast.loading("正在解析文件..."); // 显示加载中
    setIsParsing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 调用刚才写的 API 解析文件
      const res = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      // 成功提示
      toast.success("解析成功", {
        id: loadId, // 这里传入 id，会自动把上面的“加载中”替换成“成功”
        description: `已提取 ${file.name} 的内容`,
      });
      // 保存文件名和解析出的文本内容
      setSelectedFile({
        name: file.name,
        content: data.text
      });
    } catch (error) {
      toast.error("解析失败", {
        id: loadId, // 替换加载 loading
        description: error.message || "请检查文件格式是否正确",
      });
    } finally {
      setIsParsing(false);
      // 清空 input，允许重复上传同名文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 修改 Generate 逻辑：把“用户输入”和“文件内容”拼在一起
  const handleGenerateClick = () => {
    // 如果既没有字，也没有文件，就不生成
    if (!inputValue.trim() && !selectedFile) return;

    let finalPrompt = inputValue;

    // 如果有文件，拼接到 prompt 里
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

    handleGenerate(finalPrompt);
  };

  const onExpandNode = async (parentId: string, parentLabel: string) => {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: parentLabel, mode: 'expand' }),
      });
      const data = await res.json();

      if (!data.children) return;

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      data.children.forEach((child: any, index: number) => {
        const childId = `${parentId}-${Date.now()}-${index}`;

        newNodes.push({
          id: childId,
          // 递归传递 onExpandNode，保证新节点也能继续扩写
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

      // 【修复核心代码】
      // 不要用 nodes 变量，而是用 getNodes() 获取当前最新的节点
      const currentNodes = getNodes();
      const currentEdges = getEdges();

      const allNodes = [...currentNodes, ...newNodes];
      const allEdges = [...currentEdges, ...newEdges];

      // 重新布局
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(allNodes, allEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      // 稍微延迟一下再缩放，等待渲染完成
      setTimeout(() => {
        window.requestAnimationFrame(() => fitView({ duration: 800 }));
      }, 100);

    } catch (error) {
      toast.error("扩写失败", {
        description: "AI 服务暂时不可用，请稍后再试",
      });
    }
  };

  const onToggleNode = useCallback((nodeId: string) => {
    // 1. 找到当前节点
    const node = getNodes().find((n) => n.id === nodeId);
    if (!node) return;

    // 获取当前状态（是要折叠还是展开？）
    const isCollapsed = node.data.isCollapsed || false;
    const shouldHide = !isCollapsed; // 如果当前没折叠，现在就要去隐藏子节点

    // 2. 递归查找所有子孙节点的 ID
    const getChildNodeIds = (parentId: string, allEdges: Edge[]): string[] => {
      // 找到所有从 parentId 出发的连线
      const childEdges = allEdges.filter((edge) => edge.source === parentId);
      // 拿到连线对面的节点 ID
      const childIds = childEdges.map((edge) => edge.target);

      // 递归找孙子
      let grandChildIds: string[] = [];
      childIds.forEach(id => {
        grandChildIds = [...grandChildIds, ...getChildNodeIds(id, allEdges)];
      });

      return [...childIds, ...grandChildIds];
    };

    const currentEdges = getEdges();
    const childrenIds = getChildNodeIds(nodeId, currentEdges);

    // 3. 更新所有节点状态
    setNodes((nds) =>
      nds.map((n) => {
        // 如果是当前点击的节点，更新它的 isCollapsed 图标状态
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, isCollapsed: shouldHide } };
        }
        // 如果是子孙节点，设置 hidden 属性
        if (childrenIds.includes(n.id)) {
          return { ...n, hidden: shouldHide };
        }
        return n;
      })
    );

    // 4. 更新连线状态 (连向被隐藏节点的线也要隐藏)
    setEdges((eds) =>
      eds.map((e) => {
        if (childrenIds.includes(e.target)) {
          return { ...e, hidden: shouldHide };
        }
        return e;
      })
    );

  }, [getNodes, getEdges, setNodes, setEdges]); // 依赖项

  const downloadImage = () => {
    // 1. 确保获取的是最新的节点数据
    // 注意：这里需要你上面 const { getNodes } = useReactFlow(); 已经取到了
    const nodes = getNodes();
    if (nodes.length === 0) return;

    // 2. 计算边界矩形 { x, y, width, height }
    const nodesBounds = getNodesBounds(nodes);

    // 3. 设置你想要的图片边距 (padding)
    const padding = 50;

    // 4. 计算图片的总宽高 (内容宽高 + 边距)
    const imageWidth = nodesBounds.width + (padding * 2);
    const imageHeight = nodesBounds.height + (padding * 2);

    // 5. 关键：找到 ReactFlow 内部存放节点和连线的那个 DOM 元素
    // 类名通常是 .react-flow__viewport
    const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;

    if (viewportNode) {
      toPng(viewportNode, {
        backgroundColor: '#fff',
        // 强制设置输出图片的宽高
        width: imageWidth,
        height: imageHeight,
        pixelRatio: 2,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          // 【核心魔法】在这里！
          // 逻辑：如果不移动，x=-500的内容会被截掉。
          // 所以我们要 translate( -nodesBounds.x + padding, -nodesBounds.y + padding )
          // 意思就是：把最左上角的那个点，移到 (padding, padding) 的位置
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px) scale(1)`,
        },
      })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = 'mindmap-full.png';
          link.href = dataUrl;
          link.click();
        })
        .catch((err) => {
          toast.error("导出失败", {
            description: "请稍后再试",
          });
        });
    }
  };

  // 核心生成逻辑 (做了微调，支持从外部传入 prompt)
  const handleGenerate = async (promptText: string) => {
    if (!promptText) return;
    setLoading(true);
    idCounter = 1;
    setHasGenerated(true); // 只要一开始生成，就切换界面

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: promptText }),
      });
      const data = await res.json();

      const transformDataToFlow = (data: any) => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        const traverse = (node: any, parentId: string | null) => {
          const currentId = `${idCounter++}`;

          nodes.push({
            id: currentId,
            data: {
              label: node.label,
              onExpand: onExpandNode, // 传递修复后的函数
              onToggle: onToggleNode
            },
            position: { x: 0, y: 0 },
            type: 'mindmap',
          });

          if (parentId) {
            edges.push({
              id: `e${parentId}-${currentId}`,
              source: parentId,
              target: currentId,
              type: 'default',
              animated: true,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
            });
          }

          if (node.children) {
            node.children.forEach((child: any) => traverse(child, currentId));
          }
        };

        traverse(data, null);
        return { nodes, edges };
      };

      const { nodes: rawNodes, edges: rawEdges } = transformDataToFlow(data);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      setTimeout(() => fitView({ duration: 800 }), 100);
    } catch (err) {
      toast.error("生成失败", {
        description: "AI 服务暂时不可用，请稍后再试",
      });
      setHasGenerated(false); // 失败了就退回输入界面
    } finally {
      setLoading(false);
    }
  };

  // 如果还没生成，显示类似 Mapify 的中间大输入框
  if (!hasGenerated && !loading) {
    return (
      <div className="flex  rounded-[12] flex-col items-center justify-center h-full w-full bg-white p-4 animate-in fade-in duration-500">
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
                // 【修改点】：增加 max-h-[300px] 和 overflow-y-auto 防止无限拉长
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
                  {/* 根据文件类型显示不同图标 */}
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

            {/* 3. 底部工具栏 (重构版) */}
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

                {/* 【修改点】：更现代的附件按钮，类似 Chat 工具栏 */}
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
                  disabled={(!inputValue.trim() && !selectedFile) || isParsing}
                  className={`
                      rounded-xl px-6 py-5 font-medium transition-all shadow-md hover:shadow-lg
                      ${(!inputValue.trim() && !selectedFile)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200'
                    }
                    `}
                >
                  {loading ? (
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
                  handleGenerate(text);
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

  // 如果正在加载或已经生成，显示画板
  return (
    <div className="w-full h-full relative bg-slate-50">
      {/* 顶部悬浮工具栏 (生成后显示的精简操作栏) */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button variant="outline" className="bg-white shadow-sm" onClick={downloadImage}>
          下载全图
        </Button>
      </div>

      {loading && <LoadingOverlay />}

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

// --- 页面入口 ---
export default function Home() {
  const [resetKey, setResetKey] = useState(0); // 用于重置组件状态

  const handleNewChat = () => {
    setResetKey(prev => prev + 1); // 强制重新渲染 MindMapBoard，回到初始状态
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#edf0f2] overflow-hidden">
      {/* 1. 顶部栏 */}
      <AppHeader />

      <div className="flex gap-2 flex-1 overflow-hidden p-4 pt-0!">
        {/* 2. 左侧栏 */}
        <div className="hidden md:block">
          <AppSidebar onNewChat={handleNewChat} />
        </div>

        {/* 3. 主区域 */}
        <main className="flex-1 relative">
          <ReactFlowProvider>
            {/* key 变化时，组件会销毁重建，实现“新建”效果 */}
            <MindMapBoard
              key={resetKey}
              initialPrompt=""
              resetTrigger={handleNewChat}
            />
          </ReactFlowProvider>
        </main>
      </div>
    </div>
  );
}