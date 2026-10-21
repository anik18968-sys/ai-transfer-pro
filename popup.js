const AI_DOMAINS = {
  chatgpt: { name: "ChatGPT", domain: "chatgpt.com", altDomain: "openai.com", url: "https://" + "chatgpt.com" },
  gemini: { name: "Google Gemini", domain: "gemini.google.com", altDomain: "bard.google.com", url: "https://" + "gemini.google.com" },
  claude: { name: "Claude", domain: "claude.ai", altDomain: "anthropic.com", url: "https://" + "claude.ai" },
  deepseek: { name: "DeepSeek", domain: "deepseek.com", altDomain: "chat.deepseek.com", url: "https://" + "chat.deepseek.com" }
};

let currentPlatform = null;
let currentTab = null;

function detectPlatformFromTab(tab) {
  if (!tab) return null;
  const url = (tab.url || tab.pendingUrl || "").toLowerCase();
  const title = (tab.title || "").toLowerCase();

  for (const [id, info] of Object.entries(AI_DOMAINS)) {
    if (url.includes(info.domain) || url.includes(info.altDomain)) {
      return id;
    }
  }
  if (title.includes("gemini")) return "gemini";
  if (title.includes("chatgpt")) return "chatgpt";
  if (title.includes("claude")) return "claude";
  if (title.includes("deepseek")) return "deepseek";
  return null;
}

function updateModeLabel(apiKey) {
  const modeLabel = document.getElementById("modeLabel");
  const apiDrawerBtn = document.getElementById("apiDrawerBtn");
  const hasPro = Boolean(apiKey && apiKey.trim().length > 6);

  if (hasPro) {
    modeLabel.textContent = "Pro Vision";
    apiDrawerBtn.classList.add("pro-active");
  } else {
    modeLabel.textContent = "API Key";
    apiDrawerBtn.classList.remove("pro-active");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const activeAiName = document.getElementById("activeAiName");
  const apiDrawerBtn = document.getElementById("apiDrawerBtn");
  const apiDrawer = document.getElementById("apiDrawer");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const apiProviderSelect = document.getElementById("apiProviderSelect");
  const saveKeyBtn = document.getElementById("saveKeyBtn");
  const clearKeyBtn = document.getElementById("clearKeyBtn");
  const fullShotToggle = document.getElementById("fullShotToggle");
  const floatGlassBtn = document.getElementById("floatGlassBtn");

  let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) {
    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  }
  if (tabs && tabs.length > 0) {
    currentTab = tabs[0];
    currentPlatform = detectPlatformFromTab(currentTab);
  }

  if (currentPlatform && AI_DOMAINS[currentPlatform]) {
    document.body.setAttribute("data-theme", currentPlatform);
    activeAiName.textContent = AI_DOMAINS[currentPlatform].name;

    const activeBtn = document.querySelector(`[data-id="${currentPlatform}"]`);
    if (activeBtn) {
      activeBtn.classList.add("is-current");
      activeBtn.querySelector(".item-action").textContent = "Current";
    }
  } else {
    document.body.setAttribute("data-theme", "default");
    activeAiName.textContent = "Ready to Transfer";
  }

  chrome.storage.local.get(["userApiKey", "apiProvider", "fullShotEnabled"], (cfg) => {
    const key = cfg.userApiKey || "";
    apiKeyInput.value = key;
    apiProviderSelect.value = cfg.apiProvider || "gemini";
    fullShotToggle.checked = cfg.fullShotEnabled !== false;
    updateModeLabel(key);
  });

  apiDrawerBtn.addEventListener("click", () => {
    apiDrawer.classList.toggle("open");
  });

  fullShotToggle.addEventListener("change", () => {
    chrome.storage.local.set({ fullShotEnabled: fullShotToggle.checked });
  });

  saveKeyBtn.addEventListener("click", () => {
    const val = apiKeyInput.value.trim();
    const prov = apiProviderSelect.value;
    chrome.storage.local.set({ userApiKey: val, apiProvider: prov }, () => {
      updateModeLabel(val);
      apiDrawer.classList.remove("open");
      showToast("Saved");
    });
  });

  clearKeyBtn.addEventListener("click", () => {
    apiKeyInput.value = "";
    chrome.storage.local.remove("userApiKey", () => {
      updateModeLabel("");
      showToast("Cleared");
    });
  });

  floatGlassBtn.addEventListener("click", async () => {
    if (!currentTab || !currentTab.id) return;
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ["content.js"]
    });
    chrome.tabs.sendMessage(currentTab.id, { action: "openInPageGlassDock" }, () => {
      window.close();
    });
  });

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-id");
      const targetInfo = AI_DOMAINS[targetId];

      if (!targetInfo || targetId === currentPlatform) return;
      if (!currentTab || !currentTab.id) return;

      btn.querySelector(".item-action").textContent = "Building PDF...";

      chrome.runtime.sendMessage(
        {
          action: "startBackgroundTransferJob",
          tabId: currentTab.id,
          targetId: targetId,
          targetUrl: targetInfo.url,
          targetName: targetInfo.name,
          captureFullShot: fullShotToggle.checked
        },
        () => {
          setTimeout(() => window.close(), 180);
        }
      );
    });
  });
});

function showToast(msg) {
  const box = document.getElementById("msgBox");
  box.textContent = msg;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2000);
}