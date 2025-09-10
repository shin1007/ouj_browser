// パネル関係の共通関数（menu.jsから分離）
// パネル生成・表示・閉じる・検索ボックス生成

function openPanel({
  id,
  className,
  title,
  iconHtml,
  actionHtml = '',
  searchBoxHtml = '',
  listHtml = '',
  closeBtnId,
  contentClass,
  listClass,
  fetchData,
  renderList
}) {
  let panel = document.getElementById(id);
  if (panel) panel.remove();
  panel = createPanel({ id, className, ariaLabelledby: `${id}-title` });
  panel.innerHTML = window.createCommonPanelHTML({
    id,
    className,
    title,
    iconHtml,
    actionHtml,
    searchBoxHtml,
    listHtml,
    closeBtnId,
    contentClass,
    listClass
  });
  document.body.appendChild(panel);
  requestAnimationFrame(() => {
    panel.style.opacity = '1';
    panel.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  const closePanelRaw = () => {
    panel.style.opacity = '0';
    panel.style.transform = 'translate(-50%, -50%) scale(0.95)';
    setTimeout(() => { panel.remove(); }, 200);
  };
  const closePanel = setupPanelCloseEvents(panel, closePanelRaw, closeBtnId);
  if (typeof fetchData === 'function' && typeof renderList === 'function') {
    fetchData().then(data => { renderList(panel, closePanel, data); });
  }
  return panel;
}

function createSearchBoxHtml(type) {
  const id = type === 'history' ? 'history-search-input' : 'favorite-search-input';
  const boxClass = type === 'history' ? 'history-search-box' : 'favorite-search-box';
  const placeholder = 'コース名・親カテゴリ名で検索';
  return `
    <div class="${boxClass}" style="background: #232c3a; border-radius: 10px; padding: 4px 12px; margin: 0 24px 10px 24px; box-shadow: 0 2px 8px rgba(30,40,60,0.18); border: 1.5px solid #3a4658;">
      <input id="${id}" type="text" placeholder="${placeholder}" style="width: 100%; background: #232c3a; color: #fff; font-size: 14px; padding: 6px 8px; border-radius: 6px; letter-spacing: 0.5px;">
    </div>
  `;
}

function setupPanelCloseEvents(panel, closePanel, closeBtnId) {
  const closePanelOnOutsideClick = (event) => {
    if (document.getElementById('confirm-dialog')) return;
    if (!panel.contains(event.target)) closePanel();
  };
  const closePanelOnEscape = (event) => {
    if (event.key === 'Escape') closePanel();
  };
  setTimeout(() => {
    document.addEventListener('click', closePanelOnOutsideClick);
    document.addEventListener('keydown', closePanelOnEscape);
  }, 100);
  if (closeBtnId) {
    const closeBtn = document.getElementById(closeBtnId);
    if (closeBtn) closeBtn.onclick = () => { closePanel(); };
  }
  const cleanup = () => {
    document.removeEventListener('click', closePanelOnOutsideClick);
    document.removeEventListener('keydown', closePanelOnEscape);
  };
  return () => { closePanel(); cleanup(); };
}

function createPanel({ id, className, ariaLabelledby, ariaModal = 'true', mainId = 'main' }) {
  let panel = document.getElementById(id);
  if (panel) panel.remove();
  panel = document.createElement('div');
  panel.id = id;
  panel.className = className;
  panel.setAttribute('role', 'dialog');
  if (ariaLabelledby) panel.setAttribute('aria-labelledby', ariaLabelledby);
  if (ariaModal) panel.setAttribute('aria-modal', ariaModal);
  const main = document.getElementById(mainId);
  let mainWidth = '800px';
  let mainFont = '';
  let mainFontSize = '14px';
  if (main) {
    const style = window.getComputedStyle(main);
    mainWidth = style.width;
    mainFont = style.fontFamily;
    mainFontSize = style.fontSize;
  }
  Object.assign(panel.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    zIndex: 10000,
    minWidth: 'min(90vw, 600px)',
    minHeight: 'min(80vh, 480px)',
    maxHeight: '85vh',
    padding: '0',
    borderRadius: '12px 12px 0 0',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    background: '#232c3a',
    border: '1px solid rgba(255,255,255,0.2)',
    fontFamily: mainFont,
    fontSize: mainFontSize,
    width: mainWidth,
    transform: 'translate(-50%, -50%) scale(0.95)',
    opacity: '0',
    transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden'
  });
  return panel;
}

// 共通の動画カード描画関数
function renderVideoCard({
  contentId,
  categoryId,
  title,
  courseName,
  summary,
  progress = 0,
  dateStr = '',
  showDelete = false,
  onDelete = null,
  cardType = 'history', // 'history' or 'recommend'
  isDark = false,
  sourceLabel = '',
  sourceColor = ''
}) {
  const cardBg = isDark ? '#232c3a' : '#fff';
  const cardText = isDark ? '#fff' : '#222';
  const cardSubText = isDark ? '#b0b8c9' : '#666';
  const barBg = isDark ? '#374151' : '#e5e7eb';
  const barFg = isDark ? '#60a5fa' : '#3b82f6';
  const thumbBg = isDark ? '#444' : '#eee';
  const borderColor = isDark ? '#2d3748' : '#e5e7eb';
  const labelColor = isDark ? '#60a5fa' : '#3b82f6';
  const progressPercent = Math.floor(progress * 100);
  const thumb = contentId ? `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}/thumbnail/large2` : '';
  return `
    <div class="recommend-card" style="display:block;width:100%;background:${cardBg};border-radius:14px;box-shadow:0 2px 8px rgba(30,40,60,0.10);margin-bottom:8px;padding:0;position:relative;">
      <a href="https://v.ouj.ac.jp/view/ouj/#/navi/player?co=${contentId}&ct=V&ca=${categoryId || ''}" class="recommend-card-link" style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;text-decoration:none;color:inherit;position:relative;width:100%;">
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:110px;">
          <div style="display:block;width:110px;height:62px;background:${thumbBg};border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(30,40,60,0.10);">
            <img src="${thumb}" alt="サムネイル" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">
          </div>
          <div style="font-size:10px;color:${cardType === 'history' ? labelColor : sourceColor};background:${cardType === 'history' ? labelColor : sourceColor}20;padding:2px 6px;border-radius:4px;text-align:center;font-weight:500;width:fit-content;margin:0 auto;">
            ${cardType === 'history' ? dateStr : sourceLabel}
          </div>
        </div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;justify-content:center;">
          <div style="display:flex;align-items:baseline;gap:8px;">
            <div style="font-size:15px;font-weight:600;color:${cardText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">${title}</div>
            <div style="font-size:12px;color:${cardSubText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">${courseName || ''}</div>
          </div>
          <div style="font-size:12px;color:${cardSubText};margin:2px 0 4px 0;text-align:left;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;line-height:1.5;">${summary && summary.trim() ? summary.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'サマリー情報なし'}</div>
          <div style="height:7px;background:${barBg};border-radius:4px;overflow:hidden;width:100%;margin-top:4px;box-shadow:0 1px 2px rgba(30,40,60,0.08);">
            <div style="width:${progressPercent}%;height:100%;background:${barFg};"></div>
          </div>
        </div>
        ${showDelete ? `<button class="history-delete-btn" data-content-id="${contentId}" aria-label="この履歴を削除" title="削除" style="position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;z-index:2;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
          </svg>
        </button>` : ''}
      </a>
    </div>
  `;
}
// 汎用：パネル内リストアイテムのイベント登録
function setupListItemEvents(panel, selector, { onClick, onKeydown }) {
  const items = panel.querySelectorAll(selector);
  items.forEach((item, index) => {
    if (onClick) {
      item.addEventListener('click', (event) => onClick(event, item, index));
    }
    if (onKeydown) {
      item.addEventListener('keydown', (event) => onKeydown(event, item, index, items));
    }
  });
}
// グローバルwindowに関数を公開
window.setupListItemEvents = setupListItemEvents;
window.renderVideoCard = renderVideoCard;
window.openPanel = openPanel;
