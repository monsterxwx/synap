'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiers = [
    {
        name: 'Basic',
        description: '适合偶尔使用的个人用户体验 AI 导图。',
        credits: '500',
        originalPrice: '0',
        yearlyPrice: '0',
        monthlyPrice: '0',
        buttonText: '当前版本',
        buttonVariant: 'secondary',
        popular: false,
        features: [
            '每月 500 点 AI 积分',
            '文本一键生成思维导图',
            '支持 PDF/Word 文件解析 (限 2MB)',
            '基础图片导出 (带水印)',
        ],
    },
    {
        name: 'Pro',
        description: '解锁无限扩写与大文件处理能力。',
        credits: '3000',
        originalPrice: '9.90',
        yearlyPrice: '5.90',
        monthlyPrice: '9.90',
        buttonText: '开启 7 天免费试用',
        subButtonText: '或 立即升级',
        buttonVariant: 'primary',
        popular: true,
        badge: '最推荐',
        features: [
            '每月 3000 点 AI 积分',
            'AI 智能无限节点扩写',
            '支持 10MB 大文件深度解析',
            '优先使用流式极速通道',
            '高清无水印图片导出',
        ],
        highlightFeatures: true,
    },
    {
        name: 'Unlimited',
        description: '为重度思维导图用户打造的终极方案。',
        credits: '无限',
        originalPrice: '19.90',
        yearlyPrice: '12.90',
        monthlyPrice: '19.90',
        buttonText: '获取无限访问',
        subButtonText: '或 立即购买',
        buttonVariant: 'primary',
        popular: false,
        badge: '生产力首选',
        badgeColor: 'indigo',
        features: [
            '无限量 AI 生成积分',
            '无限量文件上传解析',
            '优先体验 GPT-4o 等高级模型',
            '专属功能定制反馈',
            '加入核心用户社群',
        ],
        highlightFeatures: true,
        featureTitle: 'Pro 的所有权益，外加：',
    },
];

interface PricingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
    const [isYearly, setIsYearly] = useState(true);

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="sm:max-w-[1100px] max-w-[1100px] w-full gap-0! p-0 overflow-hidden bg-[#ebf1ff] rounded-3xl border-0 shadow-2xl flex flex-col max-h-[90vh]">
                {/* ============ 在这里插入关闭按钮 ============ */}
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute right-3 top-3 z-50 p-2 rounded-full bg-slate-100/50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all backdrop-blur-sm"
                >
                    <X size={18} />
                </button>
                {/* ========================================= */}
                {/* 顶部区域：标题与开关 */}
                <div className="text-center pt-10  z-10 px-4">
                    <DialogTitle className="text-3xl font-extrabold text-slate-900 mb-4 text-center">
                        立即升级
                    </DialogTitle>

                    {/* Toggle 开关 (修复版) */}
                    <div className="flex items-center justify-center">
                        {/* 使用 grid grid-cols-2 强制左右等宽 */}
                        <div
                            className="bg-[#d9deeb] p-1 rounded-xl grid grid-cols-2 relative cursor-pointer w-[240px] h-[46px]"
                            onClick={() => setIsYearly(!isYearly)}
                        >
                            {/* 滑块背景动画 */}
                            <div
                                className={cn(
                                    "absolute top-1 bottom-1 w-[calc(50%-6px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out z-0",
                                    isYearly ? "translate-x-[calc(100%+8px)] left-0" : "left-1"
                                )}
                            />

                            {/* 左侧：按月付费 */}
                            <div
                                className={cn(
                                    "relative z-10 flex items-center justify-center text-sm font-bold transition-colors duration-200",
                                    !isYearly ? "text-slate-900" : "text-slate-500"
                                )}
                            >
                                按月
                            </div>

                            {/* 右侧：按年订阅 */}
                            <div
                                className={cn(
                                    "relative z-10 flex items-center justify-center text-sm font-bold transition-colors duration-200 gap-1.5",
                                    isYearly ? "text-slate-900" : "text-slate-500"
                                )}
                            >
                                按年
                                <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded-full border border-orange-200 leading-none">
                                    省 40%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 滚动区域：卡片列表 */}
                {/* 修复点：增加 pt-12 (3rem) 给上浮的卡片和Badge留出空间 */}
                <div className="overflow-hidden px-4 md:px-10 pb-10 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-12 pb-8">
                        {tiers.map((tier) => (
                            <div
                                key={tier.name}
                                className={cn(
                                    "relative rounded-2xl p-6 transition-all duration-200 flex flex-col h-full",
                                    tier.popular
                                        ? "border-2 border-blue-600 shadow-xl shadow-blue-100 z-10 scale-100 md:scale-105 bg-white ring-4 ring-blue-50/50"
                                        : "border border-slate-200 bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-slate-100"
                                )}
                            >
                                {/* 顶部 Badge (修复：确切的居中定位) */}
                                {tier.badge && (
                                    <div className={cn(
                                        "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-md whitespace-nowrap z-20",
                                        tier.popular ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-indigo-500"
                                    )}>
                                        <Sparkles size={12} fill="currentColor" />
                                        {tier.badge}
                                    </div>
                                )}

                                {/* 标题 */}
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                                <p className="text-slate-500 text-sm min-h-[40px] leading-relaxed">{tier.description}</p>

                                {/* 价格 */}
                                <div className="mb-6">
                                    {tier.monthlyPrice !== '0' ? (
                                        <>
                                            {isYearly && (
                                                <div className="flex items-center gap-2 mb-1 animate-in fade-in">
                                                    <span className="text-slate-400 line-through text-sm">US${tier.originalPrice}</span>
                                                </div>
                                            )}
                                            <div className="flex items-end gap-1">
                                                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                                    US${isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                                                </span>
                                                <span className="text-slate-500 mb-1 text-sm font-medium">/ 月</span>
                                            </div>
                                            {isYearly && <p className="text-slate-400 text-xs mt-1 font-medium">按年一次性扣费 US${(parseFloat(tier.yearlyPrice) * 12).toFixed(1)}</p>}
                                        </>
                                    ) : (
                                        <div className="flex items-end gap-1 h-[52px]">
                                            <span className="text-4xl font-extrabold text-slate-900 tracking-tight">免费</span>
                                        </div>
                                    )}
                                </div>

                                {/* 按钮 */}
                                <div className="space-y-3 mb-8">
                                    <Button
                                        className={cn(
                                            "w-full py-6 rounded-xl font-bold text-base transition-all",
                                            tier.buttonVariant === 'primary'
                                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300"
                                                : "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200"
                                        )}
                                    >
                                        {tier.buttonText}
                                    </Button>
                                    {tier.subButtonText && (
                                        <div className="text-center h-5">
                                            <button className="text-xs text-slate-400 hover:text-blue-600 hover:underline transition-colors">
                                                {tier.subButtonText}
                                            </button>
                                        </div>
                                    )}
                                    {!tier.subButtonText && <div className="h-5" />}
                                </div>

                                {/* 功能列表 */}
                                <div className="border-t border-slate-100 pt-6 flex-1">
                                    {tier.highlightFeatures && (
                                        <p className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <Zap size={14} className="text-orange-500" fill="currentColor" />
                                            {tier.featureTitle || 'Basic 权益，外加：'}
                                        </p>
                                    )}
                                    <ul className="space-y-3">
                                        {tier.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-slate-600 leading-tight group">
                                                <div className="mt-0.5 min-w-[16px]">
                                                    <Check size={16} className={cn("text-blue-600", tier.name === 'Starter' && "text-slate-400")} strokeWidth={3} />
                                                </div>
                                                <span className="group-hover:text-slate-900 transition-colors">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}