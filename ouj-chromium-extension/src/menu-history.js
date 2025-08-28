// 履歴機能（menu.jsから分離）
// 履歴リストの描画・データ取得・パネル操作関連

function renderHistoryListByDate(filteredItems) {
  if (!filteredItems.length) {
    return '<li class="history-empty">該当する履歴はありません</li>';
  }
  const sortedItems = filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));
  return sortedItems.map((item, index) => {
    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const title = item.title || `コース (ID: ${item.categoryId})`;
    return `<li class="history-item" data-category-id="${item.categoryId}" tabindex="0" role="button" aria-label="${title}を開く">
      <div class="history-item-content">
        <div class="history-title">${title}</div>
        <div class="history-date">${dateStr}</div>
      </div>
      <button class="history-delete-btn" data-date="${item.date}" data-category-id="${item.categoryId}" aria-label="${title}を履歴から削除" title="削除">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
        </svg>
      </button>
      <svg class="history-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </li>`;
  }).join('');
}

function renderHistoryListByGroup(filteredItems) {
  if (!filteredItems.length) {
    return '<li class="history-empty">該当する履歴はありません</li>';
  }
  const groupedHistory = {};
  filteredItems.forEach(item => {
    const date = new Date(item.date);
    const dateKey = date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (!groupedHistory[dateKey]) groupedHistory[dateKey] = [];
    groupedHistory[dateKey].push(item);
  });
  const sortedGroups = Object.entries(groupedHistory).sort(([aDate], [bDate]) => new Date(bDate) - new Date(aDate));
  const groupHtmls = sortedGroups.map(([dateKey, items]) => {
    const sortedItems = items.sort((a, b) => new Date(b.date) - new Date(a.date));
    const itemsHtml = sortedItems.map((item, index) => {
      const date = new Date(item.date);
      const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const title = item.title || `コース (ID: ${item.categoryId})`;
      return `<li class="history-item" data-category-id="${item.categoryId}" tabindex="0" role="button" aria-label="${title}を開く">
        <div class="history-item-content">
          <div class="history-title">${title}</div>
          <div class="history-date">${timeStr}</div>
        </div>
        <button class="history-delete-btn" data-date="${item.date}" data-category-id="${item.categoryId}" aria-label="${title}を履歴から削除" title="削除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
          </svg>
        </button>
        <svg class="history-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </li>`;
    }).join('');
    return `<div class="history-group"><div class="history-group-header">${dateKey}</div><ul class="history-group-list">${itemsHtml}</ul></div>`;
  });
  return groupHtmls.join('');
}

function createHistoryListData() {
  let history = [];
  try {
    history = window.getSetting('history', []);
  } catch (e) {
    history = [];
  }
  const contentIds = history.map(item => item.contentId).filter(Boolean);
  return Promise.all(contentIds.map(async (contentId) => {
    try {
      const video = await window.getVideoData(contentId) || {};
      if (!video.title) throw new Error('動画情報取得失敗');
      const h = history.find(h => h.contentId == contentId) || {};
      return { ...video, progress: h.progress, date: h.date, contentId };
    } catch (e) {
      return null;
    }
  })).then(videoItems => {
    const validVideoItems = videoItems.filter(Boolean);
    return window.getCategoriesData().then(categories => {
      return { history, categories, validVideoItems };
    });
  });
}

function handleHistoryPanelOpen() {
  window.openPanel({
    id: 'history-list-panel',
    className: 'history-panel',
    title: '履歴一覧',
    iconHtml: window.getIconHtml('history'),
    actionHtml: `<button id="clear-all-history" class="history-clear-all-btn" aria-label="履歴を全て削除" title="全削除" style="background:none;border:none;cursor:pointer;padding:0 8px;display:flex;align-items:center;">${window.getIconHtml('delete')}</button>`,
    searchBoxHtml: window.createSearchBoxHtml('history'),
    listHtml: '',
    closeBtnId: 'close-history-list-panel',
    contentClass: 'history-panel-content',
    listClass: 'history-list',
    fetchData: createHistoryListData,
    renderList: renderHistoryListHtml
  });
}

function renderHistoryListHtml(panel, closePanel, { history, categories, validVideoItems }) {
  let searchValue = '';
  let currentSortType = 'date';
  async function renderHistoryList(filter = '', sortType = 'date') {
    let listHtml = '';
    if (history.length) {
      const filteredItems = filter.trim() ? validVideoItems.filter(item => {
        const keyword = filter.trim().toLowerCase();
        return (item.title || '').toLowerCase().includes(keyword) || (item.categoryId && Array.isArray(categories) && categories.find(c => c.categoryId == item.categoryId)?.name?.toLowerCase().includes(keyword));
      }) : validVideoItems;
      const sortedItems = filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));
      listHtml = sortedItems.map(item => {
        const title = item.title || `動画 (ID: ${item.contentId})`;
        let courseName = '';
        if (item.categoryId && Array.isArray(categories)) {
          const cat = categories.find(c => c.categoryId == item.categoryId);
          courseName = cat ? cat.name : '';
          courseName = courseName.replace(/^[0-9]+\s*/, '');
          courseName = courseName.replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
        }
        const summary = item.summary || '';
        const progress = item.progress || 0;
        const date = new Date(item.date);
        const dateStr = date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return window.renderVideoCard({
          contentId: item.contentId,
          categoryId: item.categoryId,
          title,
          courseName,
          summary,
          progress,
          dateStr,
          showDelete: true,
          cardType: 'history',
          isDark
        });
      }).join('');
    } else {
      listHtml = '<div class="history-empty" style="color:#222;padding:16px;text-align:center;">履歴はありません</div>';
    }
    const listContainer = panel.querySelector('.history-list');
    if (listContainer) {
      listContainer.innerHTML = listHtml;
      const cards = listContainer.querySelectorAll('.recommend-card');
      cards.forEach(card => {
        card.addEventListener('click', (event) => {
          if (event.target.closest('.history-delete-btn')) return;
          closePanel();
        });
      });
    }
    const clearAllBtn = panel.querySelector('#clear-all-history');
    if (clearAllBtn) {
      clearAllBtn.style.display = history.length > 0 ? 'flex' : 'none';
    }
    // setupListItemEventsで共通化
    window.setupListItemEvents(panel, '.history-item', {
      onClick: (event, item) => {
        if (event.target.closest('.history-delete-btn')) {
          return;
        }
        event.preventDefault();
        const categoryId = item.getAttribute('data-category-id');
        if (categoryId) {
          closePanel();
          setTimeout(() => {
            window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
          }, 200);
        }
      },
      onKeydown: (event, item, index, items) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          item.click();
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextItem = items[index + 1];
          if (nextItem) nextItem.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prevItem = items[index - 1];
          if (prevItem) prevItem.focus();
        }
      }
    });
    attachDeleteButtonListeners();
  }
  function attachDeleteButtonListeners() {
    const deleteBtns = panel.querySelectorAll('.history-delete-btn');
    deleteBtns.forEach(btn => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const contentId = btn.getAttribute('data-content-id');
        let history = [];
        try {
          history = window.getSetting('history', []);
        } catch (e) {
          history = [];
        }
        history = history.filter(item => item.contentId !== contentId);
        window.saveSetting('history', history);
        // 履歴削除後におすすめリストをプリフェッチ
        window.prefetchRecommendListData();
        const card = btn.closest('.recommend-card');
        if (card) {
          card.remove();
        }
        const listContainer = panel.querySelector('.history-list');
        if (listContainer && listContainer.children.length === 0) {
          listContainer.innerHTML = `<div class=\"history-empty\" style=\"color:#222;padding:16px;text-align:center;\">履歴はありません</div>`;
        }
      };
    });
  }
  async function clearAllHistory() {
    if (history.length === 0) return;
    if (typeof window.showConfirmDialog === 'function') {
      const confirmed = await window.showConfirmDialog(
        `履歴を全て削除しますか？（${history.length}件）`,
        '履歴の全削除'
      );
      if (confirmed) {
        history = [];
        window.saveSetting('history', history);
        renderHistoryList();
      }
    } else {
      if (confirm(`履歴を全て削除しますか？（${history.length}件）`)) {
        history = [];
        window.saveSetting('history', history);
        renderHistoryList();
      }
    }
  }
  setTimeout(() => {
    const clearAllBtn = panel.querySelector('#clear-all-history');
    if (clearAllBtn) {
      clearAllBtn.onclick = () => {
        clearAllHistory();
      };
    }
  }, 0);
  const searchInput = panel.querySelector('#history-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchValue = e.target.value;
      renderHistoryList(searchValue, currentSortType);
    });
  }
  renderHistoryList('', currentSortType);
}

// グローバルwindowに関数を公開
window.handleHistoryPanelOpen = handleHistoryPanelOpen;
