[README.md](https://github.com/user-attachments/files/26025222/README.md)
# 食宜 ShiYi — TCM-Inspired Smart Meal Advisor

> **HackMIT China Challenge 2026** · Team: Felix TSU

基于中医体质的个性化晚餐推荐应用。用户填写体质、饮食偏好，每天告知当日胃口，系统结合节气与 DeepSeek AI 生成完整菜单（主菜 + 配菜 + 主食 + 汤），并给出中医性味归经理由。

---

## Project Overview

**ShiYi** (食宜 — "what is fitting to eat") makes TCM dietary wisdom accessible and actionable. Instead of complex herbal theory, it delivers a practical, personalized dinner recommendation every day — powered by a real TCM ingredient database (271 items) and DeepSeek AI for dynamic text generation.

---

## Features

| Feature | Description |
|---|---|
| 🏮 9 TCM Constitutions | Full support: Balanced, Qi-Deficient, Yang-Deficient, Yin-Deficient, Phlegm-Damp, Damp-Heat, Blood-Stasis, Qi-Stagnation, Sensitive |
| 😋 Emoji Appetite Slider | Daily check-in with 5-level emoji scale (😞→😋), no sleep/body-temp questions |
| ⏱ Cooking Time Slider | 4-step range: 15 min / 30 min / 1 hour / Takeaway |
| 👤 Name & Avatar | Users set their own nickname and upload a personal photo |
| 📋 Menu History | All generated menus saved locally; tap ♡ to favorite; browse All / Saved tabs |
| 🌿 271-Ingredient TCM Database | Each ingredient annotated with Four Natures, Five Flavors, TCM function tags, and cold/heat/damp/oily/spicy scores |
| 📊 Rule-Based Pre-filtering | Ingredients filtered by constitution thresholds before passing to AI |
| 🤖 DeepSeek AI | Optional real-time generation via DeepSeek API. Works offline with built-in fallback |
| 🌏 Bilingual | Full Chinese / English toggle — UI, prompts, and fallback content all switch |
| 💾 Local-only storage | All user data stored in `localStorage` — no server, no accounts, no cloud |
| 🗓 Solar Term Awareness | Auto-detects current Chinese solar term (节气) and incorporates it into recommendations |

---

## File Structure

```
shiyi/
├── .env                  ← 填写 DeepSeek API Key（只改这一行）
├── server.js             ← Express 服务：托管静态文件 + 代理 DeepSeek API
├── package.json
├── 一步一步说明.txt
└── public/
    ├── index.html        ← 界面结构（加减页面元素在这里改）
    ├── style.css         ← 所有样式（改颜色、字体、间距在这里改）
    ├── app.js            ← 交互逻辑、Prompt 构建、结果渲染、历史记录
    └── data.js           ← TCM 食材库 + 体质规则库（改知识库只改这里）
```

---

## Installation & Running

```bash
# 1. 把 .env 文件复制到 shiyi/ 文件夹，填入 API Key：
#    DEEPSEEK_API_KEY=sk-xxxxxxxxxx

# 2. 进入文件夹
cd shiyi

# 3. 安装依赖
npm install

# 4. 启动
npm start
# → Server running at http://localhost:3001
```

打开浏览器访问 `http://localhost:3001`。

**修改文件后如何刷新：**
- 改 `public/` 里任意文件 → 直接刷新浏览器
- 改 `server.js` 或 `.env` → 终端 `Ctrl+C`，再重新 `npm start`

**无 API Key 也可使用：** 内置了阳虚质、阴虚质及通用体质的完整备用推荐，其余体质也有默认输出。

---

## How It Works

```
用户档案（体质、蛋白质偏好、忌口、做饭时间、昵称、头像）
        ↓
每日 Check-in（胃口 emoji 1–5）
        ↓
TCM 规则引擎
  - 从 271 种食材中按体质阈值（寒凉值/温热值/湿重值）过滤
  - 按胃口等级进一步过滤油腻食材
  - 抽取约 40 种多样性食材
        ↓
DeepSeek API Prompt
  - 包含：体质规则、筛选后食材、节气、今日状态
  - 返回结构化 JSON：主菜/配菜/主食/汤 + 中医理由 + 忌口提示 + 养生小贴士
        ↓
渲染菜单卡片 + 自动存入历史记录
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (ES2020) |
| Fonts | Google Fonts: Noto Serif SC, Noto Sans SC, EB Garamond |
| AI | DeepSeek Chat API (`/v1/chat/completions`) |
| Data | Embedded TCM ingredient database (271 items) |
| Storage | Browser `localStorage` (client-side only) |
| Dependencies | express, dotenv, node-fetch |

---

## TCM Knowledge Base

### Ingredient Database (`data.js`)

271 ingredients across 11 categories:
谷物 / 豆类 / 蔬菜 / 水果 / 肉类 / 海鲜 / 蛋乳 / 坚果 / 调味香料 / 饮品 / 甜品

Each ingredient carries:
- **四性** (Four Natures): 寒 / 凉 / 平 / 温 / 热
- **五味** (Five Flavors): 甘 / 辛 / 酸 / 苦 / 咸
- **功能标签**: e.g., 健脾和胃 / 清热利湿 / 补益助气血
- **数值评分 0–3**: 寒凉值 / 温热值 / 湿重值 / 油腻值 / 刺激值

### Constitution Rules (`data.js`)

| 体质 | 推荐方向 | 寒凉阈值 | 温热阈值 | 湿重阈值 |
|---|---|---|---|---|
| 平和质 | 中正平衡 | 3 | 3 | 3 |
| 阳虚质 | 温中助阳健脾 | 2 | 4 | 3 |
| 阴虚质 | 滋阴润燥 | 3 | 2 | 3 |
| 气虚质 | 补气健脾 | 3 | 3 | 3 |
| 痰湿质 | 健脾化湿 | 2 | 3 | 2 |
| 湿热质 | 清热利湿 | 2 | 2 | 2 |
| 血瘀质 | 活血行气 | 3 | 3 | 3 |
| 气郁质 | 疏肝理气 | 3 | 3 | 3 |
| 特禀质 | 以过敏规则优先 | — | — | — |

---

## Individual Contributions

| Member | Role |
|---|---|
| Felix TSU | Full-stack development, TCM knowledge base integration, UI/UX design, AI prompt engineering |

---

## Challenges

- **TCM 知识工程化**：将食材性味归经转化为可计算的数值评分，并与体质规则联动
- **结构化输出**：通过 Prompt 工程确保 DeepSeek 稳定返回合法 JSON，包含中医专业理由
- **双语架构**：UI 文案、AI Prompt、备用内容三套语言同步切换
- **纯前端状态管理**：历史记录、用户档案、头像均在浏览器端存储，无需后端数据库

---

## Accomplishments

- 完整的中医食材评分体系嵌入前端，实现规则驱动的预筛选
- AI Prompt 自然融合节气、体质规则、当日胃口和筛选食材
- 无 API Key 时完整可用，体验不降级
- 零前端依赖，单命令启动

---

## What We Learned

- 如何将领域知识（中医饮食原则）转化为工程可用的数据结构
- LLM Prompt 设计中结构化输出的稳定性技巧
- 双语 Prompt 设计：同一份用户档案在中英文下产出风格一致的推荐

---

## What's Next

- **舌苔拍照识别**：用视觉 AI 从舌苔颜色/苔质自动推断体质线索
- **一周多样性追踪**：确保 7 天内出现 ≥25 种不同食材（PRD 原始要求）
- **外卖平台对接**：将推荐菜品直接匹配美团/饿了么菜单，一键下单
- **更多健康维度**：结合睡眠、运动、月经周期做更精细的当日调整

---

## References

- 智能御膳房 PRD v1.0 (2026-03-15)
- 中医AI饮食推荐系统数据模板（含266食材）
- DeepSeek API: [platform.deepseek.com](https://platform.deepseek.com)
