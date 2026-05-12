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
  let anchorRect = null;

  /**
   * Remove the tooltip from the DOM.
   */
  function dismiss() {
    if (tooltipEl && tooltipEl.parentNode) {
      tooltipEl.remove();
    }
    tooltipEl = null;
    resultEl = null;
    anchorRect = null;
    if (dismissCallback) dismissCallback();
  }

  /**
   * Position the tooltip below the given rect.
   * @param {DOMRect} rect
   */
  function positionTooltip(rect) {
    if (!tooltipEl) return;

    anchorRect = rect;
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.zIndex = '2147483647';

    requestAnimationFrame(() => {
      if (!tooltipEl || !resultEl || !anchorRect) return;
      const tooltipRect = tooltipEl.getBoundingClientRect();
      const headerHeight = tooltipEl.querySelector('.ait-tooltip-header')?.getBoundingClientRect().height || 0;
      const layout = computeTooltipLayout(
        anchorRect,
        tooltipRect,
        { width: window.innerWidth, height: window.innerHeight },
        headerHeight
      );

      tooltipEl.style.left = `${layout.left}px`;
      tooltipEl.style.top = `${layout.top}px`;
      tooltipEl.style.width = `${layout.width}px`;
      tooltipEl.style.maxHeight = `${layout.maxHeight}px`;
      resultEl.style.maxHeight = `${layout.contentMaxHeight}px`;
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
    positionTooltip(rect);
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

    // Trim leading whitespace across multiple initial chunks
    if (resultEl.textContent.length === 0) {
      const trimmed = chunk.trimStart();
      if (trimmed) {
        resultEl.textContent = trimmed;
      }
    } else {
      resultEl.textContent += chunk;
    }

    if (anchorRect) positionTooltip(anchorRect);
  }

  /**
   * Finalize the tooltip with the complete translation result.
   * Adds copy button.
   * @param {string} fullText
   */
  function showResult(fullText) {
    if (!resultEl) return;

    resultEl.textContent = fullText.trim();
    resultEl.classList.add('ait-tooltip-result');
    if (anchorRect) positionTooltip(anchorRect);

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

    if (anchorRect) positionTooltip(anchorRect);
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

/**
 * Compute viewport-safe tooltip geometry after content has rendered.
 *
 * @param {{ left: number, top: number, bottom: number }} rect
 * @param {{ width: number, height: number }} tooltipRect
 * @param {{ width: number, height: number }} viewport
 * @param {number} headerHeight
 * @returns {{ left: number, top: number, width: number, maxHeight: number, contentMaxHeight: number }}
 */
export function computeTooltipLayout(rect, tooltipRect, viewport, headerHeight) {
  const viewportPadding = 10;
  const gap = 8;
  const minWidth = 200;
  const maxViewportWidth = Math.max(0, viewport.width - viewportPadding * 2);
  const preferredWidth = rect.width || tooltipRect.width || minWidth;
  const width = Math.min(Math.max(preferredWidth, minWidth), maxViewportWidth);
  const maxHeight = Math.max(0, viewport.height - viewportPadding * 2);
  const constrainedHeight = Math.min(tooltipRect.height, maxHeight);
  const belowTop = rect.bottom + gap;
  const aboveTop = rect.top - constrainedHeight - gap;
  const canFitBelow = belowTop + constrainedHeight <= viewport.height - viewportPadding;
  const canFitAbove = aboveTop >= viewportPadding;

  let top = belowTop;
  if (!canFitBelow && canFitAbove) {
    top = aboveTop;
  } else if (!canFitBelow) {
    top = viewportPadding;
  }

  const rectRight = rect.right ?? rect.left + preferredWidth;
  const preferredLeft = rectRight - width;
  const maxLeft = Math.max(viewportPadding, viewport.width - width - viewportPadding);
  const left = Math.min(Math.max(preferredLeft, viewportPadding), maxLeft);
  const contentMaxHeight = Math.max(0, maxHeight - headerHeight);

  return { left, top, width, maxHeight, contentMaxHeight };
}
