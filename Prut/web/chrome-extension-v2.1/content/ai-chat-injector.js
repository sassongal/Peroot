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
      inputSelector: 'rich-textarea .ql-editor, div.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"], div.input-area-container textarea, textarea, div[contenteditable="true"]',
      sendButtonSelector: 'button.send-button, button[aria-label="Send message"], button[data-test-id="send-button"], button[mattooltip="Send message"]',
      inputArea: () => {
        // Gemini wraps input in shadow DOM sometimes; try multiple strategies
        return document.querySelector('rich-textarea')?.parentElement
          || document.querySelector('div[class*="input-area"]')?.parentElement
          || document.querySelector('div[class*="text-input"]')?.parentElement
          || document.querySelector('footer')
          || null;
      },
      getInputText: (el) => el.tagName === 'TEXTAREA' ? el.value : el.innerText,
      setInputText: (el, text) => {
        if (el.tagName === 'TEXTAREA') {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
        }
      },
      messageSelector: 'message-content',
      getUserMessages: () => document.querySelectorAll('user-query message-content, .user-query'),
      getAssistantMessages: () => document.querySelectorAll('model-response message-content, .model-response'),
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
  };

  const currentSite = Object.values(SITES).find(s => s.match());
  if (!currentSite) return;

  // ── State ──────────────────────────────────────────────────────────────────

  let peerootBtn = null;
  let sidePanel = null;
  let sidePanelOpen = false;
  let libraryCache = null;
  let isEnhancing = false;
  let escHandler = null;

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function getToken() {
    return new Promise(resolve => {
      chrome.storage.local.get(['peroot_token', 'peroot_api_key'], r => {
        if (r.peroot_api_key) resolve(r.peroot_api_key);
        else resolve(r.peroot_token || null);
      });
    });
  }

  function getHeaders(token) {
    if (!token) return {};
    const prefix = token.startsWith('prk_') ? 'Bearer ' : 'Bearer ';
    return { 'Authorization': prefix + token, 'Content-Type': 'application/json' };
  }

  // ── Enhancement ──────────────────────────────────────────────────────────

  async function enhanceInput() {
    if (isEnhancing) return;
    const inputEl = document.querySelector(currentSite.inputSelector);
    if (!inputEl) return;

    const text = currentSite.getInputText(inputEl).trim();
    if (!text || text.length < 3) return;

    isEnhancing = true;
    updateButtonState('loading');

    try {
      const token = await getToken();
      if (!token) {
        showToast('Please log in to Peroot first', 'error');
        updateButtonState('idle');
        isEnhancing = false;
        return;
      }

      const res = await fetch(`${API_BASE}/api/enhance`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
          prompt: text,
          tone: 'professional',
          category: 'general',
          source: 'extension_ai_chat',
        }),
      });

      if (res.status === 401) {
        showToast('התחבר ל-peroot.space כדי לרענן את ההתחברות', 'error');
        updateButtonState('idle');
        isEnhancing = false;
        return;
      }
      if (res.status === 403) {
        showToast('No credits remaining', 'error');
        updateButtonState('idle');
        isEnhancing = false;
        return;
      }
      if (!res.ok) {
        showToast('Enhancement failed', 'error');
        updateButtonState('idle');
        isEnhancing = false;
        return;
      }

      // Stream response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
      }

      // Clean up result
      const cleaned = result.split('[GENIUS_QUESTIONS]')[0].trim();
      if (cleaned) {
        currentSite.setInputText(inputEl, cleaned);
        inputEl.focus();
        updateButtonState('success');

        // Sync to history (fire-and-forget)
        fetch(`${API_BASE}/api/history`, {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify({
            prompt: text,
            enhanced_prompt: cleaned,
            tone: 'professional',
            category: 'general',
            title: text.slice(0, 60),
            source: 'extension_ai_chat',
          }),
        }).catch(() => {});
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
      peerootBtn.innerHTML = `<img src="${LOGO_URL}" alt="Peroot" style="width:20px;height:20px;">`;
    }
  }

  function injectButton() {
    if (document.getElementById('peroot-ai-btn')) return;

    const inputEl = document.querySelector(currentSite.inputSelector);
    if (!inputEl) return;

    // Find the input container to position the button
    const inputArea = currentSite.inputArea?.() || inputEl.closest('form') || inputEl.parentElement;
    if (!inputArea) return;

    // Create button
    peerootBtn = document.createElement('button');
    peerootBtn.id = 'peroot-ai-btn';
    peerootBtn.className = 'peroot-ai-btn';
    peerootBtn.title = 'Peroot — Enhance prompt (Ctrl+M)';
    peerootBtn.innerHTML = `<img src="${LOGO_URL}" alt="Peroot" style="width:20px;height:20px;">`;
    peerootBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      enhanceInput();
    });

    // Create toolbar container (button + library + export)
    const toolbar = document.createElement('div');
    toolbar.id = 'peroot-ai-toolbar';
    toolbar.className = 'peroot-ai-toolbar';

    toolbar.appendChild(peerootBtn);

    // Library button
    const libBtn = document.createElement('button');
    libBtn.className = 'peroot-ai-tool-btn';
    libBtn.title = 'Prompt Library (Ctrl+Alt+S)';
    libBtn.innerHTML = '📚';
    libBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSidePanel();
    });
    toolbar.appendChild(libBtn);

    // Export button
    const expBtn = document.createElement('button');
    expBtn.className = 'peroot-ai-tool-btn';
    expBtn.title = 'Export Conversation (Ctrl+Alt+E)';
    expBtn.innerHTML = '📤';
    expBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      exportConversation();
    });
    toolbar.appendChild(expBtn);

    // Insert toolbar relative to the input area
    inputArea.style.position = inputArea.style.position || 'relative';
    inputArea.appendChild(toolbar);
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
        <button class="peroot-sp-tab active" data-tab="library">הספריה שלי</button>
        <button class="peroot-sp-tab" data-tab="quick">מהירים</button>
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
        else loadQuickPrompts();
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
      const token = await getToken();
      if (!token) {
        content.innerHTML = '<div class="peroot-sp-empty">Log in to Peroot to see your library</div>';
        return;
      }

      const res = await fetch(`${API_BASE}/api/personal-library`, {
        headers: getHeaders(token),
      });

      if (res.status === 401) {
        content.innerHTML = '<div class="peroot-sp-empty">התחבר ל-Peroot כדי לגשת לספרייה</div>';
        return;
      }
      if (!res.ok) {
        content.innerHTML = '<div class="peroot-sp-empty">שגיאה בטעינת הספרייה</div>';
        return;
      }

      const data = await res.json();
      libraryCache = Array.isArray(data) ? data : (data.items || data.prompts || []);
      renderLibrary(libraryCache);
    } catch {
      content.innerHTML = '<div class="peroot-sp-empty">שגיאת רשת — בדוק חיבור לאינטרנט</div>';
    }
  }

  function renderLibrary(prompts) {
    const content = document.getElementById('peroot-sp-content');
    if (!content) return;

    if (!prompts.length) {
      content.innerHTML = '<div class="peroot-sp-empty">No saved prompts yet.<br>Save prompts on peroot.space!</div>';
      return;
    }

    content.innerHTML = prompts.map((p, i) => `
      <div class="peroot-sp-card" data-idx="${i}">
        <div class="peroot-sp-card-title">${escHtml(p.title || 'Untitled')}</div>
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
          showToast('Prompt inserted!', 'success');
        }
      });
    });

    content.querySelectorAll('.peroot-sp-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = prompts[parseInt(btn.dataset.idx)];
        if (prompt) {
          navigator.clipboard.writeText(prompt.prompt || '');
          showToast('Copied!', 'success');
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

  const QUICK_PROMPTS = [
    { icon: '✍️', title: 'שפר טקסט', prompt: 'שפר את הטקסט הבא מבחינת בהירות, זרימה ודקדוק, תוך שמירה על המשמעות המקורית:' },
    { icon: '📧', title: 'מייל מקצועי', prompt: 'כתוב מייל מקצועי ומנומס בנושא הבא:' },
    { icon: '📝', title: 'סכם טקסט', prompt: 'סכם את הטקסט הבא בצורה תמציתית ובהירה, בנקודות עיקריות:' },
    { icon: '🌐', title: 'תרגם לאנגלית', prompt: 'Translate the following text to fluent English, preserving the original tone and meaning:' },
    { icon: '💡', title: 'רעיונות יצירתיים', prompt: 'תן לי 5 רעיונות יצירתיים ומקוריים בנושא:' },
    { icon: '📊', title: 'ניתוח נתונים', prompt: 'נתח את הנתונים הבאים והצג תובנות מרכזיות, מגמות ומסקנות:' },
    { icon: '🎯', title: 'אסטרטגיה', prompt: 'בנה אסטרטגיה מפורטת עם יעדים, צעדים ולוח זמנים בנושא:' },
    { icon: '🔍', title: 'מחקר מעמיק', prompt: 'ערוך מחקר מקיף בנושא הבא, כולל רקע, נתונים עדכניים ומסקנות:' },
  ];

  function loadQuickPrompts() {
    const content = document.getElementById('peroot-sp-content');
    if (!content) return;

    content.innerHTML = QUICK_PROMPTS.map((p, i) => `
      <div class="peroot-sp-card peroot-sp-quick" data-idx="${i}">
        <div class="peroot-sp-card-title">${p.icon} ${p.title}</div>
        <div class="peroot-sp-card-text">${escHtml(p.prompt.slice(0, 80))}...</div>
        <div class="peroot-sp-card-actions">
          <button class="peroot-sp-use-btn peroot-sp-quick-use" data-idx="${i}">השתמש</button>
        </div>
      </div>
    `).join('');

    content.querySelectorAll('.peroot-sp-quick-use').forEach(btn => {
      btn.addEventListener('click', () => {
        const qp = QUICK_PROMPTS[parseInt(btn.dataset.idx)];
        const inputEl = document.querySelector(currentSite.inputSelector);
        if (inputEl && qp) {
          currentSite.setInputText(inputEl, qp.prompt);
          inputEl.focus();
          closeSidePanel();
        }
      });
    });
  }

  // ── Conversation Export ───────────────────────────────────────────────────

  function exportConversation() {
    const userMsgs = currentSite.getUserMessages();
    const assistantMsgs = currentSite.getAssistantMessages();

    if (!userMsgs.length && !assistantMsgs.length) {
      showToast('No conversation found', 'error');
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
      showToast('Could not extract messages', 'error');
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
          <span>📤 Export Conversation</span>
          <button class="peroot-export-close" id="peroot-export-close">✕</button>
        </div>
        <div class="peroot-export-stats">
          ${messages.length} messages • ${messages.filter(m => m.role === 'user').length} user • ${messages.filter(m => m.role === 'assistant').length} assistant
        </div>
        <div class="peroot-export-preview">${escHtml(markdown).slice(0, 500)}${markdown.length > 500 ? '...' : ''}</div>
        <div class="peroot-export-actions">
          <button class="peroot-export-btn peroot-export-primary" id="peroot-export-copy">📋 Copy as Markdown</button>
          <button class="peroot-export-btn" id="peroot-export-download">💾 Download .md</button>
          <button class="peroot-export-btn" id="peroot-export-continue">🔄 Continue in another AI</button>
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
      showToast('Conversation copied!', 'success');
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
      showToast('Downloaded!', 'success');
      modal.remove();
    });

    // Continue in another AI
    modal.querySelector('#peroot-export-continue').addEventListener('click', () => {
      const continuePrompt = `Please continue this conversation from where it left off:\n\n${markdown}`;
      navigator.clipboard.writeText(continuePrompt);
      showToast('Copied with context prefix — paste into any AI chat!', 'success');
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
    // Escape — close side panel
    if (e.key === 'Escape' && sidePanelOpen) {
      closeSidePanel();
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
      if (!document.getElementById('peroot-ai-btn')) {
        injectButton();
      }
    }, 500);
  });

  // Observe the narrowest useful container (input area or main, not entire body)
  const observeTarget = currentSite.inputArea?.()?.parentElement
    || document.querySelector('main')
    || document.body;
  observer.observe(observeTarget, { childList: true, subtree: true });

  // Initial injection (retry a few times for slow-loading SPAs)
  function tryInject(attempts = 0) {
    if (document.querySelector(currentSite.inputSelector)) {
      injectButton();
    } else if (attempts < 20) {
      setTimeout(() => tryInject(attempts + 1), 500);
    }
  }

  tryInject();
})();
