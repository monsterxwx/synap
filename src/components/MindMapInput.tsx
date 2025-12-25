import { useRef } from 'react';
import { Loader2, ArrowRight, Lightbulb, Paperclip, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MindMapInputProps {
    inputValue: string;
    setInputValue: (val: string) => void;
    selectedFile: { name: string; content: string } | null;
    setSelectedFile: (file: { name: string; content: string } | null) => void;
    isParsing: boolean;
    isAiLoading: boolean;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGenerate: () => void;
}

export function MindMapInput({
    inputValue,
    setInputValue,
    selectedFile,
    setSelectedFile,
    isParsing,
    isAiLoading,
    handleFileSelect,
    onGenerate
}: MindMapInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onGenerate();
        }
    };

    const recommendedTopics = ['头脑风暴新产品创意', '制定在线课程学习计划', '月度预算规划'];

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

                {/* Input Card */}
                <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden relative group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <div className="relative">
                        <Textarea
                            placeholder={selectedFile ? "您可以补充指令..." : "请输入你的问题或话题，或者上传文件..."}
                            className="w-full min-h-[140px] max-h-[300px] overflow-y-auto resize-none border-none shadow-none focus-visible:ring-0 text-lg p-5 bg-transparent text-slate-700 placeholder:text-slate-400"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {selectedFile && (
                        <div className="px-5 pb-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="inline-flex items-center gap-3 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 pl-3 pr-2 py-2 rounded-xl text-sm transition-colors group/file cursor-default">
                                <div className="bg-white p-1.5 rounded-lg shadow-sm text-blue-600"><FileText size={16} /></div>
                                <div className="flex flex-col">
                                    <span className="font-medium max-w-[200px] truncate text-xs sm:text-sm">{selectedFile.name}</span>
                                    <span className="text-[10px] text-slate-400">已解析文本</span>
                                </div>
                                <button onClick={() => setSelectedFile(null)} className="ml-2 p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-all">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer Toolbar */}
                    <div className="flex justify-between items-center px-4 py-3 bg-white border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.md,.txt" onChange={handleFileSelect} />
                            <Button
                                variant="ghost" size="sm" disabled={isParsing}
                                onClick={() => fileInputRef.current?.click()}
                                className={`text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-full px-3 py-2 h-auto gap-2 transition-all ${isParsing ? 'cursor-not-allowed opacity-70' : ''}`}
                            >
                                {isParsing ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <div className="bg-slate-100 p-1.5 rounded-md group-hover:bg-blue-100 transition-colors"><Paperclip size={16} className="text-slate-600 group-hover:text-blue-600" /></div>}
                                <span className="text-sm font-medium">{isParsing ? '正在解析...' : '添加附件'}</span>
                            </Button>
                        </div>

                        <Button
                            onClick={onGenerate}
                            disabled={(!inputValue.trim() && !selectedFile) || isParsing || isAiLoading}
                            className={`rounded-xl px-6 py-5 font-medium transition-all shadow-md hover:shadow-lg ${(!inputValue.trim() && !selectedFile) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200'}`}
                        >
                            {isAiLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : <>开始生成 <ArrowRight size={18} className="ml-2 opacity-80" /></>}
                        </Button>
                    </div>
                </div>

                {/* Recommended Topics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                    {recommendedTopics.map(text => (
                        <button
                            key={text}
                            onClick={() => { setInputValue(text); setTimeout(onGenerate, 0); }}
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
