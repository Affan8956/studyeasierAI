
# 🎓 StudyEasierAI

> **"Turn Raw Noise into Mastered Knowledge."**

![Status](https://img.shields.io/badge/Status-Hackathon_Ready-success)
![AI](https://img.shields.io/badge/AI-Google_Gemini-blue)
![Team](https://img.shields.io/badge/Team-RootOps-indigo)

**StudyEasierAI** is an autonomous academic intelligence engine designed to solve student burnout and information overload. It transforms raw educational chaos—audio lectures, dense PDFs, and YouTube videos—into structured mastery packages (Summaries, Quizzes, Slides) in seconds.

---

## 👥 Team [RootOps]

Built with ❤️ by:
1. **Affan Kumthe**
2. **Yogesh Sanap**
3. **Rohan Salunke**

---

## 🛑 The Problem
*   **Information Overload:** Students drown in hours of unstructured audio and PDF readings.
*   **Passive Consumption:** Traditional listening leads to low retention.
*   **Time Inefficiency:** Creating manual flashcards takes longer than studying.
*   **API Reliability:** Most AI wrappers crash under high load (429 Errors).

## 💡 The Solution
A **Unified Intelligence Engine** that uses a robust **Waterfall Fallback System** to ensure 100% uptime. It ingests multi-modal data and transmutes it into active recall artifacts.

---

## ✨ Key Features

### 1. 🧠 The Knowledge Lab
Single-pass generation of:
*   **Master Summaries:** Markdown formatted with LaTeX math support.
*   **Interactive Quizzes:** 10-question mastery checks with explanations.
*   **Visual Slides:** AI-generated presentation decks with speaker notes.

### 2. 🌊 Waterfall AI Architecture (Resiliency)
To prevent `429 Resource Exhausted` errors, we implemented an automatic failover strategy:
1.  **Tier 1:** `gemini-3-pro-preview` (Deep Reasoning)
2.  **Tier 2:** `gemini-2.5-flash` (High Speed / Rate Limit Backup)
3.  **Tier 3:** DeepSeek / OpenAI (External Emergency Backups)

### 3. 📂 Multi-Modal Ingestion
*   **PDF Documents:** Client-side parsing via `pdf.js`.
*   **Audio (MP3/WAV):** Direct audio binary analysis.
*   **YouTube:** Deep grounding via Google Search tools for transcripts.

### 4. 🔒 The Vault (Local-First)
*   **Offline Support:** Uses `IndexedDB` for instant access even without internet.
*   **Cloud Sync:** Background synchronization with **Supabase**.

---

## 🛠️ Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite 5, TypeScript |
| **Styling** | Tailwind CSS (Custom Dark Mode) |
| **AI Core** | Google GenAI SDK (`@google/genai`) |
| **Models** | Gemini 3 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Image |
| **Backend** | Supabase (Auth/DB), Firebase Hosting |
| **Utilities** | KaTeX, html2pdf.js, pdf.js |

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Google Gemini API Key
*   Supabase Project

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/study-easier-ai.git
    cd study-easier-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    # Required
    API_KEY=your_google_gemini_api_key

    # Optional (For Waterfall Backup)
    DEEPSEEK_API_KEY=your_deepseek_key
    OPENAI_API_KEY=your_openai_key
    ```

    *Note: Supabase configuration is handled internally in `services/supabaseClient.ts`.*

4.  **Run Locally**
    ```bash
    npm run start
    ```

---

## 📸 Screenshots

| Dashboard | Knowledge Lab |
| :---: | :---: |
| *Academic Workspace* | *Summary & Quiz Generation* |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Domain: Education Technology / Generative AI / Productivity*
