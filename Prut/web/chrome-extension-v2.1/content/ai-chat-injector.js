/**
 * Peroot AI Chat Injector v3.0
 *
 * Injects Peroot enhancement button + side panel into AI chat pages.
 * Supports: ChatGPT, Claude, Gemini, DeepSeek, Perplexity
 */
(() => {
  if (window.__peerootAIChatInjected) return;
  window.__peerootAIChatInjected = true;

  const API_BASE = "https://www.peroot.space";
  const LOGO_URL = chrome.runtime.getURL('icons/icon-48.png');

  // Inject Alef font
  if (!document.getElementById('peroot-alef-font')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'peroot-alef-font';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Alef:wght@400;700&display=swap';
    document.head.appendChild(fontLink);
  }

  // ── Site Detection ──────────────────────────────────────────────────────────

  const SITES = {
    chatgpt: {
      match: () => /chat\.openai\.com|chatgpt\.com/.test(location.hostname),
      inputSelector: '#prompt-textarea, textarea[data-id="root"], div[contenteditable="true"][id="prompt-textarea"]',
      sendButtonSelector: 'button[data-testid="send-button"], button[aria-label="Send prompt"]',
      inputArea: () => document.querySelector('form.stretch, form[class*="composer"], main form'),
      getInputText: (el) => el.tagName === 'TEXTAREA' ? el.value : el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      },
      messageSelector: '[data-message-author-role]',
      getUserMessages: () => document.querySelectorAll('[data-message-author-role="user"]'),
      getAssistantMessages: () => document.querySelectorAll('[data-message-author-role="assistant"]'),
    },
    claude: {
      match: () => /claude\.ai/.test(location.hostname),
      inputSelector: 'div.ProseMirror[contenteditable="true"], div[contenteditable="true"][data-placeholder], fieldset div[contenteditable="true"], fieldset textarea, textarea',
      sendButtonSelector: 'button[aria-label="Send Message"], button[data-testid="send-message"]',
      inputArea: () => document.querySelector('fieldset, div[class*="composer"], form'),
      getInputText: (el) => el.tagName === 'TEXTAREA' ? el.value : el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      },
      messageSelector: '[class*="human-turn"], [class*="ai-turn"]',
      getUserMessages: () => document.querySelectorAll('[class*="human-turn"], [data-is-streaming="false"][class*="UserMessage"]'),
      getAssistantMessages: () => document.querySelectorAll('[class*="ai-turn"], [data-is-streaming="false"][class*="AssistantMessage"]'),
    },
    gemini: {
      match: () => /gemini\.google\.com/.test(location.hostname),
      inputSelector: [
        'input-area-v2 .ql-editor',
        'input-area-v2 div[contenteditable="true"]',
        'rich-textarea .ql-editor',
        'rich-textarea div[contenteditable="true"]',
        'div.ql-editor[contenteditable="true"]',
        'div[contenteditable="true"][aria-label*="prompt" i]',
        'div[contenteditable="true"][aria-label*="Enter" i]',
        'p[data-placeholder]',
        'div[contenteditable="true"]'
      ].join(', '),
      sendButtonSelector: 'button[aria-label*="Send" i], button[aria-label*="send" i], button[mattooltip*="Send" i], button.send-button',
      inputArea: () => {
        // input-area-v2 is Gemini's stable custom element
        const inputArea = document.querySelector('input-area-v2');
        if (inputArea) return inputArea;
        // Fallback strategies
        const richTextarea = document.querySelector('rich-textarea');
        if (richTextarea) return richTextarea.parentElement;
        const contenteditable = document.querySelector('div[contenteditable="true"][aria-label*="prompt" i]');
        if (contenteditable) {
          let parent = contenteditable.parentElement;
          for (let i = 0; i < 5 && parent && parent !== document.body; i++) {
            if (parent.offsetHeight > 40 && parent.offsetWidth > 200) return parent;
            parent = parent.parentElement;
          }
        }
        return null;
      },
      getInputText: (el) => {
        // Handle p[data-placeholder] — walk up to contenteditable parent
        if (el.tagName === 'P' && el.dataset.placeholder) {
          const parent = el.closest('[contenteditable="true"]');
          return parent ? parent.innerText?.trim() || '' : el.innerText?.trim() || '';
        }
        if (el.tagName === 'TEXTAREA') return el.value;
        return el.innerText?.trim() || el.textContent?.trim() || '';
      },
      setInputText: (el, text) => {
        // Walk up to the contenteditable container if needed
        let target = el;
        if (!target.isContentEditable) {
          target = target.closest('[contenteditable="true"]') || target;
        }
        target.focus();
        // Clear and insert
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, text);
        // Dispatch events for Angular detection
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      },
      messageSelector: 'message-content, .message-content',
      getUserMessages: () => document.querySelectorAll('user-query, .user-query, [data-message-author="user"]'),
      getAssistantMessages: () => document.querySelectorAll('model-response, .model-response, [data-message-author="model"]'),
    },
    deepseek: {
      match: () => /chat\.deepseek\.com/.test(location.hostname),
      inputSelector: 'textarea#chat-input, textarea',
      sendButtonSelector: 'button[class*="send"]',
      inputArea: () => document.querySelector('div[class*="input-area"], form'),
      getInputText: (el) => el.value || el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.innerText = text;
          el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
      },
      messageSelector: '[class*="message"]',
      getUserMessages: () => document.querySelectorAll('[class*="user-message"]'),
      getAssistantMessages: () => document.querySelectorAll('[class*="assistant-message"]'),
    },
    perplexity: {
      match: () => /perplexity\.ai/.test(location.hostname),
      inputSelector: 'textarea[placeholder*="Ask"], textarea',
      sendButtonSelector: 'button[aria-label="Submit"]',
      inputArea: () => document.querySelector('div[class*="query"], form'),
      getInputText: (el) => el.value || el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.innerText = text;
          el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
      },
      messageSelector: '[class*="message"]',
      getUserMessages: () => document.querySelectorAll('[class*="user-message"]'),
      getAssistantMessages: () => document.querySelectorAll('[class*="answer"]'),
    },
    mistral: {
      match: () => /chat\.mistral\.ai/.test(location.hostname),
      inputSelector: 'textarea, div[contenteditable="true"]',
      sendButtonSelector: 'button[type="submit"], button[aria-label="Send"]',
      inputArea: () => document.querySelector('form') || document.querySelector('main'),
      getInputText: (el) => el.tagName === 'TEXTAREA' ? el.value : el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      },
      messageSelector: '[class*="message"]',
      getUserMessages: () => document.querySelectorAll('[class*="user"]'),
      getAssistantMessages: () => document.querySelectorAll('[class*="assistant"]'),
    },
    minimax: {
      match: () => /minimaxi\.com/.test(location.hostname),
      inputSelector: 'textarea, div[contenteditable="true"]',
      sendButtonSelector: 'button[type="submit"], button[aria-label="Send"]',
      inputArea: () => document.querySelector('form') || document.querySelector('main'),
      getInputText: (el) => el.tagName === 'TEXTAREA' ? el.value : el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      },
      messageSelector: '[class*="message"]',
      getUserMessages: () => document.querySelectorAll('[class*="user"]'),
      getAssistantMessages: () => document.querySelectorAll('[class*="assistant"]'),
    },
    grok: {
      match: () => /grok\.com|x\.com\/i\/grok/.test(location.hostname + location.pathname),
      inputSelector: 'textarea, div[contenteditable="true"]',
      sendButtonSelector: 'button[type="submit"], button[aria-label*="Send" i]',
      inputArea: () => document.querySelector('form') || document.querySelector('main'),
      getInputText: (el) => el.tagName === 'TEXTAREA' ? el.value : el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      },
      messageSelector: '[class*="message"]',
      getUserMessages: () => document.querySelectorAll('[class*="user"]'),
      getAssistantMessages: () => document.querySelectorAll('[class*="assistant"]'),
    },
    copilot: {
      match: () => /copilot\.microsoft\.com/.test(location.hostname),
      inputSelector: 'textarea#userInput, textarea, div[contenteditable="true"]',
      sendButtonSelector: 'button[data-testid="submit-button"], button[aria-label*="Submit" i], button[type="submit"]',
      inputArea: () => document.querySelector('form') || document.querySelector('main'),
      getInputText: (el) => el.tagName === 'TEXTAREA' ? el.value : el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, text);
          else el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      },
      messageSelector: '[data-content="ai-message"], [class*="message"]',
      getUserMessages: () => document.querySelectorAll('[data-content="user-message"], [class*="user"]'),
      getAssistantMessages: () => document.querySelectorAll('[data-content="ai-message"], [class*="assistant"]'),
    },
    poe: {
      match: () => /poe\.com/.test(location.hostname),
      inputSelector: 'textarea[class*="GrowingTextArea"], textarea',
      sendButtonSelector: 'button[class*="ChatMessageSendButton"], button[aria-label*="Send" i]',
      inputArea: () => document.querySelector('form') || document.querySelector('[class*="ChatMessageInputContainer"]'),
      getInputText: (el) => el.value,
      setInputText: (el, text) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) setter.call(el, text);
        else el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      messageSelector: '[class*="ChatMessage_messageRow"]',
      getUserMessages: () => document.querySelectorAll('[class*="ChatMessage_messageRow"][class*="human"]'),
      getAssistantMessages: () => document.querySelectorAll('[class*="ChatMessage_messageRow"][class*="bot"]'),
    },
  };

  const currentSite = Object.values(SITES).find(s => s.match());
  if (!currentSite) return;

  // ── Platform Auto-Detection ────────────────────────────────────────────────
  const SITE_IMAGE_PLATFORM_MAP = {
    chatgpt: 'dalle',
    gemini: 'nanobanana',
  };
  const SITE_VIDEO_PLATFORM_MAP = {
    gemini: 'veo',
  };
  const detectedSiteKey = Object.keys(SITES).find(k => SITES[k] === currentSite);
  const autoImagePlatform = SITE_IMAGE_PLATFORM_MAP[detectedSiteKey] || 'general';
  const autoVideoPlatform = SITE_VIDEO_PLATFORM_MAP[detectedSiteKey] || 'general';

  // ── Output Sanitizer ──────────────────────────────────────────────────────
  function sanitizeOutput(text) {
    const META_PREFIXES = [
      /^here'?s?\s+(your|the|a)\s+.*?prompt.*?:?\s*\n?/i,
      /^i'?ve\s+(created|crafted|generated).*?:?\s*\n?/i,
      /^below\s+is.*?:?\s*\n?/i,
      /^the\s+following\s+.*?prompt.*?:?\s*\n?/i,
      /^to\s+(create|generate)\s+this.*?:?\s*\n?/i,
      /^כתוב את הפרומפט הבא:?\s*\n?/,
      /^הנה הפרומפט.*?:?\s*\n?/,
      /^פרומפט מוכן.*?:?\s*\n?/,
    ];
    let cleaned = text;
    for (const pattern of META_PREFIXES) {
      cleaned = cleaned.replace(pattern, '');
    }
    return cleaned.trimStart();
  }

  // ── State ──────────────────────────────────────────────────────────────────

  let peerootBtn = null;
  let sidePanel = null;
  let sidePanelOpen = false;
  let libraryCache = null;
  let isEnhancing = false;
  let escHandler = null;
  let selectedMode = 'STANDARD';
  let userProfile = null; // { plan_tier, credits_balance }
  let modeDropdownOpen = false;
  let modeDropdownOutsideHandler = null;

  // ── API Proxy (routes through service worker to avoid CORS) ──────────

  /**
   * Resolve the effective output language from the stored preference and the
   * input text.  When the preference is "auto", detect the dominant script:
   * if >60% of alphabetic characters are Latin the user is writing in English
   * so the output should match. Otherwise leave it unset (server defaults to Hebrew).
   */
  function resolveOutputLanguage(pref, inputText) {
    if (pref === 'english') return 'english';
    if (pref !== 'auto') return null; // hebrew — no override needed
    const hebrew = (inputText.match(/[\u05D0-\u05EA]/g) || []).length;
    const latin  = (inputText.match(/[a-zA-Z]/g) || []).length;
    const total  = hebrew + latin;
    return total > 0 && latin / total > 0.6 ? 'english' : null;
  }

  function apiFetch(path, options = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "API_FETCH",
        path,
        method: options.method || "GET",
        body: options.body || null,
        stream: options.stream || false,
      }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, status: 0, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { ok: false, status: 0 });
        }
      });
    });
  }

  // ── User Profile ────────────────────────────────────────────────────────

  async function fetchUserProfile() {
    try {
      const res = await apiFetch('/api/me');
      if (!res.ok) return null;
      const data = res.data;
      userProfile = { plan_tier: data?.plan_tier || 'free', credits_balance: data?.credits_balance ?? 0 };
      return userProfile;
    } catch { return null; }
  }

  function isProUser() {
    const tier = userProfile?.plan_tier;
    return tier === 'pro' || tier === 'premium' || tier === 'admin';
  }

  // ── Mode Config ─────────────────────────────────────────────────────────

  const MODE_COLORS = {
    STANDARD: '#f59e0b',
    DEEP_RESEARCH: '#10b981',
    IMAGE_GENERATION: '#ec4899',
    VIDEO_GENERATION: '#3b82f6',
    AGENT_BUILDER: '#8b5cf6',
  };

  const MODE_SVGS = {
    STANDARD: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8h6.1l-4.9 3.6 1.9 5.8L12 14.6l-4.9 3.6 1.9-5.8L4 8.8h6.1z"/></svg>',
    DEEP_RESEARCH: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>',
    IMAGE_GENERATION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"/></svg>',
    VIDEO_GENERATION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="15" height="16" rx="2"/><path d="M17 8l5-3v14l-5-3"/></svg>',
    AGENT_BUILDER: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h.01M15 9h.01M9 15h6"/></svg>',
  };

  const MODES = [
    { key: 'STANDARD', icon: MODE_SVGS.STANDARD, label: 'רגיל', proOnly: false, color: MODE_COLORS.STANDARD },
    { key: 'DEEP_RESEARCH', icon: MODE_SVGS.DEEP_RESEARCH, label: 'מחקר', proOnly: true, color: MODE_COLORS.DEEP_RESEARCH },
    { key: 'IMAGE_GENERATION', icon: MODE_SVGS.IMAGE_GENERATION, label: 'תמונה', proOnly: true, color: MODE_COLORS.IMAGE_GENERATION },
    { key: 'VIDEO_GENERATION', icon: MODE_SVGS.VIDEO_GENERATION, label: 'וידאו', proOnly: true, color: MODE_COLORS.VIDEO_GENERATION },
    { key: 'AGENT_BUILDER', icon: MODE_SVGS.AGENT_BUILDER, label: 'סוכן', proOnly: true, color: MODE_COLORS.AGENT_BUILDER },
  ];

  let selectedVideoPlatform = autoVideoPlatform;
  let selectedImagePlatform = autoImagePlatform;

  const IMAGE_PLATFORMS = [
    { id: 'general', label: 'כללי' },
    { id: 'midjourney', label: 'Midjourney' },
    { id: 'dalle', label: 'GPT Image' },
    { id: 'flux', label: 'FLUX.2' },
    { id: 'stable-diffusion', label: 'SD' },
    { id: 'imagen', label: 'Imagen' },
    { id: 'nanobanana', label: 'Gemini' },
  ];

  const VIDEO_PLATFORMS = [
    { id: 'general', label: 'כללי' },
    { id: 'runway', label: 'Runway' },
    { id: 'kling', label: 'Kling' },
    { id: 'sora', label: 'Sora' },
    { id: 'veo', label: 'Veo 3' },
    { id: 'higgsfield', label: 'Higgsfield' },
    { id: 'minimax', label: 'Minimax' },
  ];

  // ── Enhancement ──────────────────────────────────────────────────────────

  // Try to find the input element — uses site-specific selector first, then broad fallbacks
  function findInputElement() {
    // 1. Site-specific selector
    let el = document.querySelector(currentSite.inputSelector);
    if (el && !el.closest('#peroot-side-panel, #peroot-ai-toolbar')) return el;

    // 2. Broad fallback: any contenteditable or textarea that looks like a chat input
    // Exclude Peroot's own UI elements
    const candidates = [
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label]',
      'textarea[aria-label]',
      'div[contenteditable="true"]',
      'textarea',
    ];
    for (const sel of candidates) {
      el = document.querySelector(sel);
      if (el && !el.closest('#peroot-side-panel, #peroot-ai-toolbar, #peroot-export-modal')) return el;
    }

    return null;
  }

  async function enhanceInput() {
    if (isEnhancing) return;
    const inputEl = findInputElement();
    if (!inputEl) {
      showToast('לא נמצא שדה קלט — כתוב טקסט ונסה שוב', 'error');
      return;
    }

    const text = currentSite.getInputText(inputEl).trim();
    if (!text || text.length < 3) {
      showToast('כתוב לפחות 3 תווים כדי לשדרג', 'error');
      return;
    }

    isEnhancing = true;
    updateButtonState('loading');
    showToast('משדרג...', 'info');

    try {
      // Read tone/mode/platform from shared storage so injector stays in sync
      // with whatever the user last configured in the popup.
      const stored = await new Promise(r =>
        chrome.storage.local.get(
          ['peroot_last_tone', 'peroot_last_mode', 'peroot_last_image_platform', 'peroot_last_video_platform', 'peroot_output_language'],
          r
        )
      );
      const tone = stored.peroot_last_tone || 'Professional';
      const mode = stored.peroot_last_mode || selectedMode;
      const imgPlat = stored.peroot_last_image_platform || selectedImagePlatform;
      const vidPlat = stored.peroot_last_video_platform || selectedVideoPlatform;
      const outputLang = resolveOutputLanguage(stored.peroot_output_language || 'hebrew', text);

      // Map the detected site to target_model so the server tunes the
      // enhanced prompt for the exact platform the user is sitting on.
      // detectedSiteKey is set at module init (line ~227) via SITES.
      const targetModel =
        detectedSiteKey === 'chatgpt' ? 'chatgpt'
        : detectedSiteKey === 'claude' ? 'claude'
        : detectedSiteKey === 'gemini' ? 'gemini'
        : 'general';

      // Route through service worker to avoid CORS
      const res = await apiFetch('/api/enhance', {
        method: 'POST',
        body: {
          prompt: text,
          tone,
          category: 'כללי',
          capability_mode: mode,
          target_model: targetModel,
          ...(outputLang === 'english' && { output_language: 'english' }),
          ...(mode === 'IMAGE_GENERATION' && { mode_params: { image_platform: imgPlat } }),
          ...(mode === 'VIDEO_GENERATION' && { mode_params: { video_platform: vidPlat } }),
        },
        stream: true,
      });

      if (res.status === 401) {
        showToast('התחבר ל-peroot.space כדי לרענן את ההתחברות', 'error');
        updateButtonState('idle');
        isEnhancing = false;
        return;
      }
      if (res.status === 403) {
        showToast('אין קרדיטים. שדרג ל-Pro', 'error');
        updateButtonState('idle');
        isEnhancing = false;
        return;
      }
      if (!res.ok) {
        showToast('שגיאה בשדרוג', 'error');
        updateButtonState('idle');
        isEnhancing = false;
        return;
      }

      // Result comes as full text from proxy — strip metadata tags + sanitize meta-text
      const raw = (res.text || '').split('[GENIUS_QUESTIONS]')[0];
      const stripped = raw.replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]/g, '').replace(/<internal_quality_check[\s\S]*?<\/internal_quality_check>/g, '').trim();
      const cleaned = sanitizeOutput(stripped);
      if (cleaned) {
        currentSite.setInputText(inputEl, cleaned);
        inputEl.focus();
        updateButtonState('success');
        showToast('\u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E9\u05D5\u05D3\u05E8\u05D2!', 'success');
        // Note: /api/enhance already saves to history server-side — no duplicate sync needed
      }
    } catch (err) {
      showToast('שגיאת רשת — בדוק חיבור לאינטרנט', 'error');
      updateButtonState('idle');
    } finally {
      setTimeout(() => {
        isEnhancing = false;
        updateButtonState('idle');
      }, 2000);
    }
  }

  // ── Button Injection ──────────────────────────────────────────────────────

  function updateButtonState(state) {
    if (!peerootBtn) return;
    peerootBtn.classList.remove('peroot-ai-loading', 'peroot-ai-success');
    if (state === 'loading') {
      peerootBtn.classList.add('peroot-ai-loading');
      peerootBtn.innerHTML = '<span class="peroot-ai-spinner"></span>';
    } else if (state === 'success') {
      peerootBtn.classList.add('peroot-ai-success');
      peerootBtn.innerHTML = '✓';
    } else {
      peerootBtn.innerHTML = `<img src="${LOGO_URL}" alt="Peroot" class="peroot-radial-logo"><span class="peroot-radial-mode-indicator" style="display:none"></span>`;
      updateRadialHalo();
    }
  }

  function getActiveColor() {
    return MODE_COLORS[selectedMode] || MODE_COLORS.STANDARD;
  }

  function updateRadialHalo() {
    const trigger = document.getElementById('peroot-radial-trigger');
    if (!trigger) return;
    const color = getActiveColor();
    trigger.style.setProperty('--halo-color', color);
    // Update mode indicator
    const indicator = trigger.querySelector('.peroot-radial-mode-indicator');
    if (indicator) {
      const mode = MODES.find(m => m.key === selectedMode);
      if (mode && selectedMode !== 'STANDARD') {
        indicator.innerHTML = mode.icon;
        indicator.style.color = color;
        indicator.style.display = '';
      } else {
        indicator.style.display = 'none';
      }
    }
  }

  function closeRadialMenu() {
    const menu = document.getElementById('peroot-radial-menu');
    if (menu) menu.classList.remove('peroot-radial-open');
    radialOpen = false;
    if (radialOutsideHandler) {
      document.removeEventListener('click', radialOutsideHandler, true);
      radialOutsideHandler = null;
    }
  }

  let radialOpen = false;
  let radialOutsideHandler = null;

  function toggleRadialMenu() {
    const menu = document.getElementById('peroot-radial-menu');
    if (!menu) return;
    if (radialOpen) {
      closeRadialMenu();
    } else {
      menu.classList.add('peroot-radial-open');
      radialOpen = true;
      radialOutsideHandler = (e) => {
        const container = document.getElementById('peroot-radial-container');
        if (container && !container.contains(e.target)) closeRadialMenu();
      };
      setTimeout(() => document.addEventListener('click', radialOutsideHandler, true), 0);
    }
  }

  async function showModeSubmenu() {
    closeRadialMenu();
    if (!userProfile) await fetchUserProfile();

    const container = document.getElementById('peroot-radial-container');
    if (!container) return;

    // Remove existing dropdown
    const existing = document.getElementById('peroot-mode-dropdown');
    if (existing) { existing.remove(); modeDropdownOpen = false; return; }

    const dropdown = document.createElement('div');
    dropdown.id = 'peroot-mode-dropdown';
    dropdown.className = 'peroot-mode-dropdown';

    MODES.forEach(mode => {
      const item = document.createElement('button');
      const isLocked = mode.proOnly && !isProUser();
      const isActive = mode.key === selectedMode;
      item.className = 'peroot-mode-item' + (isActive ? ' active' : '') + (isLocked ? ' locked' : '');
      item.style.setProperty('--mode-color', mode.color);

      let html = `<span class="peroot-mode-item-icon" style="color:${isActive ? mode.color : 'inherit'}">${mode.icon}</span><span>${mode.label}</span>`;
      if (isLocked) html += '<span class="peroot-mode-lock">Pro</span>';
      item.innerHTML = html;

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLocked) {
          showToast('שדרג ל-Pro כדי להשתמש במצב זה', 'error');
          return;
        }
        selectedMode = mode.key;
        updateRadialHalo();

        // Show platform sub-selector for image/video modes
        if (mode.key === 'IMAGE_GENERATION' || mode.key === 'VIDEO_GENERATION') {
          showPlatformSubSelector(dropdown, mode.key);
          return;
        }

        // Close dropdown for other modes
        dropdown.remove();
        modeDropdownOpen = false;
        if (modeDropdownOutsideHandler) {
          document.removeEventListener('click', modeDropdownOutsideHandler, true);
          modeDropdownOutsideHandler = null;
        }
      });
      dropdown.appendChild(item);
    });

    container.appendChild(dropdown);
    modeDropdownOpen = true;

    modeDropdownOutsideHandler = (e) => {
      if (!dropdown.contains(e.target) && !container.contains(e.target)) {
        dropdown.remove();
        modeDropdownOpen = false;
        document.removeEventListener('click', modeDropdownOutsideHandler, true);
        modeDropdownOutsideHandler = null;
      }
    };
    setTimeout(() => document.addEventListener('click', modeDropdownOutsideHandler, true), 0);
  }

  function showPlatformSubSelector(dropdown, modeKey) {
    const platforms = modeKey === 'IMAGE_GENERATION' ? IMAGE_PLATFORMS : VIDEO_PLATFORMS;
    const currentPlatform = modeKey === 'IMAGE_GENERATION' ? selectedImagePlatform : selectedVideoPlatform;
    const modeColor = MODE_COLORS[modeKey];

    // Remove existing platform section
    const existingSub = dropdown.querySelector('.peroot-platform-sub');
    if (existingSub) existingSub.remove();

    const sub = document.createElement('div');
    sub.className = 'peroot-platform-sub';

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = `height:1px;background:rgba(255,255,255,0.06);margin:6px 8px;`;
    sub.appendChild(divider);

    // Label
    const label = document.createElement('div');
    label.style.cssText = `font-size:9px;color:rgba(255,255,255,0.3);padding:2px 14px 4px;direction:rtl;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;`;
    label.textContent = modeKey === 'IMAGE_GENERATION' ? 'פלטפורמה' : 'פלטפורמה';
    sub.appendChild(label);

    platforms.forEach(p => {
      const btn = document.createElement('button');
      const isActive = p.id === currentPlatform;
      btn.className = 'peroot-mode-item peroot-platform-item' + (isActive ? ' active' : '');
      if (isActive) btn.style.setProperty('--mode-color', modeColor);
      btn.innerHTML = `<span style="font-size:11px">${p.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (modeKey === 'IMAGE_GENERATION') selectedImagePlatform = p.id;
        else selectedVideoPlatform = p.id;
        // Close dropdown
        dropdown.remove();
        modeDropdownOpen = false;
        if (modeDropdownOutsideHandler) {
          document.removeEventListener('click', modeDropdownOutsideHandler, true);
          modeDropdownOutsideHandler = null;
        }
        showToast(`${p.label} נבחר`, 'success');
      });
      sub.appendChild(btn);
    });

    dropdown.appendChild(sub);
  }

  // ── Radial Menu Options ──
  const RADIAL_OPTIONS = [
    { id: 'enhance', label: 'שדרג', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>', action: () => { closeRadialMenu(); enhanceInput(); } },
    { id: 'modes', label: 'מצבים', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>', action: () => showModeSubmenu() },
    { id: 'library', label: 'ספרייה', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', action: () => { closeRadialMenu(); toggleSidePanel(); } },
    { id: 'export', label: 'ייצוא', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>', action: () => { closeRadialMenu(); exportConversation(); } },
  ];

  function injectButton() {
    if (document.getElementById('peroot-radial-trigger')) return;

    const inputEl = document.querySelector(currentSite.inputSelector);
    if (!inputEl) return;

    const inputArea = currentSite.inputArea?.() || inputEl.closest('form') || inputEl.parentElement;
    if (!inputArea) return;

    // Create radial container
    const container = document.createElement('div');
    container.id = 'peroot-radial-container';
    container.className = 'peroot-radial-container';

    // Main trigger button with halo
    const trigger = document.createElement('button');
    trigger.id = 'peroot-radial-trigger';
    trigger.className = 'peroot-radial-trigger';
    trigger.title = 'Peroot — שדרג פרומפט (Ctrl+M)';
    trigger.style.setProperty('--halo-color', getActiveColor());
    trigger.innerHTML = `<img src="${LOGO_URL}" alt="Peroot" class="peroot-radial-logo"><span class="peroot-radial-mode-indicator" style="display:none"></span>`;

    // Also set the peerootBtn reference for state updates
    peerootBtn = trigger;

    // Left click = enhance. Right-click = open radial menu.
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (radialOpen) {
        closeRadialMenu();
      } else {
        enhanceInput();
      }
    });

    trigger.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleRadialMenu();
    });

    // Menu indicator arrow (visible click target for menu)
    const menuArrow = document.createElement('button');
    menuArrow.className = 'peroot-radial-arrow';
    menuArrow.title = 'תפריט';
    menuArrow.innerHTML = '▾';
    menuArrow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleRadialMenu();
    });

    // Radial menu
    const menu = document.createElement('div');
    menu.id = 'peroot-radial-menu';
    menu.className = 'peroot-radial-menu';

    RADIAL_OPTIONS.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'peroot-radial-option';
      btn.title = opt.label;
      btn.style.setProperty('--i', i);
      btn.innerHTML = `<span class="peroot-radial-option-icon">${opt.svg}</span><span class="peroot-radial-option-label">${opt.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        opt.action();
      });
      menu.appendChild(btn);
    });

    container.appendChild(trigger);
    container.appendChild(menuArrow);
    container.appendChild(menu);

    // Position
    const computedPos = window.getComputedStyle(inputArea).position;
    if (computedPos === 'static') inputArea.style.position = 'relative';
    inputArea.appendChild(container);
  }

  // ── Side Panel (Prompt Library) ───────────────────────────────────────────

  function toggleSidePanel() {
    if (sidePanelOpen) {
      closeSidePanel();
    } else {
      openSidePanel();
    }
  }

  async function openSidePanel() {
    if (document.getElementById('peroot-side-panel')) {
      closeSidePanel();
      return;
    }

    sidePanel = document.createElement('div');
    sidePanel.id = 'peroot-side-panel';
    sidePanel.className = 'peroot-side-panel peroot-side-panel-enter';

    sidePanel.innerHTML = `
      <div class="peroot-sp-header">
        <div class="peroot-sp-brand">
          <img src="${LOGO_URL}" alt="Peroot" class="peroot-sp-logo-img" style="width:22px;height:22px;">
          <span class="peroot-sp-title">Peroot Library</span>
        </div>
        <button class="peroot-sp-close" id="peroot-sp-close">✕</button>
      </div>
      <div class="peroot-sp-search">
        <input type="text" id="peroot-sp-search-input" placeholder="חפש פרומפט..." />
      </div>
      <div class="peroot-sp-tabs">
        <button class="peroot-sp-tab active" data-tab="library">ספרייה</button>
        <button class="peroot-sp-tab" data-tab="favorites">&#11088; מועדפים</button>
      </div>
      <div class="peroot-sp-content" id="peroot-sp-content">
        <div class="peroot-sp-loading"><span class="peroot-ai-spinner"></span></div>
      </div>
    `;

    document.body.appendChild(sidePanel);
    sidePanelOpen = true;

    // Event listeners
    sidePanel.querySelector('#peroot-sp-close').addEventListener('click', closeSidePanel);
    sidePanel.querySelectorAll('.peroot-sp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        sidePanel.querySelectorAll('.peroot-sp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'library') loadLibrary();
        else if (tab.dataset.tab === 'favorites') loadSidePanelFavorites();
      });
    });

    const searchInput = sidePanel.querySelector('#peroot-sp-search-input');
    searchInput.addEventListener('input', () => filterLibrary(searchInput.value));

    // Load library
    await loadLibrary();

    // Close on Escape (stored so closeSidePanel can clean it up)
    if (escHandler) document.removeEventListener('keydown', escHandler);
    escHandler = (e) => {
      if (e.key === 'Escape') closeSidePanel();
    };
    document.addEventListener('keydown', escHandler);
  }

  function closeSidePanel() {
    const panel = document.getElementById('peroot-side-panel');
    if (panel) {
      panel.classList.add('peroot-side-panel-exit');
      setTimeout(() => panel.remove(), 200);
    }
    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
    sidePanelOpen = false;
    sidePanel = null;
  }

  async function loadLibrary() {
    const content = document.getElementById('peroot-sp-content');
    if (!content) return;

    if (libraryCache) {
      renderLibrary(libraryCache);
      return;
    }

    content.innerHTML = '<div class="peroot-sp-loading"><span class="peroot-ai-spinner"></span></div>';

    try {
      const res = await apiFetch('/api/personal-library');

      if (res.status === 401) {
        content.innerHTML = '<div class="peroot-sp-empty">התחבר ל-Peroot כדי לגשת לספרייה</div>';
        return;
      }
      if (!res.ok) {
        content.innerHTML = '<div class="peroot-sp-empty">שגיאה בטעינת הספרייה</div>';
        return;
      }

      const data = res.data;
      libraryCache = Array.isArray(data) ? data : (data?.items || data?.prompts || []);
      renderLibrary(libraryCache);
    } catch {
      content.innerHTML = '<div class="peroot-sp-empty">שגיאת רשת — בדוק חיבור לאינטרנט</div>';
    }
  }

  function renderLibrary(prompts) {
    const content = document.getElementById('peroot-sp-content');
    if (!content) return;

    if (!prompts.length) {
      content.innerHTML = '<div class="peroot-sp-empty">עדיין אין פרומפטים שמורים.<br>שמור פרומפטים ב-peroot.space!</div>';
      return;
    }

    content.innerHTML = prompts.map((p, i) => `
      <div class="peroot-sp-card" data-idx="${i}">
        <div class="peroot-sp-card-title">${escHtml(p.title || 'ללא כותרת')}</div>
        <div class="peroot-sp-card-text">${escHtml((p.prompt || '').slice(0, 120))}${(p.prompt || '').length > 120 ? '...' : ''}</div>
        <div class="peroot-sp-card-actions">
          <button class="peroot-sp-use-btn" data-idx="${i}">השתמש</button>
          <button class="peroot-sp-copy-btn" data-idx="${i}">העתק</button>
        </div>
      </div>
    `).join('');

    // Bind use/copy buttons
    content.querySelectorAll('.peroot-sp-use-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = prompts[parseInt(btn.dataset.idx)];
        const inputEl = document.querySelector(currentSite.inputSelector);
        if (inputEl && prompt) {
          currentSite.setInputText(inputEl, prompt.prompt || '');
          inputEl.focus();
          closeSidePanel();
          showToast('הפרומפט הוכנס!', 'success');
        }
      });
    });

    content.querySelectorAll('.peroot-sp-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = prompts[parseInt(btn.dataset.idx)];
        if (prompt) {
          navigator.clipboard.writeText(prompt.prompt || '');
          showToast('הועתק!', 'success');
        }
      });
    });
  }

  function filterLibrary(query) {
    if (!libraryCache) return;
    const q = query.trim().toLowerCase();
    const filtered = q ? libraryCache.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.prompt || '').toLowerCase().includes(q)
    ) : libraryCache;
    renderLibrary(filtered);
  }

  // -- Side Panel Favorites --

  async function loadSidePanelFavorites() {
    const content = document.getElementById('peroot-sp-content');
    if (!content) return;

    content.innerHTML = '<div class="peroot-sp-loading"><span class="peroot-ai-spinner"></span></div>';

    try {
      const res = await apiFetch('/api/favorites');

      if (res.status === 401) {
        content.innerHTML = '<div class="peroot-sp-empty">\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DC-Peroot \u05DB\u05D3\u05D9 \u05DC\u05D2\u05E9\u05EA \u05DC\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD</div>';
        return;
      }
      if (!res.ok) {
        content.innerHTML = '<div class="peroot-sp-empty">\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD</div>';
        return;
      }

      const data = res.data;
      const favorites = data?.favorites || data?.items || (Array.isArray(data) ? data : []);

      if (!favorites.length) {
        content.innerHTML = '<div class="peroot-sp-empty">\u05D0\u05D9\u05DF \u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF.<br>\u05E1\u05DE\u05DF \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8\u05D9\u05DD \u05D1-peroot.space!</div>';
        return;
      }

      renderLibrary(favorites);
    } catch {
      content.innerHTML = '<div class="peroot-sp-empty">\u05E9\u05D2\u05D9\u05D0\u05EA \u05E8\u05E9\u05EA</div>';
    }
  }

  // ── Conversation Export ───────────────────────────────────────────────────

  function exportConversation() {
    const userMsgs = currentSite.getUserMessages();
    const assistantMsgs = currentSite.getAssistantMessages();

    if (!userMsgs.length && !assistantMsgs.length) {
      showToast('לא נמצאה שיחה', 'error');
      return;
    }

    // Collect all messages in DOM order
    const allMsgs = [];
    const msgElements = document.querySelectorAll(currentSite.messageSelector);

    if (msgElements.length > 0) {
      msgElements.forEach(el => {
        const isUser = el.getAttribute('data-message-author-role') === 'user' ||
          el.closest('[class*="human"]') || el.closest('[class*="user"]') ||
          el.closest('user-query');
        const text = el.innerText?.trim();
        if (text) {
          allMsgs.push({ role: isUser ? 'user' : 'assistant', text });
        }
      });
    } else {
      // Fallback: interleave user and assistant messages
      const maxLen = Math.max(userMsgs.length, assistantMsgs.length);
      for (let i = 0; i < maxLen; i++) {
        if (userMsgs[i]?.innerText?.trim()) allMsgs.push({ role: 'user', text: userMsgs[i].innerText.trim() });
        if (assistantMsgs[i]?.innerText?.trim()) allMsgs.push({ role: 'assistant', text: assistantMsgs[i].innerText.trim() });
      }
    }

    if (!allMsgs.length) {
      showToast('לא הצלחתי לחלץ הודעות', 'error');
      return;
    }

    // Format as markdown
    const markdown = allMsgs.map(m =>
      `## ${m.role === 'user' ? '👤 User' : '🤖 Assistant'}\n\n${m.text}`
    ).join('\n\n---\n\n');

    showExportModal(markdown, allMsgs);
  }

  function showExportModal(markdown, messages) {
    // Remove existing modal
    document.getElementById('peroot-export-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'peroot-export-modal';
    modal.className = 'peroot-export-modal';
    modal.innerHTML = `
      <div class="peroot-export-overlay" id="peroot-export-overlay"></div>
      <div class="peroot-export-content">
        <div class="peroot-export-header">
          <span>📤 יצוא שיחה</span>
          <button class="peroot-export-close" id="peroot-export-close">✕</button>
        </div>
        <div class="peroot-export-stats">
          ${messages.length} הודעות • ${messages.filter(m => m.role === 'user').length} משתמש • ${messages.filter(m => m.role === 'assistant').length} עוזר
        </div>
        <div class="peroot-export-preview">${escHtml(markdown).slice(0, 500)}${markdown.length > 500 ? '...' : ''}</div>
        <div class="peroot-export-actions">
          <button class="peroot-export-btn peroot-export-primary" id="peroot-export-copy">📋 העתק כ-Markdown</button>
          <button class="peroot-export-btn" id="peroot-export-download">💾 הורד .md</button>
          <button class="peroot-export-btn" id="peroot-export-continue">🔄 המשך ב-AI אחר</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('#peroot-export-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#peroot-export-overlay').addEventListener('click', () => modal.remove());

    // Copy
    modal.querySelector('#peroot-export-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(markdown);
      showToast('השיחה הועתקה!', 'success');
      modal.remove();
    });

    // Download
    modal.querySelector('#peroot-export-download').addEventListener('click', () => {
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('הורד!', 'success');
      modal.remove();
    });

    // Continue in another AI
    modal.querySelector('#peroot-export-continue').addEventListener('click', () => {
      const continuePrompt = `המשך את השיחה הזו מהמקום שהפסקת:\n\n${markdown}`;
      navigator.clipboard.writeText(continuePrompt);
      showToast('הועתק עם הקשר — הדבק בכל צ׳אט AI!', 'success');
      modal.remove();
    });
  }

  // ── Toast Notification ────────────────────────────────────────────────────

  function showToast(message, type = 'info') {
    document.getElementById('peroot-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'peroot-toast';
    toast.className = `peroot-toast peroot-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('peroot-toast-show'), 10);
    setTimeout(() => {
      toast.classList.remove('peroot-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    // Ctrl+M / Cmd+M — Enhance
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      enhanceInput();
    }
    // Ctrl+Alt+S — Toggle side panel
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 's') {
      e.preventDefault();
      toggleSidePanel();
    }
    // Ctrl+Alt+E — Export conversation
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'e') {
      e.preventDefault();
      exportConversation();
    }
    // Escape — close radial menu or side panel
    if (e.key === 'Escape') {
      if (radialOpen) closeRadialMenu();
      else if (modeDropdownOpen) {
        const dd = document.getElementById('peroot-mode-dropdown');
        if (dd) dd.remove();
        modeDropdownOpen = false;
      }
      else if (sidePanelOpen) closeSidePanel();
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── MutationObserver (re-inject on SPA navigation) ────────────────────────

  let injectTimeout = null;
  const observer = new MutationObserver(() => {
    if (injectTimeout) clearTimeout(injectTimeout);
    injectTimeout = setTimeout(() => {
      if (!document.getElementById('peroot-radial-trigger')) {
        if (document.querySelector(currentSite.inputSelector)) {
          injectButton();
        }
      }
    }, 500);
  });

  // Observe for SPA navigation changes that remove the button.
  // Use subtree: true on a narrow container, or childList on main/body.
  const observeTarget = document.querySelector('main') || document.body;
  observer.observe(observeTarget, { childList: true, subtree: true });

  // ── URL-change detection (history.pushState / replaceState) ─────────────
  // SPA navigations in ChatGPT/Claude/Gemini use pushState — popstate never
  // fires, so the DOM observer is the only signal. Wrap history methods to
  // broadcast a custom event we can listen to for a hard re-init.
  if (!window.__perootPatchedHistory) {
    window.__perootPatchedHistory = true;
    const fire = () => window.dispatchEvent(new Event('peroot:locationchange'));
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function () {
      const r = origPush.apply(this, arguments);
      fire();
      return r;
    };
    history.replaceState = function () {
      const r = origReplace.apply(this, arguments);
      fire();
      return r;
    };
    window.addEventListener('popstate', fire);
  }
  let lastUrl = location.href;
  window.addEventListener('peroot:locationchange', () => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    // Fresh conversation → let the DOM settle, then re-inject if missing.
    setTimeout(() => {
      if (!document.getElementById('peroot-radial-trigger')) {
        if (typeof tryInject === 'function') tryInject(0);
      }
    }, 400);
  });

  // Cleanup observer on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    observer.disconnect();
  });

  // Initial injection with progressive retry and fixed-position fallback
  function tryInject(attempts = 0) {
    if (document.getElementById('peroot-radial-trigger')) return;

    if (document.querySelector(currentSite.inputSelector)) {
      injectButton();
    } else if (attempts < 15) {
      const delay = attempts < 5 ? 500 : attempts < 10 ? 1000 : 2000;
      setTimeout(() => tryInject(attempts + 1), delay);
    } else {
      injectFixedButton();
    }
  }

  function injectFixedButton() {
    if (document.getElementById('peroot-radial-trigger')) return;

    const container = document.createElement('div');
    container.id = 'peroot-radial-container';
    container.className = 'peroot-radial-container peroot-radial-fixed';

    const trigger = document.createElement('button');
    trigger.id = 'peroot-radial-trigger';
    trigger.className = 'peroot-radial-trigger';
    trigger.title = 'Peroot — שדרג פרומפט';
    trigger.style.setProperty('--halo-color', getActiveColor());
    trigger.innerHTML = `<img src="${LOGO_URL}" alt="Peroot" class="peroot-radial-logo"><span class="peroot-radial-mode-indicator" style="display:none"></span>`;
    peerootBtn = trigger;

    // Left click = enhance, right-click = menu
    trigger.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); radialOpen ? closeRadialMenu() : enhanceInput(); });
    trigger.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); toggleRadialMenu(); });

    // Menu arrow indicator
    const fxArrow = document.createElement('button');
    fxArrow.className = 'peroot-radial-arrow';
    fxArrow.title = 'תפריט';
    fxArrow.innerHTML = '▾';
    fxArrow.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleRadialMenu(); });

    const menu = document.createElement('div');
    menu.id = 'peroot-radial-menu';
    menu.className = 'peroot-radial-menu';

    RADIAL_OPTIONS.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'peroot-radial-option';
      btn.title = opt.label;
      btn.style.setProperty('--i', i);
      btn.innerHTML = `<span class="peroot-radial-option-icon">${opt.svg}</span><span class="peroot-radial-option-label">${opt.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        opt.action();
      });
      menu.appendChild(btn);
    });

    container.appendChild(trigger);
    container.appendChild(fxArrow);
    container.appendChild(menu);
    document.body.appendChild(container);
  }

  tryInject();

  // Fetch user profile once on init (fire-and-forget)
  fetchUserProfile();

  // ── Listen for INSERT_TEXT from popup ────────────────────────────────────
  // The popup sends INSERT_TEXT via service worker to insert enhanced text into the chat input
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'INSERT_TEXT' && message.text) {
      const inputEl = findInputElement();
      if (inputEl) {
        currentSite.setInputText(inputEl, message.text);
        inputEl.focus();
        showToast('הפרומפט הוכנס בהצלחה', 'success');
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(message.text).then(() => {
          showToast('הועתק ללוח — הדבק בשדה הקלט', 'info');
        });
      }
    }
  });
})();
