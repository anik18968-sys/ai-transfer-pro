const activePdfSessions = new Map();

const CLEAN_PLATFORM_URLS = {
  chatgpt: "https://" + "chatgpt.com",
  gemini: "https://" + "gemini.google.com",
  claude: "https://" + "claude.ai",
  deepseek: "https://" + "chat.deepseek.com"
};

// Bulletproof URL Sanitizer: strips any accidental Markdown [url](url) brackets so ERR_FILE_NOT_FOUND never happens!
function resolveCleanTargetUrl(targetId, rawUrl) {
  if (targetId && CLEAN_PLATFORM_URLS[targetId]) {
    return CLEAN_PLATFORM_URLS[targetId];
  }
  const str = String(rawUrl || "").trim();
  const match = str.match(/https?:\/\/[^\s\]\)]+/i);
  if (match) {
    return match[0];
  }
  return CLEAN_PLATFORM_URLS.chatgpt;
}

function captureViewportTurbo(windowId) {
  return new Promise((resolve) => {
    const targetWinId = typeof windowId === "number" ? windowId : chrome.windows.WINDOW_ID_CURRENT;
    let attempts = 0;

    const tryCapture = () => {
      attempts++;
      chrome.tabs.captureVisibleTab(
        targetWinId,
        { format: "jpeg", quality: 86 },
        (dataUrl) => {
          if (!chrome.runtime.lastError && dataUrl) {
            resolve(dataUrl);
          } else if (attempts < 6) {
            setTimeout(tryCapture, 200);
          } else {
            resolve(null);
          }
        }
      );
    };

    tryCapture();
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result || null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function blobToUint8Array(blob) {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

async function renderTextDocumentToJpegPages(fullDocumentText) {
  const PAGE_W = 1240;
  const PAGE_H = 1754;
  const MARGIN = 60;
  const MAX_TEXT_W = PAGE_W - MARGIN * 2;
  const LINE_H = 28;

  const rawLines = (fullDocumentText || "").split("\n");
  const wrappedLines = [];

  const measureCanvas = new OffscreenCanvas(100, 100);
  const mCtx = measureCanvas.getContext("2d");
  mCtx.font = "18px sans-serif";

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line.trim()) {
      wrappedLines.push("");
      continue;
    }

    const words = line.split(" ");
    let currentLine = "";

    for (let w = 0; w < words.length; w++) {
      const testLine = currentLine ? currentLine + " " + words[w] : words[w];
      if (mCtx.measureText(testLine).width > MAX_TEXT_W && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = words[w];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  const linesPerPage = Math.floor((PAGE_H - MARGIN * 2) / LINE_H);
  const totalDocPages = Math.min(80, Math.ceil(wrappedLines.length / linesPerPage));
  const docPages = [];

  for (let p = 0; p < totalDocPages; p++) {
    const canvas = new OffscreenCanvas(PAGE_W, PAGE_H);
    const ctx = canvas.getContext("2d", { alpha: false });

    ctx.fillStyle = "#121316";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, PAGE_W, 42);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(
      `AI TRANSFER PRO — ORGANIZED TEXT, CODE & SUMMARY (DOC PAGE ${p + 1} OF ${totalDocPages})`,
      MARGIN,
      26
    );

    const startIdx = p * linesPerPage;
    const pageLines = wrappedLines.slice(startIdx, startIdx + linesPerPage);

    let y = MARGIN + 25;
    for (let l = 0; l < pageLines.length; l++) {
      const txt = pageLines[l];
      if (txt.startsWith("# ") || txt.startsWith("## ")) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 20px sans-serif";
      } else if (txt.startsWith("### ") || txt.startsWith("```")) {
        ctx.fillStyle = "#34d399";
        ctx.font = "bold 17px monospace";
      } else {
        ctx.fillStyle = "#f1f5f9";
        ctx.font = "17px sans-serif";
      }
      ctx.fillText(txt, MARGIN, y);
      y += LINE_H;
    }

    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.84 });
    const bytes = await blobToUint8Array(blob);
    docPages.push({
      bytes: bytes,
      width: PAGE_W,
      height: PAGE_H,
      textChunk: pageLines.join("\n")
    });

    canvas.width = 0;
    canvas.height = 0;
  }

  return docPages;
}

function buildMultiPagePdfBlob(allPages) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let currentByteOffset = 0;

  function pushString(str) {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentByteOffset += bytes.byteLength;
  }

  function pushBytes(uint8) {
    chunks.push(uint8);
    currentByteOffset += uint8.byteLength;
  }

  function startObj(id) {
    offsets[id] = currentByteOffset;
    pushString(`${id} 0 obj\n`);
  }

  function endObj() {
    pushString(`\nendobj\n`);
  }

  pushString("%PDF-1.7\n%\xFF\xFF\xFF\xFF\n");

  startObj(1);
  pushString("<< /Type /Catalog /Pages 2 0 R >>");
  endObj();

  const fontObjId = 3;
  const firstPageObjId = 4;
  const pageCount = allPages.length;
  const kidsRefs = [];

  for (let i = 0; i < pageCount; i++) {
    kidsRefs.push(`${firstPageObjId + i * 3} 0 R`);
  }

  startObj(2);
  pushString(`<< /Type /Pages /Kids [ ${kidsRefs.join(" ")} ] /Count ${pageCount} >>`);
  endObj();

  startObj(fontObjId);
  pushString("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  endObj();

  for (let i = 0; i < pageCount; i++) {
    const p = allPages[i];
    const pageObjId = firstPageObjId + i * 3;
    const contentObjId = pageObjId + 1;
    const imgObjId = pageObjId + 2;

    const pdfW = 595;
    const pdfH = Math.max(200, Math.round((p.height / p.width) * pdfW));

    startObj(pageObjId);
    pushString(
      `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${pdfW} ${pdfH} ] /Resources << /XObject << /Im0 ${imgObjId} 0 R >> /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );
    endObj();

    let streamCommands = `q\n${pdfW} 0 0 ${pdfH} 0 0 cm\n/Im0 Do\nQ\n`;
    if (p.textChunk) {
      const safeAscii = p.textChunk
        .replace(/[^\x20-\x7E\n]/g, " ")
        .split("\n")
        .slice(0, 45)
        .map((line) => line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"))
        .join(") Tj T* (");

      if (safeAscii.length > 0) {
        streamCommands += `BT\n3 Tr\n/F1 8 Tf\n12 TL\n20 ${pdfH - 20} Td\n(${safeAscii}) Tj\nET\n`;
      }
    }

    const streamBytes = encoder.encode(streamCommands);
    startObj(contentObjId);
    pushString(`<< /Length ${streamBytes.byteLength} >>\nstream\n`);
    pushBytes(streamBytes);
    pushString(`\nendstream`);
    endObj();

    startObj(imgObjId);
    pushString(
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.byteLength} >>\nstream\n`
    );
    pushBytes(p.bytes);
    pushString(`\nendstream`);
    endObj();
  }

  const totalObjects = firstPageObjId + pageCount * 3;
  const xrefOffset = currentByteOffset;
  pushString(`xref\n0 ${totalObjects}\n`);
  pushString(`0000000000 65535 f \n`);

  for (let id = 1; id < totalObjects; id++) {
    const offStr = String(offsets[id] || 0).padStart(10, "0");
    pushString(`${offStr} 00000 n \n`);
  }

  pushString(
    `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return new Blob(chunks, { type: "application/pdf" });
}

async function analyzeSingleImageWithAPI(base64Data, provider, apiKey) {
  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const promptText =
    "Analyze this image thoroughly for AI context transfer. Provide in one detailed paragraph: 1) All visible text (OCR), 2) Complete visual layout, colors, and objects, 3) A precise generation prompt to recreate it.";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7500);

  try {
    const apiBase = "https://" + "[generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent)";
    const reqBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }
          ]
        }
      ]
    };

    const res = await fetch(`${apiBase}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
      signal: controller.signal
    });

    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/\n+/g, " ").trim() || "";
    }
  } catch (e) {
    clearTimeout(timer);
  }
  return "";
}

async function generateDeepSessionExplanation(rawPayload, analyzedImages, apiKey, provider) {
  const wordCount = rawPayload.chatText ? rawPayload.chatText.split(/\s+/).length : 0;
  const codeCount = rawPayload.codeBlocks ? rawPayload.codeBlocks.length : 0;
  const imgCount = analyzedImages ? analyzedImages.length : 0;

  const firstLines = (rawPayload.chatText || "")
    .split("\n")
    .filter((l) => l.trim().length > 20)
    .slice(0, 4)
    .join(" | ");
  const lastLines = (rawPayload.chatText || "")
    .split("\n")
    .filter((l) => l.trim().length > 20)
    .slice(-5)
    .join(" | ");

  if (apiKey && apiKey.trim().length > 6 && provider !== "openai") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    try {
      const sampleContext = (rawPayload.chatText || "").slice(-6000);
      const apiBase = "https://" + "[generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent)";
      const reqBody = {
        contents: [
          {
            parts: [
              {
                text: `Provide a comprehensive, well-structured Executive Explanation & Summary of this AI session so the next AI can continue immediately. Include: 1) Core Goal & Project Overview, 2) Key Technical/Code Decisions & Files Discussed, 3) Visual & Media Context, and 4) Exact Next Step where the user left off.\n\nSession Title: ${rawPayload.title}\nRecent Conversation:\n${sampleContext}`
              }
            ]
          }
        ]
      };
      const res = await fetch(`${apiBase}?key=${encodeURIComponent(apiKey.trim())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const aiSummary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (aiSummary) return aiSummary;
      }
    } catch (e) {
      clearTimeout(timer);
    }
  }

  const langList =
    rawPayload.codeBlocks && rawPayload.codeBlocks.length > 0
      ? Array.from(new Set(rawPayload.codeBlocks.map((c) => c.lang.toUpperCase()))).join(", ")
      : "None";

  return [
    `1. **Project & Session Overview:** This session ("${rawPayload.title}") contains ~${wordCount} words of conversation, ${codeCount} separated programming code blocks (Languages: ${langList}), and ${imgCount} visual items.`,
    `2. **Complete Visual & PDF Context:** An unlimited multi-page PDF file ("AI_Session_Transfer.pdf") has been generated and attached containing every full-screen screenshot from top to bottom plus all organized text and code.`,
    `3. **How the Session Started:** ${firstLines || "User initiated a technical/creative workflow."}`,
    `4. **Latest Context (Where the Previous AI Stopped):** ${lastLines || "Awaiting next user instruction."}`,
    `5. **Directive for Current AI:** Read the attached Multi-Page PDF, the Organized Text, the Separated Programming Code Blocks, and this Summary, then continue assisting the user from the exact point where the previous AI stopped.`
  ].join("\n");
}

async function processUpTo100ImagesParallel(images, apiKey, provider) {
  if (!images || images.length === 0) return [];
  const hasProKey = Boolean(apiKey && apiKey.trim().length > 6);
  const fullList = images.slice(0, 100);
  const results = new Array(fullList.length);

  const CONCURRENCY = 10;
  for (let i = 0; i < fullList.length; i += CONCURRENCY) {
    const batch = fullList.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (img, bIdx) => {
        const realIdx = i + bIdx;
        let details = "";
        if (hasProKey && img.base64 && realIdx < 18) {
          details = await analyzeSingleImageWithAPI(img.base64, provider || "gemini", apiKey.trim());
        }
        if (!details) {
          details = `Visual Element ("${img.alt}") | Resolution: ${img.dimensions} | Embedded in attached PDF`;
        }
        results[realIdx] = {
          number: `Image #${realIdx + 1}`,
          origin: img.originType,
          dimensions: img.dimensions,
          details: details
        };
      })
    );
  }

  return results;
}

function buildOrganizedSessionDocument(rawPayload, analyzedImages, explanationSummary, totalPdfScreenshotPages) {
  const out = [];
  out.push("# AI SESSION COMPLETE TRANSFER & ORGANIZED CONTEXT");
  out.push(`**Source Title:** ${rawPayload.title}`);
  out.push(`**Source URL:** ${rawPayload.url}`);
  out.push(`**Attached PDF Document:** AI_Session_Transfer.pdf (${totalPdfScreenshotPages} Full-Screen Screenshot Pages + Complete Text/Code Archive)`);
  out.push("==================================================\n");

  out.push("## 1. ORGANIZED CONVERSATION DIALOGUE & TEXT\n");
  out.push(rawPayload.chatText || "No plain text recorded.");
  out.push("\n==================================================\n");

  if (rawPayload.codeBlocks && rawPayload.codeBlocks.length > 0) {
    out.push(`## 2. ORGANIZED PROGRAMMING LANGUAGE CODE BLOCKS (${rawPayload.codeBlocks.length} Files/Snippets)\n`);
    rawPayload.codeBlocks.forEach((cb, idx) => {
      const langTitle = (cb.lang || "code").toUpperCase();
      out.push(`### [Code Block #${idx + 1} — Language: ${langTitle}]`);
      out.push("```" + (cb.lang || "code"));
      out.push(cb.code);
      out.push("```\n");
    });
    out.push("==================================================\n");
  }

  if (rawPayload.tables && rawPayload.tables.length > 0) {
    out.push(`## 3. ORGANIZED DATA TABLES (${rawPayload.tables.length})\n`);
    rawPayload.tables.forEach((tbl, idx) => {
      out.push(`### Table #${idx + 1}:\n${tbl}\n`);
    });
    out.push("==================================================\n");
  }

  if (analyzedImages && analyzedImages.length > 0) {
    out.push(`## 4. VISUAL & IMAGE EXPLANATION (${analyzedImages.length} Items)\n`);
    out.push("| Image # | Type | Resolution | Visual Explanation, OCR Text & Reconstruction Details |");
    out.push("| :--- | :--- | :--- | :--- |");
    analyzedImages.forEach((item) => {
      const safeText = item.details.replace(/\|/g, "\\|");
      out.push(`| **${item.number}** | ${item.origin} | ${item.dimensions} | ${safeText} |`);
    });
    out.push("\n==================================================\n");
  }

  out.push("## 5. COMPREHENSIVE EXPLANATION & EXECUTIVE SUMMARY");
  out.push(explanationSummary);
  out.push("\n==================================================");
  out.push("[System Instruction: The complete multi-page PDF ('AI_Session_Transfer.pdf') is attached and the organized text, separated programming code blocks, and full summary are provided above. Continue assisting the user seamlessly.]");

  return out.join("\n");
}

async function cropSliceToJpegPage(sliceBlob, session, syPx, shPx) {
  const bmp = await createImageBitmap(sliceBlob);
  const dpr = bmp.width / session.windowInnerWidth;

  const cropLeftPx = Math.max(0, Math.round(session.cropLeftCss * dpr));
  const cropWidthPx = Math.max(200, Math.min(bmp.width - cropLeftPx, Math.round(session.cropWidthCss * dpr)));
  const safeSyPx = Math.max(0, Math.min(bmp.height - 10, syPx));
  const safeShPx = Math.max(10, Math.min(bmp.height - safeSyPx, shPx));

  const canvas = new OffscreenCanvas(cropWidthPx, safeShPx);
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = session.bgColor || "#161618";
  ctx.fillRect(0, 0, cropWidthPx, safeShPx);
  ctx.drawImage(bmp, cropLeftPx, safeSyPx, cropWidthPx, safeShPx, 0, 0, cropWidthPx, safeShPx);
  bmp.close();

  const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  const bytes = await blobToUint8Array(outBlob);
  canvas.width = 0;
  canvas.height = 0;

  return {
    bytes: bytes,
    width: cropWidthPx,
    height: safeShPx,
    textChunk: ""
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = request.tabId || (sender.tab ? sender.tab.id : 0);
  const winId = sender.tab ? sender.tab.windowId : chrome.windows.WINDOW_ID_CURRENT;

  if (request.action === "initUnlimitedPdfSession") {
    activePdfSessions.delete(tabId);
    activePdfSessions.set(tabId, {
      cropLeftCss: request.cropLeftCss,
      cropTopCss: request.cropTopCss,
      cropWidthCss: request.cropWidthCss,
      cropHeightCss: request.cropHeightCss,
      windowInnerWidth: request.windowInnerWidth,
      bgColor: request.bgColor || "#161618",
      sourceDpr: null,
      coveredUpToCss: 0,
      pdfScreenshotPages: []
    });
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === "captureAndAppendPdfPage") {
    (async () => {
      const session = activePdfSessions.get(tabId);
      if (!session) {
        sendResponse({ ok: false });
        return;
      }

      try {
        const dataUrl = await captureViewportTurbo(winId);
        if (!dataUrl) {
          sendResponse({ ok: false });
          return;
        }

        const res = await fetch(dataUrl);
        const blob = await res.blob();

        if (!session.sourceDpr) {
          const tempBmp = await createImageBitmap(blob);
          session.sourceDpr = tempBmp.width / session.windowInnerWidth;
          tempBmp.close();
        }

        const dpr = session.sourceDpr;
        const sliceStartCss = request.scrollY;
        const sliceEndCss = sliceStartCss + session.cropHeightCss;

        if (session.pdfScreenshotPages.length === 0) {
          const syPx = Math.round(session.cropTopCss * dpr);
          const shPx = Math.round(session.cropHeightCss * dpr);
          const pageObj = await cropSliceToJpegPage(blob, session, syPx, shPx);
          session.pdfScreenshotPages.push(pageObj);
          session.coveredUpToCss = sliceEndCss;
        } else {
          const overlapCss = Math.max(0, session.coveredUpToCss - sliceStartCss);
          const newContentCss = session.cropHeightCss - overlapCss;

          if (newContentCss > 4) {
            const syPx = Math.round((session.cropTopCss + overlapCss) * dpr);
            const shPx = Math.round(newContentCss * dpr);
            const pageObj = await cropSliceToJpegPage(blob, session, syPx, shPx);
            session.pdfScreenshotPages.push(pageObj);
            session.coveredUpToCss = sliceEndCss;
          }
        }

        sendResponse({ ok: true, pageCount: session.pdfScreenshotPages.length });
      } catch (err) {
        sendResponse({ ok: false, error: err.toString() });
      }
    })();
    return true;
  }

  if (request.action === "finalizeUnlimitedPdfAndTransfer") {
    chrome.storage.local.get(["userApiKey", "apiProvider"], async (cfg) => {
      try {
        const apiKey = cfg.userApiKey || "";
        const provider = cfg.apiProvider || "gemini";
        const session = activePdfSessions.get(tabId);
        const screenshotPages = session ? session.pdfScreenshotPages : [];

        const analyzedImages = await processUpTo100ImagesParallel(
          request.rawPayload.images,
          apiKey,
          provider
        );

        const explanationSummary = await generateDeepSessionExplanation(
          request.rawPayload,
          analyzedImages,
          apiKey,
          provider
        );

        const fullOrganizedDocument = buildOrganizedSessionDocument(
          request.rawPayload,
          analyzedImages,
          explanationSummary,
          screenshotPages.length
        );

        const textDocPages = await renderTextDocumentToJpegPages(fullOrganizedDocument);
        const allPdfPages = [...screenshotPages, ...textDocPages];

        let pdfDataUrl = null;
        if (allPdfPages.length > 0) {
          const pdfBlob = buildMultiPagePdfBlob(allPdfPages);
          pdfDataUrl = await blobToDataURL(pdfBlob);
        }

        activePdfSessions.delete(tabId);

        const cleanDestinationUrl = resolveCleanTargetUrl(request.targetId, request.targetUrl);

        chrome.storage.local.set(
          {
            pendingTransfer: {
              text: fullOrganizedDocument,
              expectedMinLength: Math.min(200, Math.max(25, Math.floor(fullOrganizedDocument.length * 0.1))),
              pdfDataUrl: pdfDataUrl,
              pdfPageCount: allPdfPages.length,
              timestamp: Date.now()
            }
          },
          () => {
            chrome.tabs.create({ url: cleanDestinationUrl, active: true });
            sendResponse({ success: true });
          }
        );
      } catch (err) {
        activePdfSessions.delete(tabId);
        sendResponse({ success: false, error: err.toString() });
      }
    });
    return true;
  }

  if (request.action === "startBackgroundTransferJob") {
    const targetTabId = request.tabId || (sender.tab ? sender.tab.id : null);
    if (!targetTabId) {
      sendResponse({ started: false });
      return true;
    }

    const cleanDestinationUrl = resolveCleanTargetUrl(request.targetId, request.targetUrl);

    chrome.scripting.executeScript(
      {
        target: { tabId: targetTabId },
        files: ["content.js"]
      },
      () => {
        chrome.tabs.sendMessage(targetTabId, {
          action: "runInPageFullCaptureAndTransfer",
          targetId: request.targetId,
          targetUrl: cleanDestinationUrl,
          targetName: request.targetName,
          captureFullShot: request.captureFullShot
        });
      }
    );
    sendResponse({ started: true });
    return true;
  }
});