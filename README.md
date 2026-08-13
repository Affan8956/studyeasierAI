<div align="center">

# 🎓 StudyEasierAI

**Your all-in-one AI-powered study companion — summarize, quiz, tutor, research, and track your progress.**

Built with React 19, TypeScript, Vite, the Google Gemini API, and Supabase.

</div>

---

## Overview

StudyEasierAI turns raw study material — lecture recordings, PDFs, notes, or images — into structured, usable study assets. It converts content into summaries, flashcards, quizzes, and slide decks, provides an AI tutor and live voice study sessions, and tracks your study habits with an analytics dashboard and AI coach.

Authentication and cloud sync are powered by Supabase, with an IndexedDB-backed local database for offline-friendly storage of chats, assets, and study sessions.

## Features

| Module | Description |
|---|---|
| 🔬 **Knowledge Lab** | Upload a PDF, document, or lecture recording and generate a bundled package: a written summary, a multiple-choice quiz, flashcards, and a slide deck — all from one source. |
| 💬 **Smart Chat & Tutor** | Multi-mode AI chat (`study`, `coding`, `tutor`, `research`, `live`) with persistent, searchable chat history. |
| 🎙️ **Live Study** | Real-time, voice-based study sessions using Gemini's native audio live model — talk through a topic like a live tutoring session. |
| 🌍 **Deep Research** | Ask a research question and get an AI-synthesized answer grounded in web search results, with source citations. |
| 👁️ **Vision Analysis** | Upload an image (e.g. a diagram, handwritten notes, or a textbook page) for AI analysis, or generate new study images from a prompt. |
| ⏱️ **Focus Studio** | A study timer/session tracker supporting focus, deep study, revision, break, and custom/stopwatch modes. |
| 📊 **Analytics & AI Coach** | Visualizes study habits — daily focus vs. lifetime stats, streaks, and burnout risk — and includes an AI coach that diagnoses patterns and builds a personalized weekly schedule. |
| 🗄️ **Vault** | Persistent storage for every generated asset (summaries, quizzes, flashcards, slides, research, image analyses), with support for sharing content with other users. |
| 🎨 **Theming** | Multiple built-in themes (default, light, eyecare, midnight, forest) plus a fully custom color theme. |

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 6
- **AI:** [`@google/genai`](https://www.npmjs.com/package/@google/genai) — Gemini 3 Pro / Flash (text & reasoning), Gemini 2.5 Flash Image (image generation), Gemini 2.5 Flash Native Audio (live voice sessions), Gemini grounded search (deep research)
- **Backend / Auth:** [Supabase](https://supabase.com) (`@supabase/supabase-js`) for authentication, user profiles, and content sharing
- **Local storage:** IndexedDB (via a small custom wrapper in `services/db.ts`) for chats, assets, and study sessions

## Project Structure

```
studyeasierAI-main/
├── App.tsx                    # Root component: view routing, session/state management
├── index.tsx                  # React entry point
├── index.html
├── types.ts                   # Shared TypeScript types/interfaces
├── metadata.json              # App metadata (name, description, permissions)
├── vite.config.ts             # Vite config (env var injection, dev server, path alias)
├── components/
│   ├── Dashboard.tsx          # Home dashboard
│   ├── Sidebar.tsx            # Main navigation + chat history
│   ├── ChatInterface.tsx      # Multi-mode AI chat
│   ├── LabPanel.tsx           # Knowledge Lab entry point (file/text upload)
│   ├── SummaryView.tsx        # Generated summary viewer
│   ├── QuizView.tsx           # Generated quiz viewer
│   ├── FlashcardView.tsx      # Generated flashcard viewer
│   ├── SlideView.tsx          # Generated slide deck viewer
│   ├── ResearchView.tsx       # Deep Research (grounded search)
│   ├── VisionPanel.tsx        # Image analysis & generation
│   ├── LiveInterface.tsx      # Live voice study sessions
│   ├── FocusStudio.tsx        # Study timer & session tracker
│   ├── AnalyticsView.tsx      # Analytics dashboard + AI coach
│   ├── Vault.tsx              # Saved assets + sharing
│   ├── TTSPlayer.tsx          # Text-to-speech playback
│   ├── ThemeSelector.tsx      # Theme picker
│   ├── AuthForm.tsx           # Login / signup / password reset
│   ├── FileUpload.tsx         # Reusable file upload widget
│   └── AboutView.tsx          # In-app feature guide
└── services/
    ├── geminiService.ts       # All Gemini API calls (coach, insights, lab content, research, vision, chat streaming)
    ├── authService.ts         # Supabase auth (login, signup, password reset/update, session)
    ├── supabaseClient.ts      # Supabase client initialization
    ├── db.ts                  # IndexedDB wrapper (local persistence)
    ├── historyService.ts      # Chat/asset/study-session CRUD (Supabase + local)
    └── sharingService.ts      # User search + content sharing requests
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- A **Google Gemini API key** — [get one here](https://aistudio.google.com/apikey)
- A **Supabase project** (URL + anon/publishable key) if you want authentication and cloud sync — [supabase.com](https://supabase.com)

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env.local` file in the project root:

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional — enables Supabase auth/cloud sync (falls back to a default project if omitted)
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_KEY=your_supabase_anon_key
   ```

   > `vite.config.ts` injects `GEMINI_API_KEY` into `process.env.API_KEY` / `process.env.GEMINI_API_KEY` at build time. `services/supabaseClient.ts` looks for `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` (and a few common alternate names) via `import.meta.env` or `process.env`.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000` by default.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build a production bundle |
| `npm run preview` | Preview the production build locally |

## Notes

- The app requests microphone access (declared in `metadata.json`) for the **Live Study** voice feature.
- If Supabase environment variables aren't set, the app falls back to a bundled default Supabase project — for a production deployment, set your own `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`.
- Study data, chats, and generated assets are cached locally in IndexedDB and synced to Supabase when signed in.
