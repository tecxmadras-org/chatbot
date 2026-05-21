# College Info AI — RAG-Powered Chatbot

An AI-powered web chatbot that answers student questions about colleges using documents (PDFs, Excel/CSV) stored in a GitHub repository. Built with Next.js, deployed on Vercel (free tier).

## ✨ Features

- **AI Chat Interface** — Mobile-first, streaming responses with source attribution
- **RAG Pipeline** — Answers strictly from uploaded college documents (no hallucination)
- **Admin Panel** — Upload, list, and delete documents via a protected dashboard
- **GitHub Storage** — All documents stored in your repo's `/docs/` folder
- **Swappable LLM** — Switch between Gemini, OpenAI, or Claude via env var
- **PWA Ready** — Installable on Android home screens
- **100% Free** — Runs on Vercel + GitHub free tiers

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/college-chatbot.git
cd college-chatbot
npm install
```

### 2. Configure Environment

Copy the example env file:
```bash
cp .env.example .env.local
```

Fill in your values in `.env.local`:
```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_OWNER=your-username
GITHUB_REPO=college-chatbot
GITHUB_DOCS_PATH=docs

# LLM (recommended: gemini for free tier)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key-here

# Admin
ADMIN_PASSWORD=your-secret-password
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the chat UI  
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin panel

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Student chat UI
│   ├── admin/page.tsx        # Admin upload panel
│   ├── layout.tsx            # Root layout with PWA meta
│   ├── globals.css           # Design system
│   └── api/
│       ├── chat/route.ts     # RAG + LLM streaming endpoint
│       └── admin/
│           ├── upload/route.ts
│           ├── list/route.ts
│           └── delete/route.ts
├── lib/
│   ├── github.ts             # GitHub API client
│   ├── parsers/
│   │   ├── pdf.ts            # PDF → text chunks
│   │   └── excel.ts          # Excel/CSV → text chunks
│   ├── retrieval.ts          # BM25 search engine
│   ├── llm/
│   │   ├── index.ts          # Provider switcher
│   │   ├── gemini.ts         # Google Gemini adapter
│   │   ├── openai.ts         # OpenAI adapter
│   │   └── anthropic.ts      # Claude adapter
│   └── prompts.ts            # System prompts
docs/                          # College documents (PDF, CSV, XLSX)
public/manifest.json           # PWA manifest
```

## 🤖 How the RAG Pipeline Works

1. Student types a question
2. API fetches all documents from GitHub `/docs/`
3. PDFs are parsed to text; CSVs/Excel are converted to labeled rows
4. Text is split into ~500-token chunks
5. BM25 keyword scoring ranks chunks by relevance
6. Top 6 chunks + question are sent to the LLM
7. LLM responds using ONLY the provided context
8. Response streams back with source attribution

## 🔧 LLM Providers

| Provider | Env Var | Model | Free Tier? |
|----------|---------|-------|------------|
| **Google Gemini** | `gemini` | gemini-2.0-flash | ✅ Yes |
| OpenAI | `openai` | gpt-4o-mini | 💲 Paid |
| Anthropic | `anthropic` | claude-sonnet-4 | 💲 Paid |

Set `LLM_PROVIDER` in your env to switch providers.

## 🚢 Deploy to Vercel

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add all environment variables in Project Settings
4. Deploy — it auto-deploys on every push

## 📱 PWA Installation (Android)

1. Visit your Vercel URL in Chrome
2. Tap the browser menu (⋮)
3. Select "Add to Home Screen"
4. The app opens full-screen like a native app

## 📄 License

MIT
