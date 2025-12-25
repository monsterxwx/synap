'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { ReactFlow, Controls, Background, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { PricingModal } from '@/components/PricingModal';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getMindMaps, saveMindMap, getMindMapById } from '@/app/actions/mindmap';
import MindMapNode from '@/components/MindMapNode';
import { MindMapInput } from '@/components/MindMapInput';
import { useMindMapState } from '@/hooks/useMindMapState';

const nodeTypes = { mindmap: MindMapNode };
const NodeSchema = z.object({
  label: z.string().optional(),
  children: z.array(z.lazy(() => NodeSchema)).optional(),
});

interface MindMapBoardProps {
  initialMapId: string | null;
  onSaveSuccess: () => void;
}

function MindMapBoard({ initialMapId, onSaveSuccess }: MindMapBoardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentMapId, setCurrentMapId] = useState<string | null>(initialMapId);

  // [NEW] 定义自动保存回调
  // 这个回调会被 useMindMapState 在扩写完成后调用
  const handleAutoSave = useCallback(async (newContent: any) => {
    if (!currentMapId) return;
    try {
      await saveMindMap({
        id: currentMapId,
        content: newContent,
        title: newContent.label || '思维导图'
      });
      // 可以选择不提示，或者只提示一个小小的 "已保存"
      // toast.success("内容已更新"); 
    } catch (e) {
      console.error("Auto save failed:", e);
      toast.error("自动保存失败");
    }
  }, [currentMapId]);

  // [MODIFIED] 将回调传入 Hook
  const {
    nodes, edges, onNodesChange, onEdgesChange,
    updateGraph, fitView, downloadImage,
    setNodes, setEdges
  } = useMindMapState(handleAutoSave);

  const [hasGenerated, setHasGenerated] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const [isMapLoading, setIsMapLoading] = useState(!!initialMapId);

  // --- 1. 加载/重置逻辑 ---
  useEffect(() => {
    let ignore = false;
    // A. 新建模式
    if (!initialMapId) {
      if (!ignore) {
        setCurrentMapId(null);
        setHasGenerated(false);
        setInputValue("");
        setSelectedFile(null);
        setNodes([]);
        setEdges([]);
        setIsMapLoading(false);
      }
      return;
    }

    // B. 历史模式
    const loadMap = async () => {
      try {
        const data = await getMindMapById(initialMapId);
        if (!ignore && data && data.content) {
          setCurrentMapId(data.id);
          setTimeout(() => {
            if (!ignore) {
              updateGraph(data.content);
              setHasGenerated(true);
              setIsMapLoading(false);
              window.requestAnimationFrame(() => fitView({ duration: 0 }));
            }
          }, 50);
        } else if (!ignore && !data) {
          toast.error("未找到该导图");
          setIsMapLoading(false);
        }
      } catch (e) {
        if (!ignore) {
          console.error("加载失败", e);
          toast.error("加载导图失败");
          setIsMapLoading(false);
        }
      }
    };
    loadMap();
    return () => { ignore = true; };
  }, [initialMapId]);

  // --- 2. AI 生成与保存逻辑 ---
  const { object: partialMindMap, submit, isLoading: isAiLoading } = useObject({
    api: '/api/generate',
    schema: NodeSchema,
    onFinish: async ({ object }) => {
      if (object) {
        updateGraph(object);
        setTimeout(() => fitView({ duration: 800 }), 200);
        try {
          const title = object.label || object.children?.[0]?.label || '新思维导图';
          const savedMap = await saveMindMap({
            id: currentMapId || undefined,
            content: object,
            title
          });

          if (savedMap) {
            if (!currentMapId || currentMapId !== savedMap.id) {
              setCurrentMapId(savedMap.id);
              setTimeout(() => {
                router.replace(`/?id=${savedMap.id}`, { scroll: false });
              }, 100);
            }
            toast.success(currentMapId ? "更新已保存" : "已自动保存");
            onSaveSuccess();
          }
        } catch (err) {
          console.error("保存失败", err);
        }
      }
    },
    onError: () => toast.error("生成中断")
  });

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (partialMindMap && Object.keys(partialMindMap).length > 0) {
      if (!hasGenerated) setHasGenerated(true);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        updateGraph(partialMindMap);
      }, 50);
    }
  }, [partialMindMap, hasGenerated, updateGraph]);

  const handleGenerate = async () => {
    // 1. 登录检查
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("请先登录", {
        description: "生成思维导图需要登录账户",
        action: {
          label: "去登录",
          onClick: () => router.push('/login')
        }
      });
      // 稍微延迟跳转，让用户看到 toast
      setTimeout(() => router.push('/login'), 1000);
      return;
    }

    let finalPrompt = inputValue;
    if (selectedFile) {
      finalPrompt = `文件：${selectedFile.name}\n内容：\n${selectedFile.content}\n要求：${inputValue}`;
    }
    submit({ prompt: finalPrompt, mode: 'create' });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("文件过大 (Max 10MB)");
    setIsParsing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/parse-file', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedFile({ name: file.name, content: data.text });
      toast.success(`已解析 ${file.name}`);
    } catch {
      toast.error("文件解析失败");
    } finally {
      setIsParsing(false);
    }
  };

  if (isMapLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-white rounded-[12]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p>正在加载导图...</p>
        </div>
      </div>
    );
  }

  if (!hasGenerated && !isAiLoading) {
    return (
      <MindMapInput
        inputValue={inputValue}
        setInputValue={setInputValue}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        isParsing={isParsing}
        isAiLoading={isAiLoading}
        handleFileSelect={handleFileSelect}
        onGenerate={handleGenerate}
      />
    );
  }

  return (
    <div className="w-full h-full relative bg-white rounded-[12]">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="outline" className="bg-white shadow-sm" onClick={downloadImage}>下载全图</Button>
      </div>
      {isAiLoading && (
        <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur border shadow-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm text-blue-600 animate-in slide-in-from-top-2">
          <Loader2 size={16} className="animate-spin" />
          <span>AI 正在思考...</span>
        </div>
      )}
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        fitView
      >
        <Background gap={20} color="#e2e8f0" />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function MainContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mapId = searchParams.get('id');
  const [resetVersion, setResetVersion] = useState(0);
  const supabase = createClient();
  const [history, setHistory] = useState<any[]>([]);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    const data = await getMindMaps();
    setHistory(data);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // 1. 清空历史
        setHistory([]);
        // 2. 强制重置 Board
        setResetVersion(v => v + 1);
        // 3. 回到首页
        router.replace('/');
      } else if (event === 'SIGNED_IN') {
        // 登录后刷新历史
        fetchHistory();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, fetchHistory]);

  const handleNewChat = () => {
    router.push('/');
    setResetVersion(v => v + 1);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#edf0f2] overflow-hidden">
      <AppHeader onUpgradeClick={() => setIsPricingOpen(true)} />
      <div className="flex gap-2 flex-1 overflow-hidden p-4 pt-0!">
        <div className="hidden md:block">
          <AppSidebar onNewChat={handleNewChat} history={history} />
        </div>
        <main className="flex-1 relative">
          <ReactFlowProvider>
            <MindMapBoard
              key={mapId ? `map-${mapId}` : `new-${resetVersion}`}
              initialMapId={mapId}
              onSaveSuccess={fetchHistory}
            />
          </ReactFlowProvider>
        </main>
      </div>
      <PricingModal open={isPricingOpen} onOpenChange={setIsPricingOpen} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <MainContent />
    </Suspense>
  );
}
