import type { Config } from "tailwindcss";

const config = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            // 1. 这里是手动定义的动画（可选，如果你想用 animate-fade-in 这种原生写法）
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                // 👇 手动加的 fade-in 关键帧
                "fade-in": {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                // 👇 注册成 utility class: animate-fade-in
                "fade-in": "fade-in 0.5s ease-out",
            },
        },
    },
    plugins: [
        // 2. 👇 确保这里引入了 tailwindcss-animate 插件
        // 这行代码让你可以使用 'animate-in fade-in duration-500' 这种组合写法
        require("tailwindcss-animate"),
    ],
} satisfies Config;

export default config;