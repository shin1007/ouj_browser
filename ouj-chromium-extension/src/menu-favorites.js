// お気に入り機能（menu.jsから分離）
// お気に入りリストの描画・データ取得・パネル操作関連

function createFavoriteListData() {
  const favorites = window.getSetting('favorites', []);
  return getPanelDataCoursePattern(favorites).then(({ categories, idToName, items: favoriteItemsWithParent }) => {
    function getPinnedFavorites() {
      try {
        return window.getSetting('pinnedFavorites', []);
      } catch (e) {
        return [];
      }
    }
    const pinnedFavorites = getPinnedFavorites();
    favoriteItemsWithParent.forEach(item => {
      item.pinned = pinnedFavorites.includes(item.id);
    });
    return { favorites, categories, idToName, favoriteItemsWithParent };
  });
}

function handleFavoritesPanelOpen() {
  window.openPanel({
    id: 'favorite-list-panel',
    className: 'favorite-panel',
    title: 'お気に入りコース一覧',
    iconHtml: window.getIconHtml('favorite'),
    actionHtml: '',
    searchBoxHtml: window.createSearchBoxHtml('favorite'),
    listHtml: '',
    closeBtnId: 'close-favorite-list-panel',
    contentClass: 'favorite-panel-content',
    listClass: 'favorite-list',
    fetchData: createFavoriteListData,
    renderList: renderFavoriteListHtml
  });
}

function removePinnedFavorite(categoryId) {
  let pinned = window.getSetting('pinnedFavorites', []);
  pinned = pinned.filter(id => id !== categoryId);
  window.saveSetting('pinnedFavorites', pinned);
  let saveResult = window.saveSetting('pinnedFavorites', pinned);
  if (saveResult && typeof saveResult.then === 'function') {
    saveResult.then(() => {
      if (window.prefetchRecommendListData) window.prefetchRecommendListData();
    });
  } else {
    if (window.prefetchRecommendListData) window.prefetchRecommendListData();
  }
}
// コースパターン（お気に入り）
async function getPanelDataCoursePattern(ids) {
  // ids: categoryIdの配列
  let categories = await window.getCategoriesData();
  const idToName = {};
  categories.forEach(cat => {
    idToName[cat.categoryId] = cat.name;
    idToName[cat.categoryId.toString()] = cat.name;
  });
  const items = await Promise.all(ids.map(async (id) => {
    const categoryName = idToName[id];
    const parentCategoryName = await window.getParentCategoryName(id);
    const displayName = categoryName || `不明なコース (ID: ${id})`;
    return {
      id: id,
      categoryName: displayName,
      parentCategoryName: parentCategoryName || 'その他',
      hasParent: !!parentCategoryName
    };
  }));
  if (items[0].categoryName.startsWith('不明なコース')){
    return await getPanelDataCoursePatternAgain(ids)
  }
  return { categories, idToName, items };
}
async function getPanelDataCoursePatternAgain(ids) {
  // ids: categoryIdの配列
  let categories = await window.getCategoriesData(minute=0);
  const idToName = {};
  categories.forEach(cat => {
    idToName[cat.categoryId] = cat.name;
    idToName[cat.categoryId.toString()] = cat.name;
  });
  const items = await Promise.all(ids.map(async (id) => {
    const categoryName = idToName[id];
    const parentCategoryName = await window.getParentCategoryName(id);
    const displayName = categoryName || `不明なコース (ID: ${id})`;
    return {
      id: id,
      categoryName: displayName,
      parentCategoryName: parentCategoryName || 'その他',
      hasParent: !!parentCategoryName
    };
  }));
  return { categories, idToName, items };
}

function renderFavoriteListHtml(panel, closePanel, { favorites, categories, idToName, favoriteItemsWithParent }) {
  let searchValue = '';
  function getPinnedFavorites() {
    try {
      return window.getSetting('pinnedFavorites', []);
    } catch (e) {
      return [];
    }
  }
  function setPinnedFavorites(pinned) {
    window.saveSetting('pinnedFavorites', pinned);
  }
  async function renderFavoriteList(filter = '') {
    const pinnedFavorites = getPinnedFavorites();
    // 毎回最新のpinned状態を反映
    favoriteItemsWithParent.forEach(item => {
      item.pinned = pinnedFavorites.includes(item.id);
    });
    let listHtml = '';
    if (favorites.length) {
      const filteredItems = filter.trim() ? favoriteItemsWithParent.filter(item => {
        const keyword = filter.trim().toLowerCase();
        return item.categoryName.toLowerCase().includes(keyword) || item.parentCategoryName.toLowerCase().includes(keyword);
      }) : favoriteItemsWithParent;
      const pinnedItems = filteredItems.filter(item => item.pinned);
      const unpinnedItems = filteredItems.filter(item => !item.pinned);
      const groupedFavorites = {};
      unpinnedItems.forEach(item => {
        const parentKey = item.parentCategoryName;
        if (!groupedFavorites[parentKey]) {
          groupedFavorites[parentKey] = [];
        }
        groupedFavorites[parentKey].push(item);
      });
      const sortedGroups = Object.entries(groupedFavorites).sort(([aName], [bName]) => {
        const aNum = parseInt(aName.match(/^[0-9]+/)?.[0] || '0', 10);
        const bNum = parseInt(bName.match(/^[0-9]+/)?.[0] || '0', 10);
        return aNum - bNum;
      });
      let pinnedHtml = '';
      if (pinnedItems.length) {
        pinnedHtml = `
          <div class="favorite-group">
            <div class="favorite-group-header" style="display:flex;align-items:center;gap:6px;">
              ${getIconHtml('pin')}
              ピン止め
            </div>
            <ul class="favorite-group-list">
              ${pinnedItems.map(item => `
                <li class="favorite-item" data-category-id="${item.id}" tabindex="0" role="button" aria-label="${item.categoryName}を開く">
                  <div class="favorite-item-content">
                    <div class="favorite-child-category">${item.categoryName}</div>
                  </div>
                  <button class="favorite-pin-btn" data-category-id="${item.id}" aria-label="ピンを外す" title="ピンを外す" style="background:none;border:none;cursor:pointer;padding:0 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${item.pinned ? '#ffd600' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M6 3v12l6-3 6 3V3"/></svg>
                  </button>
                  ${getIconHtml('arrow')}
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }
      const groupHtmls = sortedGroups.map(([parentName, items]) => {
        const sortedItems = items.sort((a, b) => {
          const aNum = parseInt(a.categoryName.match(/^[0-9]+/)?.[0] || '0', 10);
          const bNum = parseInt(b.categoryName.match(/^[0-9]+/)?.[0] || '0', 10);
          return aNum - bNum;
        });
        const itemsHtml = sortedItems.map(item => {
          return `<li class="favorite-item" data-category-id="${item.id}" tabindex="0" role="button" aria-label="${parentName}の${item.categoryName}を開く">
            <div class="favorite-item-content">
              <div class="favorite-child-category">${item.categoryName}</div>
            </div>
            <button class="favorite-pin-btn" data-category-id="${item.id}" aria-label="${item.pinned ? 'ピンを外す' : 'ピン止め'}" title="${item.pinned ? 'ピンを外す' : 'ピン止め'}" style="background:none;border:none;cursor:pointer;padding:0 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${item.pinned ? '#ffd600' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M6 3v12l6-3 6 3V3"/></svg>
            </button>
            ${getIconHtml('arrow')}
            </li>`;
        }).join('');
        return `
          <div class="favorite-group">
            <div class="favorite-group-header">${parentName}</div>
            <ul class="favorite-group-list">${itemsHtml}</ul>
          </div>
        `;
      });
      listHtml = pinnedHtml + groupHtmls.join('');
      if (!filteredItems.length) {
        listHtml = '<li class="favorite-empty">該当するお気に入りはありません</li>';
      }
    } else {
      listHtml = '<li class="favorite-empty">お気に入りはありません</li>';
    }
    const listContainer = panel.querySelector('.favorite-list');
    if (listContainer) {
      listContainer.innerHTML = listHtml;
    }
    // setupListItemEventsで共通化
    window.setupListItemEvents(panel, '.favorite-item', {
      onClick: (event, item) => {
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
    attachPinButtonListeners();
  }
  function attachPinButtonListeners() {
    const pinButtons = panel.querySelectorAll('.favorite-pin-btn');
    pinButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const categoryId = button.getAttribute('data-category-id');
        let pinned = getPinnedFavorites();
        if (pinned.includes(categoryId)) {
          pinned = pinned.filter(id => id !== categoryId);
        } else {
          pinned.push(categoryId);
        }
        setPinnedFavorites(pinned);
        renderFavoriteList(searchValue);
      });
    });
  }
  // 検索ボックスイベント
  const searchInput = panel.querySelector('#favorite-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchValue = e.target.value;
      renderFavoriteList(searchValue);
    });
  }
  renderFavoriteList('');
}
window.createFavoriteListData = createFavoriteListData;
window.handleFavoritesPanelOpen = handleFavoritesPanelOpen;
window.removePinnedFavorite = removePinnedFavorite;
