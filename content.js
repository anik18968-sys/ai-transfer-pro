(function () {
  const PLATFORM_MAP = {
    "chatgpt.com": { id: "chatgpt", name: "ChatGPT", accent: "#10a37f" },
    "gemini.google.com": { id: "gemini", name: "Google Gemini", accent: "#a8c7fa" },
    "claude.ai": { id: "claude", name: "Claude", accent: "#d97757" },
    "deepseek.com": { id: "deepseek", name: "DeepSeek", accent: "#4d6bfe" }
  };

  const SAFE_URLS = {
    chatgpt: "https://" + "chatgpt.com",
    gemini: "https://" + "gemini.google.com",
    claude: "https://" + "claude.ai",
    deepseek: "https://" + "chat.deepseek.com"
  };

  function detectCurrentPlatformInfo() {
    const host = window.location.hostname || "";
    for (const [domain, info] of Object.entries(PLATFORM_MAP)) {
      if (host.includes(domain)) return info;
    }
    return null;
  }

  function renderMinimalistSiteBar() {
    const pInfo = detectCurrentPlatformInfo();
    if (!pInfo) return;

    const oldBar = document.getElementById("ai-transfer-minimal-bar");
    if (oldBar) oldBar.remove();

    const pill = document.createElement("div");
    pill.id = "ai-transfer-minimal-bar";
    pill.style.cssText = `
      position: fixed;
      bottom: 12px;
      right: 18px;
      z-index: 2147483640;
      background: rgba(20, 20, 22, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      padding: 6px 13px;
      color: #e4e4e7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      user-select: none;
      transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.18s ease;
    `;
    pill.innerHTML = `
      <span style="width:6px;height:6px;border-radius:50%;background:${pInfo.accent};box-shadow:0 0 6px ${pInfo.accent};"></span>
      <span>${pInfo.name}</span>
    `;
    pill.onmouseenter = () => {
      pill.style.transform = "translateY(-1px)";
      pill.style.borderColor = pInfo.accent;
    };
    pill.onmouseleave = () => {
      pill.style.transform = "translateY(0)";
      pill.style.borderColor = "rgba(255, 255, 255, 0.14)";
    };
    pill.onclick = (e) => {
      e.stopPropagation();
      toggleMinimalSwitchModal();
    };
    document.body.appendChild(pill);
  }

  renderMinimalistSiteBar();

  if (window.__aiTransferProV191Loaded) return;
  window.__aiTransferProV191Loaded = true;

  async function dataURLtoPdfFileAsync(dataurl, filename) {
    try {
      const res = await fetch(dataurl);
      const blob = await res.blob();
      return new File([blob], filename, { type: "application/pdf" });
    } catch (e) {
      return null;
    }
  }

  function showMinimalToast(text) {
    let toast = document.getElementById("ai-transfer-minimal-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ai-transfer-minimal-toast";
      toast.style.cssText = `
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 2147483647;
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 10px;
        padding: 9px 14px;
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = text;
  }

  function removeMinimalToast() {
    const toast = document.getElementById("ai-transfer-minimal-toast");
    if (toast) toast.remove();
  }

  function showPdfReadyFloatingPill(pdfDataUrl, pdfPageCount, statusText) {
    let pill = document.getElementById("ai-transfer-pdf-pill");
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "ai-transfer-pdf-pill";
      pill.style.cssText = `
        position: fixed;
        bottom: 48px;
        right: 18px;
        z-index: 2147483645;
        background: rgba(20, 20, 22, 0.92);
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 12px;
        padding: 8px 12px;
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      `;
      document.body.appendChild(pill);
    }

    pill.innerHTML = `
      <div>
        <div style="font-weight:600;color:#38bdf8;">📄 ${statusText || `PDF Attached (${pdfPageCount} Pages)`}</div>
        <div style="font-size:10px;color:#a1a1aa;margin-top:2px;">Screenshots + Code + Summary • Press Enter</div>
      </div>
      <a href="${pdfDataUrl}" download="AI_Session_Transfer_${Date.now()}.pdf" style="background:#38bdf8;color:#090d16;padding:5px 9px;border-radius:6px;text-decoration:none;font-weight:600;font-size:10px;">Download PDF</a>
      <button id="closePdfPillBtn" style="background:transparent;border:none;color:#a1a1aa;cursor:pointer;font-size:12px;">✕</button>
    `;

    const closeBtn = document.getElementById("closePdfPillBtn");
    if (closeBtn) closeBtn.onclick = () => pill.remove();
  }

  function getLiveChatInputElement() {
    return (
      document.querySelector("#prompt-textarea") ||
      document.querySelector("rich-textarea .ql-editor") ||
      document.querySelector(".ql-editor") ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector("textarea#chat-input") ||
      document.querySelector("textarea")
    );
  }

  function isTextPresentInEditor(inputField, expectedMinLen) {
    if (!inputField) return false;
    const raw =
      inputField.tagName.toLowerCase() === "textarea"
        ? inputField.value || ""
        : inputField.textContent || "";
    return raw.trim().length >= (expectedMinLen || 25);
  }

  function forceNativeTextPaste(inputField, text) {
    if (!inputField) return false;
    inputField.focus();

    if (inputField.tagName.toLowerCase() === "textarea") {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(inputField, text);
      } else {
        inputField.value = text;
      }
      inputField.dispatchEvent(new Event("input", { bubbles: true }));
      inputField.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      inputField.dispatchEvent(pasteEvent);
    } catch (e) {}

    if (!isTextPresentInEditor(inputField, 25)) {
      const p = document.createElement("p");
      p.textContent = text;
      inputField.innerHTML = "";
      inputField.appendChild(p);
      inputField.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
      inputField.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return isTextPresentInEditor(inputField, 20);
  }

  function inspectFileUploadStatus(inputField) {
    const composerRoot =
      inputField?.closest(
        'form, fieldset, .input-area-container, rich-textarea, [class*="composer"], [class*="input-area"], [class*="chat-input"]'
      ) ||
      inputField?.parentElement?.parentElement?.parentElement ||
      document.body;

    const composerText = composerRoot.textContent || "";
    const hasServerUploadBanner =
      composerText.includes("trouble processing uploads") ||
      composerText.includes("Unable to upload") ||
      composerText.includes("file upload limit") ||
      composerText.includes("upload limit");

    const hasFailedUpload = composerText.includes("Upload failed");

    const cardSelectors = [
      "uploader-file-preview",
      ".file-preview",
      '[class*="file-preview"]',
      '[data-testid*="attachment"]',
      '[class*="attachment"]',
      '[class*="file-card"]',
      '[aria-label*="Remove file"]',
      '[aria-label*="Remove attachment"]'
    ];

    let hasUploadCard = composerText.includes("AI_Session_Transfer.pdf");
    if (!hasUploadCard) {
      for (const sel of cardSelectors) {
        if (composerRoot.querySelector(sel)) {
          hasUploadCard = true;
          break;
        }
      }
    }

    return { hasUploadCard, hasFailedUpload, hasServerUploadBanner };
  }

  function triggerSinglePdfUpload(inputField, pdfFile) {
    if (!inputField || !pdfFile) return;
    inputField.focus();

    const dt = new DataTransfer();
    dt.items.add(pdfFile);

    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    let assignedToFileInput = false;

    for (const fi of fileInputs) {
      const accept = (fi.getAttribute("accept") || "").toLowerCase();
      if (!accept || accept.includes("pdf") || accept.includes("*/*") || fileInputs.length === 1) {
        try {
          fi.files = dt.files;
          fi.dispatchEvent(new Event("change", { bubbles: true }));
          fi.dispatchEvent(new Event("input", { bubbles: true }));
          assignedToFileInput = true;
          break;
        } catch (e) {}
      }
    }

    if (!assignedToFileInput) {
      inputField.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        })
      );
    }

    setTimeout(() => {
      const status = inspectFileUploadStatus(inputField);
      if (!status.hasUploadCard) {
        inputField.dispatchEvent(
          new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
          })
        );
        inputField.dispatchEvent(
          new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt
          })
        );
      }
    }, 450);
  }

  function checkAndApplyPendingTransfer() {
    chrome.storage.local.get("pendingTransfer", (data) => {
      if (!data.pendingTransfer) return;

      const { text, expectedMinLength, pdfDataUrl, pdfPageCount, timestamp } = data.pendingTransfer;
      chrome.storage.local.remove("pendingTransfer");

      if (Date.now() - timestamp > 180000) return;

      let waitAttempts = 0;
      const waitTimer = setInterval(() => {
        waitAttempts++;
        const initialInput = getLiveChatInputElement();

        if (initialInput) {
          clearInterval(waitTimer);

          setTimeout(async () => {
            const liveInput = getLiveChatInputElement();
            if (!liveInput) return;

            forceNativeTextPaste(liveInput, text);
            showMinimalToast("Uploading PDF & pasting organized session...");

            if (pdfDataUrl) {
              const pdfFile = await dataURLtoPdfFileAsync(pdfDataUrl, "AI_Session_Transfer.pdf");
              showPdfReadyFloatingPill(pdfDataUrl, pdfPageCount || 1, `Attaching PDF (${pdfPageCount || 1} Pages)...`);

              if (pdfFile) {
                setTimeout(() => {
                  const curInput = getLiveChatInputElement();
                  const statusBefore = inspectFileUploadStatus(curInput);

                  if (statusBefore.hasServerUploadBanner) {
                    showPdfReadyFloatingPill(pdfDataUrl, pdfPageCount || 1, "Text Pasted (Upload Limit Reached)");
                    removeMinimalToast();
                    return;
                  }

                  triggerSinglePdfUpload(curInput, pdfFile);

                  setTimeout(() => {
                    const inputAfterWait = getLiveChatInputElement();
                    const statusAfter1 = inspectFileUploadStatus(inputAfterWait);

                    if (!isTextPresentInEditor(inputAfterWait, expectedMinLength)) {
                      forceNativeTextPaste(inputAfterWait, text);
                    }

                    if (statusAfter1.hasServerUploadBanner) {
                      showPdfReadyFloatingPill(pdfDataUrl, pdfPageCount || 1, "Text Ready (PDF Upload Blocked)");
                      removeMinimalToast();
                      return;
                    }

                    if (statusAfter1.hasFailedUpload || !statusAfter1.hasUploadCard) {
                      triggerSinglePdfUpload(inputAfterWait, pdfFile);
                      setTimeout(() => {
                        const finalInput = getLiveChatInputElement();
                        if (!isTextPresentInEditor(finalInput, expectedMinLength)) {
                          forceNativeTextPaste(finalInput, text);
                        }
                        showPdfReadyFloatingPill(pdfDataUrl, pdfPageCount || 1, `PDF (${pdfPageCount || 1} Pages) & Text Ready!`);
                        showMinimalToast("PDF & Text Ready • Press Enter");
                        setTimeout(removeMinimalToast, 2800);
                      }, 3800);
                    } else {
                      showPdfReadyFloatingPill(pdfDataUrl, pdfPageCount || 1, `PDF (${pdfPageCount || 1} Pages) & Text Ready!`);
                      showMinimalToast("PDF & Text Ready • Press Enter");
                      setTimeout(removeMinimalToast, 2800);
                    }
                  }, 4200);
                }, 450);
              }
            } else {
              showMinimalToast("Ready • Press Enter");
              setTimeout(removeMinimalToast, 2500);
            }

            const watchdogStart = Date.now();
            const textWatchdog = setInterval(() => {
              const elapsed = Date.now() - watchdogStart;
              const currentEditor = getLiveChatInputElement();
              if (currentEditor && !isTextPresentInEditor(currentEditor, expectedMinLength)) {
                forceNativeTextPaste(currentEditor, text);
              }
              if (elapsed >= 10000) {
                clearInterval(textWatchdog);
              }
            }, 1100);
          }, 650);
        }

        if (waitAttempts >= 40) clearInterval(waitTimer);
      }, 450);
    });
  }

  checkAndApplyPendingTransfer();

  function findTrueChatScroller() {
    const candidates = [];
    const allElements = document.querySelectorAll("div, main, section, infinite-scroller");

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const rect = el.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.35 || rect.height < 180) continue;

      if (el.scrollHeight > el.clientHeight + 20) {
        const oy = window.getComputedStyle(el).overflowY;
        if (
          oy === "auto" ||
          oy === "scroll" ||
          oy === "overlay" ||
          el.tagName.toLowerCase() === "infinite-scroller"
        ) {
          const score = el.scrollHeight * el.clientWidth;
          candidates.push({ el, score });
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].el;
    }

    return document.scrollingElement || document.documentElement || document.body;
  }

  function hideFloatingOverlaysSafely(scroller) {
    const modifiedEls = [];

    function makeTransparent(el) {
      if (!el || el === document.body || el === document.documentElement) return;
      if (el.id === "ai-transfer-minimal-toast") return;
      if (el === scroller || el.contains(scroller)) return;
      if (el.dataset.aiTransferTransparent === "1") return;

      el.dataset.aiTransferTransparent = "1";
      modifiedEls.push({
        el,
        prevOpacity: el.style.getPropertyValue("opacity"),
        prevVis: el.style.getPropertyValue("visibility")
      });

      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("visibility", "hidden", "important");
    }

    const siteBar = document.getElementById("ai-transfer-minimal-bar");
    if (siteBar) makeTransparent(siteBar);

    const pdfPill = document.getElementById("ai-transfer-pdf-pill");
    if (pdfPill) makeTransparent(pdfPill);

    const switchModal = document.getElementById("ai-transfer-minimal-modal");
    if (switchModal) switchModal.remove();

    let safeTopY = 0;
    let safeBottomY = window.innerHeight;

    const inputEl = getLiveChatInputElement();
    if (inputEl) {
      let box = inputEl;
      while (
        box.parentElement &&
        box.parentElement !== document.body &&
        !box.parentElement.contains(scroller) &&
        box.parentElement !== scroller
      ) {
        if (box.parentElement.getBoundingClientRect().height > 290) break;
        box = box.parentElement;
      }
      const boxRect = box.getBoundingClientRect();
      if (boxRect.height < 300 && boxRect.top > window.innerHeight * 0.45) {
        safeBottomY = Math.min(safeBottomY, Math.max(250, Math.floor(boxRect.top)));
        makeTransparent(box);
      }
    }

    document.querySelectorAll("button, header, nav, div, form, fieldset").forEach((el) => {
      if (el.id === "ai-transfer-minimal-toast") return;
      if (el === scroller || el.contains(scroller)) return;

      const st = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) return;

      if (
        el.tagName.toLowerCase() === "button" &&
        rect.width <= 70 &&
        rect.height <= 70 &&
        rect.top > window.innerHeight * 0.5
      ) {
        makeTransparent(el);
      }

      if (
        (st.position === "fixed" || st.position === "sticky") &&
        rect.top <= 10 &&
        rect.height < 95 &&
        rect.width > 250
      ) {
        safeTopY = Math.max(safeTopY, Math.ceil(rect.bottom));
        makeTransparent(el);
      }

      if (
        (st.position === "fixed" || st.position === "sticky" || st.position === "absolute") &&
        rect.bottom >= window.innerHeight - 30 &&
        rect.height < 260 &&
        rect.top > window.innerHeight * 0.5
      ) {
        safeBottomY = Math.min(safeBottomY, Math.max(250, Math.floor(rect.top)));
        makeTransparent(el);
      }
    });

    const styleTag = document.createElement("style");
    styleTag.id = "ai-transfer-instant-scroll";
    styleTag.textContent = `
      *, html, body { scroll-behavior: auto !important; }
      ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    `;
    document.head.appendChild(styleTag);

    return {
      safeTopY,
      safeBottomY,
      restore: function () {
        const st = document.getElementById("ai-transfer-instant-scroll");
        if (st) st.remove();
        modifiedEls.forEach((item) => {
          delete item.el.dataset.aiTransferTransparent;
          if (item.prevOpacity) {
            item.el.style.setProperty("opacity", item.prevOpacity);
          } else {
            item.el.style.removeProperty("opacity");
          }
          if (item.prevVis) {
            item.el.style.setProperty("visibility", item.prevVis);
          } else {
            item.el.style.removeProperty("visibility");
          }
        });
      }
    };
  }

  async function streamUnlimitedScreenshotsToPdf() {
    const scroller = findTrueChatScroller();
    const isWindowScroller =
      scroller === document.scrollingElement ||
      scroller === document.documentElement ||
      scroller === document.body;

    const originalScrollTop = isWindowScroller ? window.scrollY : scroller.scrollTop;
    const overlayState = hideFloatingOverlaysSafely(scroller);

    await new Promise((r) => setTimeout(r, 120));

    if (isWindowScroller) {
      window.scrollTo(0, 0);
    } else {
      scroller.scrollTop = 0;
    }
    await new Promise((r) => setTimeout(r, 260));

    const scrollerRect = isWindowScroller
      ? { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, bottom: window.innerHeight }
      : scroller.getBoundingClientRect();

    const cropLeftCss = Math.max(0, Math.round(scrollerRect.left));
    const cropWidthCss = Math.max(300, Math.min(window.innerWidth - cropLeftCss, Math.round(scrollerRect.width)));
    const cropTopCss = Math.max(0, Math.round(Math.max(scrollerRect.top, overlayState.safeTopY)));
    const cropBottomCss = Math.min(
      window.innerHeight,
      Math.round(Math.min(scrollerRect.bottom, overlayState.safeBottomY))
    );
    const cropHeightCss = Math.max(220, cropBottomCss - cropTopCss);

    const bgColor = window.getComputedStyle(document.body).backgroundColor || "#161618";

    await chrome.runtime.sendMessage({
      action: "initUnlimitedPdfSession",
      cropLeftCss,
      cropTopCss,
      cropWidthCss,
      cropHeightCss,
      windowInnerWidth: window.innerWidth,
      bgColor: bgColor !== "rgba(0, 0, 0, 0)" ? bgColor : "#161618"
    });

    let currentTargetY = 0;
    let lastActualScrollY = -1;
    let pageIndex = 0;

    while (true) {
      pageIndex++;
      const dynamicTotalHeight = isWindowScroller
        ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
        : scroller.scrollHeight;
      const estimatedTotal = Math.max(pageIndex, Math.ceil(dynamicTotalHeight / cropHeightCss));

      showMinimalToast(`📄 Building PDF Page ${pageIndex} / ${estimatedTotal}...`);

      if (isWindowScroller) {
        window.scrollTo(0, currentTargetY);
      } else {
        scroller.scrollTop = currentTargetY;
      }

      await new Promise((r) => setTimeout(r, 65));
      const actualScrollY = isWindowScroller ? window.scrollY : scroller.scrollTop;

      if (pageIndex > 1 && Math.abs(actualScrollY - lastActualScrollY) < 2) {
        break;
      }

      const toast = document.getElementById("ai-transfer-minimal-toast");
      if (toast) toast.style.opacity = "0";

      await new Promise((r) => setTimeout(r, 260));

      await chrome.runtime.sendMessage({
        action: "captureAndAppendPdfPage",
        scrollY: actualScrollY
      });

      if (toast) toast.style.opacity = "1";

      lastActualScrollY = actualScrollY;

      const maxScrollPossible = isWindowScroller
        ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight
        : scroller.scrollHeight - scroller.clientHeight;

      if (actualScrollY >= maxScrollPossible - 2) {
        break;
      }

      currentTargetY = actualScrollY + cropHeightCss;
    }

    overlayState.restore();
    if (isWindowScroller) {
      window.scrollTo(0, originalScrollTop);
    } else {
      scroller.scrollTop = originalScrollTop;
    }
  }

  function detectCodeLanguage(pre, codeEl) {
    const classStr = `${codeEl?.className || ""} ${pre.className || ""}`.toLowerCase();
    const match = classStr.match(/language-([a-z0-9_+-]+)/);
    if (match) return match[1];

    const prev = pre.previousElementSibling;
    if (prev) {
      const label = (prev.textContent || "").trim().toLowerCase().split(/\s+/)[0];
      if (label && label.length >= 1 && label.length <= 15 && /^[a-z0-9+#.-]+$/.test(label)) {
        return label;
      }
    }

    const sample = (codeEl ? codeEl.textContent : pre.textContent || "").trim();
    if (sample.startsWith("<!DOCTYPE html") || sample.startsWith("<html") || sample.startsWith("<div")) return "html";
    if (sample.startsWith("{") && sample.endsWith("}")) return "json";
    if (sample.includes("function ") || sample.includes("const ") || sample.includes("document.")) return "javascript";
    if (sample.includes("def ") || sample.includes("import ")) return "python";
    if (sample.includes("#include")) return "cpp";
    return "code";
  }

  async function harvestAllImagesFast(container) {
    const rawImgs = Array.from(container.querySelectorAll("img")).filter((img) => {
      const src = img.src || "";
      const alt = (img.alt || "").toLowerCase();
      const isIcon =
        src.includes("avatar") ||
        src.includes("icon") ||
        src.includes("sparkle") ||
        alt.includes("profile") ||
        alt.includes("avatar");
      return src && !isIcon && img.naturalWidth > 60 && img.naturalHeight > 60;
    });

    const targetImgs = rawImgs.slice(0, 100);
    const harvested = new Array(targetImgs.length);
    const BATCH = 16;

    for (let i = 0; i < targetImgs.length; i += BATCH) {
      const slice = targetImgs.slice(i, i + BATCH);
      await Promise.all(
        slice.map(async (img, idx) => {
          const pos = i + idx;
          let base64 = "";
          if (pos < 24) {
            try {
              const maxDim = 512;
              const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
              const w = Math.max(1, Math.round(img.naturalWidth * scale));
              const h = Math.max(1, Math.round(img.naturalHeight * scale));

              if (typeof OffscreenCanvas !== "undefined") {
                const off = new OffscreenCanvas(w, h);
                const ctx = off.getContext("2d", { alpha: false });
                ctx.drawImage(img, 0, 0, w, h);
                const blob = await off.convertToBlob({ type: "image/jpeg", quality: 0.72 });
                base64 = await new Promise((res) => {
                  const r = new FileReader();
                  r.onloadend = () => res(r.result || "");
                  r.onerror = () => res("");
                  r.readAsDataURL(blob);
                });
              }
            } catch (e) {
              base64 = "";
            }
          }

          harvested[pos] = {
            src: img.src,
            alt: img.alt || `Visual Graphic #${pos + 1}`,
            originType: img.src.startsWith("blob:") ? "AI Generated Graphic" : "Uploaded Image",
            dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
            base64: base64
          };
        })
      );
    }

    return harvested.filter(Boolean);
  }

  async function scrapeUnlimitedChatDataOrganized() {
    const container =
      document.querySelector("main") ||
      document.querySelector('[role="main"]') ||
      document.body;

    const codeBlocks = [];
    const seenCodes = new Set();
    Array.from(container.querySelectorAll("pre")).forEach((pre) => {
      const codeEl = pre.querySelector("code");
      const rawCode = (codeEl ? codeEl.textContent : pre.textContent || "")
        .replace(/[\uE000-\uF8FF]/g, "")
        .trim();

      if (rawCode.length > 8 && !seenCodes.has(rawCode)) {
        seenCodes.add(rawCode);
        const lang = detectCodeLanguage(pre, codeEl);
        codeBlocks.push({ lang, code: rawCode });
      }
    });

    const tables = [];
    Array.from(container.querySelectorAll("table")).forEach((tbl) => {
      const rows = Array.from(tbl.querySelectorAll("tr"));
      const mdRows = [];
      rows.forEach((row, rIdx) => {
        const cells = Array.from(row.querySelectorAll("th, td")).map((c) =>
          (c.textContent || "").trim().replace(/\|/g, "\\|").replace(/\n+/g, " ")
        );
        if (cells.length > 0) {
          mdRows.push(`| ${cells.join(" | ")} |`);
          if (rIdx === 0) {
            mdRows.push(`| ${cells.map(() => "---").join(" | ")} |`);
          }
        }
      });
      if (mdRows.length > 0) tables.push(mdRows.join("\n"));
    });

    const images = await harvestAllImagesFast(container);

    const excludedTags = new Set([
      "PRE",
      "NAV",
      "HEADER",
      "FOOTER",
      "ASIDE",
      "FORM",
      "FIELDSET",
      "SCRIPT",
      "STYLE",
      "SVG",
      "BUTTON"
    ]);
    const textChunks = [];

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          let p = node.parentElement;
          while (p && p !== container) {
            if (
              excludedTags.has(p.tagName) ||
              p.id === "ai-transfer-minimal-bar" ||
              p.id === "ai-transfer-minimal-modal" ||
              p.id === "ai-transfer-minimal-toast" ||
              p.id === "ai-transfer-pdf-pill" ||
              p.getAttribute("role") === "navigation"
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            p = p.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      const val = (currentNode.nodeValue || "").replace(/[\uE000-\uF8FF]/g, "").trim();
      if (val.length > 0) {
        textChunks.push(val);
      }
    }

    const chatText = textChunks
      .join("\n")
      .replace(/Use the up and down arrow keys to move between messages\./g, "")
      .replace(/Free plan\s*Upgrade/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      title: document.title,
      url: window.location.href,
      codeBlocks,
      tables,
      images,
      chatText
    };
  }

  async function executeInPageTransfer(targetId, targetUrl, targetName, captureFullShot) {
    try {
      showMinimalToast("Organizing text, code & images...");
      const rawPayload = await scrapeUnlimitedChatDataOrganized();

      if (captureFullShot !== false) {
        await streamUnlimitedScreenshotsToPdf();
      }

      showMinimalToast(`📄 Packing PDF & Opening ${targetName}...`);

      chrome.runtime.sendMessage(
        {
          action: "finalizeUnlimitedPdfAndTransfer",
          rawPayload: rawPayload,
          targetId: targetId,
          targetUrl: SAFE_URLS[targetId] || targetUrl
        },
        () => {
          removeMinimalToast();
        }
      );
    } catch (err) {
      removeMinimalToast();
      console.error("Transfer execution error:", err);
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "runInPageFullCaptureAndTransfer") {
      executeInPageTransfer(
        request.targetId,
        request.targetUrl,
        request.targetName,
        request.captureFullShot
      );
      sendResponse({ ack: true });
      return true;
    }

    if (request.action === "openInPageGlassDock") {
      toggleMinimalSwitchModal();
      sendResponse({ opened: true });
      return true;
    }
  });

  function toggleMinimalSwitchModal() {
    const existing = document.getElementById("ai-transfer-minimal-modal");
    if (existing) {
      existing.remove();
      return;
    }

    const currentPInfo = detectCurrentPlatformInfo();
    const currentPid = currentPInfo ? currentPInfo.id : null;
    const accent = currentPInfo ? currentPInfo.accent : "#a8c7fa";

    const modal = document.createElement("div");
    modal.id = "ai-transfer-minimal-modal";
    modal.style.cssText = `
      position: fixed;
      bottom: 48px;
      right: 18px;
      width: 265px;
      z-index: 2147483646;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 12px;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    `;

    const platforms = [
      { id: "chatgpt", name: "ChatGPT" },
      { id: "gemini", name: "Google Gemini" },
      { id: "claude", name: "Claude" },
      { id: "deepseek", name: "DeepSeek" }
    ];

    const buttonsHtml = platforms
      .map((p) => {
        const isCurrent = p.id === currentPid;
        return `
        <button data-id="${p.id}" data-name="${p.name}" class="min-ai-item" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:9px 11px;margin-bottom:5px;background:${
          isCurrent ? "rgba(255,255,255,0.08)" : "transparent"
        };border:1px solid ${
          isCurrent ? accent : "rgba(255,255,255,0.08)"
        };border-radius:9px;color:#f4f4f5;cursor:pointer;font-size:12px;font-weight:500;transition:background 0.15s ease,border-color 0.15s ease;">
          <span>${p.name}</span>
          <span style="color:${isCurrent ? accent : "#a1a1aa"};font-size:11px;">${
          isCurrent ? "Active" : "PDF + Text →"
        }</span>
        </button>`;
      })
      .join("");

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 2px;">
        <span style="font-size:11px;font-weight:600;color:#a1a1aa;">Switch AI (Unlimited PDF)</span>
        <button id="closeMinModalBtn" style="background:transparent;border:none;color:#a1a1aa;cursor:pointer;font-size:12px;">✕</button>
      </div>
      <div>${buttonsHtml}</div>
    `;

    document.body.appendChild(modal);
    document.getElementById("closeMinModalBtn").onclick = () => modal.remove();

    modal.querySelectorAll(".min-ai-item").forEach((btn) => {
      btn.onmouseenter = () => {
        if (btn.getAttribute("data-id") !== currentPid) {
          btn.style.background = "rgba(255,255,255,0.06)";
          btn.style.borderColor = accent;
        }
      };
      btn.onmouseleave = () => {
        if (btn.getAttribute("data-id") !== currentPid) {
          btn.style.background = "transparent";
          btn.style.borderColor = "rgba(255,255,255,0.08)";
        }
      };
      btn.onclick = (e) => {
        e.stopPropagation();
        const tId = btn.getAttribute("data-id");
        const tName = btn.getAttribute("data-name");
        if (tId === currentPid) return;
        modal.remove();

        chrome.storage.local.get(["fullShotEnabled"], (cfg) => {
          const shouldCaptureShot = cfg.fullShotEnabled !== false;
          executeInPageTransfer(tId, SAFE_URLS[tId], tName, shouldCaptureShot);
        });
      };
    });
  }
})();