import { debounce } from '../shared/utils.js';

/**
 * Initialize the text selection detector and floating translate icon.
 * @param {ShadowRoot} shadowRoot - Shadow DOM root to render into
 * @param {Function} onTranslateRequest - Callback when user clicks translate icon
 *   Called with { text: string, rect: DOMRect }
 * @param {number} selectionDelay - Debounce delay in ms before showing icon
 */
export function initSelector(container, onTranslateRequest, selectionDelay = 300) {
  let iconEl = null;
  let currentSelection = null;

  /**
   * Create the floating translate icon element.
   */
  function createIcon() {
    const icon = document.createElement('div');
    icon.className = 'ait-icon';
    icon.innerHTML = '🌐';
    icon.title = 'Click to translate';

    // Using mousedown instead of click to prevent the document mousedown handler
    // from removing the icon before the click event fires.
    icon.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentSelection) {
        onTranslateRequest({
          text: currentSelection.text,
          rect: currentSelection.rect,
        });
      }
    });

    return icon;
  }

  /**
   * Show the floating icon near the selection.
   * @param {DOMRect} rect - Bounding rect of the selection
   */
  function showIcon(rect) {
    removeIcon();

    iconEl = createIcon();
    container.appendChild(iconEl);

    // Position near top-right of selection
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    iconEl.style.position = 'fixed';
    iconEl.style.left = `${rect.right + 4}px`;
    iconEl.style.top = `${rect.top - 4}px`;

    // Adjust if icon would go off-screen
    const iconSize = 32;
    if (rect.right + iconSize + 8 > window.innerWidth) {
      iconEl.style.left = `${rect.left - iconSize - 4}px`;
    }
    if (rect.top - 4 < 0) {
      iconEl.style.top = `${rect.bottom + 4}px`;
    }
  }

  /**
   * Remove the floating icon.
   */
  function removeIcon() {
    if (iconEl && iconEl.parentNode) {
      iconEl.remove();
    }
    iconEl = null;
  }

  /**
   * Handle text selection after debounce.
   */
  const handleSelection = debounce(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || text.length === 0) {
      removeIcon();
      currentSelection = null;
      return;
    }

    // Don't trigger on selections within our own shadow DOM
    const anchorNode = selection.anchorNode;
    const host = container.getRootNode().host;
    if (anchorNode && (container.contains(anchorNode) || anchorNode === host || host.contains(anchorNode))) {
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        removeIcon();
        currentSelection = null;
        return;
      }

      currentSelection = { text, rect };
      showIcon(rect);
    } catch {
      removeIcon();
      currentSelection = null;
    }
  }, selectionDelay);

  // Listen for mouseup to detect text selection
  document.addEventListener('mouseup', handleSelection);

  // Dismiss on click outside
  document.addEventListener('mousedown', (e) => {
    // Don't dismiss if clicking on our icon or tooltip
    if (e.target && container.contains(e.target)) return;

    const path = e.composedPath();
    const host = container.getRootNode().host;
    if (path.some((el) => el === host)) return;

    removeIcon();
  });

  // Dismiss on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removeIcon();
      currentSelection = null;
    }
  });

  return { removeIcon };
}
