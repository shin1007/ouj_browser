// 共通パネル生成用モジュール
// createPanel({ id, title, items, searchPlaceholder, onSearch, renderItem })

/**
 * 共通パネル生成関数
 * @param {Object} options
 * @param {string} options.id - パネルのDOM id
 * @param {string} options.title - パネルタイトル
 * @param {Array} options.items - リスト表示するデータ配列
 * @param {string} [options.searchPlaceholder] - 検索ボックスのプレースホルダー
 * @param {function(string):Array} [options.onSearch] - 検索時のフィルタ関数（引数: 検索ワード, 戻り値: フィルタ済みitems）
 * @param {function(any):HTMLElement} options.renderItem - リストアイテム描画関数
 * @param {function} [options.onClose] - パネルを閉じる時のコールバック
 */
export function createPanel({ id, title, items, searchPlaceholder = '', onSearch, renderItem, onClose }) {
  // 既存パネルがあれば削除
  let panel = document.getElementById(id);
  if (panel) panel.remove();

  panel = document.createElement('div');
  panel.id = id;
  panel.className = 'ouj-panel-base';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');

  // スタイル適用（必要に応じてカスタマイズ）
  Object.assign(panel.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(90vw, 600px)',
    minHeight: '400px',
    maxHeight: '80vh',
    background: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '#1a2230' : '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    padding: '0',
    zIndex: '9999',
    overflow: 'hidden',
    opacity: '0',
    transition: 'opacity 0.2s, transform 0.2s',
    border: '1px solid rgba(255,255,255,0.2)'
  });

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'ouj-panel-header';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '16px 24px 8px 24px';
  header.style.background = 'none';

  const titleElem = document.createElement('span');
  titleElem.textContent = title;
  titleElem.style.fontWeight = 'bold';
  titleElem.style.fontSize = '18px';
  header.appendChild(titleElem);

  // 閉じるボタン
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.marginLeft = '16px';
  closeBtn.addEventListener('click', () => {
    panel.remove();
    if (typeof onClose === 'function') onClose();
  });
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // 検索ボックス
  let filteredItems = items;
  let listArea;
  if (searchPlaceholder) {
    const searchBox = document.createElement('div');
    searchBox.style.padding = '0 24px 12px 24px';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = searchPlaceholder;
    input.style.width = '100%';
    input.style.background = '#232c3a';
    input.style.color = '#fff';
    input.style.border = 'none';
    input.style.outline = 'none';
    input.style.fontSize = '16px';
    input.style.padding = '10px 12px';
    input.style.borderRadius = '6px';
    input.style.letterSpacing = '0.5px';
    searchBox.appendChild(input);
    panel.appendChild(searchBox);

    input.addEventListener('input', () => {
      const value = input.value.trim();
      filteredItems = (typeof onSearch === 'function') ? onSearch(value) : items;
      renderList();
    });
  }

  // リストエリア
  listArea = document.createElement('div');
  listArea.className = 'ouj-panel-list-area';
  listArea.style.overflowY = 'auto';
  listArea.style.maxHeight = 'calc(80vh - 80px)';
  listArea.style.padding = '0 24px 24px 24px';
  panel.appendChild(listArea);

  // リスト描画関数
  function renderList() {
    listArea.innerHTML = '';
    (filteredItems || []).forEach(item => {
      const elem = renderItem(item);
      if (elem) listArea.appendChild(elem);
    });
  }
  renderList();

  // フェードイン
  setTimeout(() => {
    panel.style.opacity = '1';
    panel.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);

  document.body.appendChild(panel);
  return panel;
} 