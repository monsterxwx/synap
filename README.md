<div align="center">

# 🧠 AI Synap SaaS

<!-- Language Switcher -->
**English** | [简体中文](./README_CN.md)

<!-- Banner Image -->
<img src="public/banner-placeholder.gif" alt="Project Banner" width="100%">

</div>

# 🧠 AI Synap SaaS - Next-Gen Thinking Tool

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

![DeepSeek](https://img.shields.io/badge/DeepSeek-API-blueviolet?style=for-the-badge&logo=openai&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

</div>

> **A production-ready, AI-powered mind mapping platform built with Next.js 15, DeepSeek, and ReactFlow.**
>
> *Benchmarking industry leaders like Mapify, featuring real-time streaming generation, infinite node expansion, and a complete commercialization loop.*

![Project Banner](public/1.png)

![Project Banner](public/2.png)

## ✨ Project Overview

This project is a full-stack **AI SaaS application** that transforms unstructured text, PDFs, and Word documents into structured, interactive mind maps instantly.

Unlike simple wrappers, this project implements a highly customized **streaming graph engine** that renders nodes in real-time as the AI "thinks", solving complex layout stability issues. It includes a robust **credit-based monetization system** integrated with Stripe and Supabase, supporting tiered subscriptions (Free/Pro/Unlimited).

<details>
<summary>💳 点击查看测试信用卡信息 (Test Cards for Stripe)</summary>

<br>

> **💳 Payment Testing Instructions:**
>
> *   This project is currently in **Stripe Test Mode** (Sandbox).
> *   Please **DO NOT** use a real credit card.
> *   **Test Card Number:** `4242 4242 4242 4242`
> *   **Expiration Date:** Any future date (e.g., 12/30)
> *   **CVC:** Any 3 digits (e.g., 123)

</details>

## 🚀 Key Features

### 🎨 Core Experience
*   **Stream-to-Graph Rendering:** Utilizes `Vercel AI SDK` + `useObject` to render nodes incrementally without canvas flickering.
*   **Infinite AI Expansion:** Users can click any node to recursively generate child nodes, enabling limitless brainstorming sessions.
*   **Smart Layout Engine:** Custom DAGRE-based algorithm with dynamic width/height calculation based on text content.
*   **Multi-Modal Input:** Supports direct text input and file parsing (PDF/DOCX/TXT up to 10MB) via `pdf2json` and `mammoth`.

### 💰 Commercialization & SaaS Features
*   **Tiered Subscription System:**
    *   **Basic:** Free trial, limited credits, watermarked exports.
    *   **Pro:** High limits, HD export, infinite expansion.
    *   **Unlimited:** Uncapped usage for power users.
*   **Dynamic Credit System:** "Pay-as-you-go" logic based on input character count (fair usage policy), securing API costs.
*   **Secure Payments:** Full Stripe integration (Checkout & Webhooks) with automated credit top-ups and monthly resets.
*   **Real-time UI Sync:** UI updates instantly upon payment or usage via Supabase Realtime subscriptions and custom Event dispatchers.

### 🛠️ User Interface
*   **High-Performance Canvas:** Built on `@xyflow/react` (ReactFlow v12), capable of handling hundreds of nodes.
*   **Export Options:** HD PNG download with dynamic watermarking logic for free users.
*   **Responsive Design:** Mobile-friendly sidebar, pricing modals, and interactive controls using `Shadcn/UI`.

## 🏗️ Tech Stack

| Category            | Technologies                                          |
| :------------------ | :---------------------------------------------------- |
| **Framework**       | Next.js 15 (App Router), TypeScript, React 19         |
| **Styling**         | Tailwind CSS, Shadcn/UI, Lucide React, Framer Motion  |
| **AI & LLM**        | DeepSeek V3 API, Vercel AI SDK (@ai-sdk/react)        |
| **Visualization**   | ReactFlow v12, Dagre (Graph Layout), html-to-image    |
| **Backend & Auth**  | Supabase (PostgreSQL, Auth, Realtime), Edge Functions |
| **Payments**        | Stripe API, Stripe Webhooks                           |
| **File Processing** | pdf2json, mammoth.js                                  |

## 💡 Technical Highlights & Challenges Solved

### 1. DeepSeek JSON Mode Compatibility
**Challenge:** The upstream API had strict mode incompatibilities with standard SDKs, leading to JSON parsing errors during streaming.
**Solution:** Implemented a custom `fetch` interceptor layer that forcibly injects JSON schemas and system prompts, ensuring 100% valid JSON output for the graph parser.

```typescript
// Code Snippet: Custom Interceptor
const deepseek = createOpenAI({
  // ...
  fetch: async (url, options) => {
    // Inject JSON instructions to system prompt dynamically
    // Force response_format to json_object
    // ...
  }
});
```

### 2. State Management for Infinite Expansion
**Challenge:** Accessing the latest user subscription tier inside the ReactFlow closure (hooks) was causing "stale state" issues (e.g., users upgraded to Pro but still got blocked).
**Solution:** Utilized `useRef` + `useEffect` synchronization pattern within custom hooks to ensure the expansion logic always accesses the real-time `userTier` status without unnecessary re-renders.

### 3. Dynamic & Fair Billing Logic
**Challenge:** Charging a fixed rate for variable input sizes (e.g., 1 sentence vs. 10MB PDF) is unfair and risky.
**Solution:** Designed a pre-generation calculation algorithm: `Cost = Base Fee + (CharCount / 500)`. The frontend estimates cost for UX, while the backend strictly enforces the deduction before API calls to prevent abuse.

### 4. Real-time Credit Synchronization
**Challenge:** Updating the UI immediately after a background webhook event (payment success) or an AI generation.
**Solution:** Implemented a "Double Insurance" strategy:
1.  **Supabase Realtime:** Subscribes to database changes for cross-device sync.
2.  **Custom Events:** `window.dispatchEvent('user:refresh-credits')` for instant client-side feedback after actions.

## 🗄️ Database Schema (Supabase)

The project uses a robust PostgreSQL schema handling users and subscriptions:

*   **`profiles`**: Stores credits, tier ('basic'/'pro'/'unlimited'), stripe IDs, billing cycles, and last reset dates.
*   **`mind_maps`**: Stores the JSON structure of graphs, linked to users for history retrieval.
*   **Auth Triggers**: Automatically initializes user profiles with default credits upon registration.

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/monsterxwx/synap.git
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file with the following keys:
    ```
    DEEPSEEK_API_KEY=
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
    STRIPE_SECRET_KEY=
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    STRIPE_WEBHOOK_SECRET=
    SUPABASE_SERVICE_ROLE_KEY=
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```


## 🤝 Contact & Hire Me

I am a Full-Stack Developer specializing in building complex, AI-driven web applications. I have extensive experience in:
*   **Next.js / React Ecosystem**
*   **LLM Integration (DeepSeek, OpenAI, Claude)**
*   **SaaS Architecture & Payment Integration**

If you are looking for a developer to build your next MVP or scale your product, feel free to reach out.

*   **Email:** [623989195@qq.com]
*   **Portfolio:** [https://monsterxwx.github.io/blog/]


---