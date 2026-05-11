/**
 * Create a tooltip controller for rendering translation results.
 * All UI is rendered inside the provided Shadow DOM root.
 *
 * @param {ShadowRoot} shadowRoot - Shadow DOM root to render into
 * @returns {Object} Tooltip controller with show/update/dismiss methods
 */
export function createTooltip(shadowRoot) {
  let tooltipEl = null;
  let resultEl = null;
  let dismissCallback = null;

  /**
   * Remove the tooltip from the DOM.
   */
  function dismiss() {
    if (tooltipEl && tooltipEl.parentNode) {
      tooltipEl.remove();
    }
    tooltipEl = null;
    resultEl = null;
    if (dismissCallback) dismissCallback();
  }

  /**
   * Position the tooltip below the given rect.
   * @param {DOMRect} rect
   */
  function positionTooltip(rect) {
    if (!tooltipEl) return;

    tooltipEl.style.position = 'fixed';
    tooltipEl.style.left = `${rect.left}px`;
    tooltipEl.style.top = `${rect.bottom + 8}px`;
    tooltipEl.style.zIndex = '2147483647';

    // Adjust if tooltip would go off-screen right
    requestAnimationFrame(() => {
      if (!tooltipEl) return;
      const tooltipRect = tooltipEl.getBoundingClientRect();
      if (tooltipRect.right > window.innerWidth - 10) {
        tooltipEl.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
      }
      // Adjust if tooltip would go off-screen bottom
      if (tooltipRect.bottom > window.innerHeight - 10) {
        tooltipEl.style.top = `${rect.top - tooltipRect.height - 8}px`;
      }
    });
  }

  /**
   * Create the base tooltip element structure.
   * @param {DOMRect} rect
   * @param {string} sourceLang
   * @param {string} targetLang
   * @param {string} model
   * @returns {HTMLElement}
   */
  function createBaseTooltip(rect, sourceLang, targetLang, model) {
    dismiss(); // Remove any existing tooltip

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'ait-tooltip';

    // Header
    const header = document.createElement('div');
    header.className = 'ait-tooltip-header';

    const langLabel = document.createElement('span');
    langLabel.className = 'ait-tooltip-lang';
    langLabel.textContent = `${sourceLang} → ${targetLang}`;

    const modelLabel = document.createElement('span');
    modelLabel.className = 'ait-tooltip-model';
    modelLabel.textContent = `via ${model}`;

    const actions = document.createElement('div');
    actions.className = 'ait-tooltip-actions';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ait-tooltip-btn ait-tooltip-close';
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });

    actions.appendChild(closeBtn);
    header.appendChild(langLabel);
    header.appendChild(modelLabel);
    header.appendChild(actions);

    // Content area
    resultEl = document.createElement('div');
    resultEl.className = 'ait-tooltip-content';

    tooltipEl.appendChild(header);
    tooltipEl.appendChild(resultEl);
    shadowRoot.appendChild(tooltipEl);

    positionTooltip(rect);

    return tooltipEl;
  }

  /**
   * Show the tooltip in loading state.
   * @param {DOMRect} rect
   * @param {string} sourceLang
   * @param {string} targetLang
   * @param {string} model
   */
  function showLoading(rect, sourceLang, targetLang, model) {
    createBaseTooltip(rect, sourceLang, targetLang, model);
    resultEl.innerHTML = `
      <div class="ait-tooltip-loading">
        <div class="ait-spinner"></div>
        <span>Translating...</span>
      </div>
    `;
  }

  /**
   * Update the tooltip content with a streaming chunk.
   * Replaces loading spinner with text on first chunk.
   * @param {string} chunk
   */
  function updateContent(chunk) {
    if (!resultEl) return;

    // Remove loading indicator on first chunk
    const loading = resultEl.querySelector('.ait-tooltip-loading');
    if (loading) {
      resultEl.innerHTML = '';
      resultEl.classList.add('ait-tooltip-result');
    }

    resultEl.textContent += chunk;
  }

  /**
   * Finalize the tooltip with the complete translation result.
   * Adds copy button.
   * @param {string} fullText
   */
  function showResult(fullText) {
    if (!resultEl) return;

    resultEl.textContent = fullText;
    resultEl.classList.add('ait-tooltip-result');

    // Add copy button to actions
    const actions = tooltipEl.querySelector('.ait-tooltip-actions');
    if (actions) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'ait-tooltip-btn ait-tooltip-copy';
      copyBtn.innerHTML = '📋';
      copyBtn.title = 'Copy translation';
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(fullText);
          copyBtn.innerHTML = '✓';
          setTimeout(() => { copyBtn.innerHTML = '📋'; }, 1500);
        } catch {
          // Fallback
          copyBtn.innerHTML = '✗';
          setTimeout(() => { copyBtn.innerHTML = '📋'; }, 1500);
        }
      });
      actions.insertBefore(copyBtn, actions.firstChild);
    }
  }

  /**
   * Show an error state with optional retry button.
   * @param {string} message
   * @param {Function|null} onRetry
   */
  function showError(message, onRetry = null) {
    if (!resultEl) return;

    resultEl.innerHTML = '';
    resultEl.classList.add('ait-tooltip-error');

    const errorMsg = document.createElement('span');
    errorMsg.textContent = message;
    resultEl.appendChild(errorMsg);

    if (onRetry) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'ait-tooltip-retry';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRetry();
      });
      resultEl.appendChild(retryBtn);
    }
  }

  /**
   * Set a callback to be called when the tooltip is dismissed.
   * @param {Function} cb
   */
  function onDismiss(cb) {
    dismissCallback = cb;
  }

  return {
    showLoading,
    updateContent,
    showResult,
    showError,
    dismiss,
    onDismiss,
  };
}
