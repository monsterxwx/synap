"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // <--- 核心修改：直接引入 toast 函数
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (type: 'login' | 'signup') => {
        setLoading(true);
        try {
            const { error } = type === 'login'
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });

            if (error) throw error;

            if (type === 'signup') {
                // 成功提示
                toast.success("注册成功！", {
                    description: "请前往邮箱点击验证链接。",
                });
            } else {
                toast.success("登录成功");
                router.push("/");
                router.refresh();
            }
        } catch (e: any) {
            // 错误提示
            toast.error("操作失败", {
                description: e.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'github') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo: `${location.origin}/auth/callback` },
            });
            if (error) throw error;
        } catch (e: any) {
            toast.error("OAuth 登录失败", { description: e.message });
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md space-y-4 p-8 bg-white rounded-xl shadow-lg border">
                <h1 className="text-2xl font-bold text-center">登录 Synap</h1>
                <div className="space-y-2">
                    <Input
                        type="email"
                        placeholder="邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => handleLogin('login')} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "登录"}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => handleLogin('signup')} disabled={loading}>
                        注册
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">Or</span></div>
                </div>

                <Button variant="secondary" className="w-full" onClick={() => handleOAuth('google')}>
                    Continue with Google
                </Button>
            </div>
        </div>
    );
}