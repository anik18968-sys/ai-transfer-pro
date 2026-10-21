# ⚡ AI Transfer Pro (v19.1)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Browsers](https://img.shields.io/badge/Browsers-Chrome%20%7C%20Brave%20%7C%20Edge%20%7C%20Opera-orange?style=flat-square)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-None%20(100%25%20Native)-brightgreen?style=flat-square)

**AI Transfer Pro** is an ultra-lightweight, zero-dependency browser extension designed to seamlessly migrate your entire AI conversation context—including plain dialogue, separated programming code blocks, data tables, executive summaries, and **unlimited full-chat screenshots compiled into a multi-page PDF**—between **ChatGPT, Google Gemini, Claude, and DeepSeek** with a single click.

---

## ✨ Key Features & Architecture

- 📄 **Unlimited Full-Chat Screenshots to Native PDF:** Automatically streams and scrolls from top to bottom of any conversation (whether 2 pages or 100+ pages), hiding floating input bars, and compiling every screen slice plus structured text into a single `AI_Session_Transfer.pdf` via a pure native PDF 1.7 binary engine.
- 💻 **Smart Programming Code & Table Organizer:** Extracts all `<pre><code>` blocks, accurately detects programming languages (`HTML`, `CSS`, `JavaScript`, `Python`, `C++`, `JSON`, etc.), and formats them into dedicated Markdown sections alongside clean Markdown tables.
- 🧠 **Executive Explanation & Summary:** Appends a structured summary and intelligent session synthesis at the bottom of the transferred prompt so the destination AI immediately understands the project scope and continues seamlessly.
- 🛡️ **10-Second Smart Paste Watchdog & Auto-Upload:** Automatically attaches the generated multi-page PDF file and pastes the organized prompt into the target AI's editor (`ProseMirror`, `Quill`, or `textarea`), monitoring the input box for 10 seconds to guarantee zero data loss.
- 🎨 **Adaptive Chameleon UI & In-Page Mini HUD:** Automatically morphs its color palette to match the active AI platform (Gemini Aurora, ChatGPT Emerald, Claude Terracotta, or DeepSeek Ocean) with 0% idle CPU/RAM usage.
- 🔑 **Optional BYOK (Bring Your Own Key) Vision OCR:** Works out-of-the-box in **Basic Mode** without any API key. Users can optionally add their personal **Google Gemini API**, OpenAI, or OpenRouter key to unlock deep AI image OCR and prompt reconstruction.

---

## 🌐 Supported AI Platforms & Browsers

| AI Platforms | Supported Browsers |
| :--- | :--- |
| ✅ **ChatGPT** (`chatgpt.com`) | ✅ **Google Chrome** |
| ✅ **Google Gemini** (`gemini.google.com`) | ✅ **Brave Browser** (Shields Compatible) |
| ✅ **Claude** (`claude.ai`) | ✅ **Microsoft Edge** |
| ✅ **DeepSeek** (`chat.deepseek.com`) | ✅ **Opera / Vivaldi / Arc** (All Chromium Browsers) |

---

## 🚀 Installation Guide (Developer Mode)

1. **Download or Clone this Repository:**
   - Click the green **`<> Code`** button on GitHub and select **Download ZIP** (or clone via Git: `git clone https://github.com/anik1896-sys/ai-transfer-pro.git`).
   - Extract the ZIP file to a folder on your computer.
2. **Open Browser Extensions Page:**
   - **Chrome:** Navigate to `chrome://extensions/`
   - **Brave:** Navigate to `brave://extensions/`
   - **Edge:** Navigate to `edge://extensions/`
3. **Enable Developer Mode:**
   - Toggle on **Developer mode** in the top-right corner.
4. **Load the Extension:**
   - Click **Load unpacked** in the top-left corner and select the extracted `AI_Transfer_Pro` folder.

---

## 📖 How to Use

1. Open any conversation on **ChatGPT**, **Google Gemini**, **Claude**, or **DeepSeek**.
2. Click the **AI Transfer Pro** icon in your browser toolbar (or click the minimalist floating pill at the bottom-right corner of the webpage).
3. Click the destination AI platform you want to switch to.
4. The extension will automatically:
   - Stream-scroll and capture the entire chat into an unlimited multi-page PDF (`AI_Session_Transfer.pdf`),
   - Organize all text, code blocks, tables, and executive summary,
   - Open the destination AI tab, attach the PDF, and paste the organized context into the chat box.
5. Simply press **Enter**!

---

## 📁 Project Structure

```text
AI_Transfer_Pro/
├── manifest.json     # Manifest V3 configuration & security rules
├── background.js     # OffscreenCanvas matrix stitcher & Native PDF 1.7 binary builder
├── content.js        # C++ TreeWalker DOM scraper, Clean Capture Mode & 10s Paste Watchdog
├── popup.html        # Minimalist Adaptive Chameleon popup interface
├── popup.js          # Instant platform detection & settings controller
├── styles.css        # Native adaptive theme variables (Gemini, ChatGPT, Claude, DeepSeek)
└── README.md         # Professional project documentation
