// お気に入り機能（menu.jsから分離）
// ネイティブなカテゴリー一覧ページ（右ペイン）と同じ見た目で科目一覧を表示する
// オーバーレイの共通基盤はmenu-native-shell.jsを利用する

async function fetchFavoriteItems(favorites, categories) {
  const idToCategory = {};
  (Array.isArray(categories) ? categories : []).forEach((cat) => {
    idToCategory[cat.categoryId] = cat;
    idToCategory[cat.categoryId.toString()] = cat;
  });
  const pinned = window.getSetting('pinnedFavorites', []);
  return Promise.all(favorites.map(async (id) => {
    const category = idToCategory[id];
    const parentCategoryName = await window.getParentCategoryName(id);
    return {
      id,
      name: category ? category.name : `不明な科目 (ID: ${id})`,
      summary: category ? category.summary : '',
      parentCategoryName: parentCategoryName || 'その他',
      pinned: pinned.includes(id)
    };
  }));
}

async function createFavoriteListData() {
  const favorites = window.getSetting('favorites', []);
  if (!favorites.length) return [];
  const categories = await window.getCategoriesData();
  let items = await fetchFavoriteItems(favorites, categories);
  // キャッシュが古く科目名が引けなかった場合は強制的に再取得して1回だけ再試行する
  if (items[0] && items[0].name.startsWith('不明な科目')) {
    const freshCategories = await window.getCategoriesData(0);
    items = await fetchFavoriteItems(favorites, freshCategories);
  }
  return items;
}

function groupFavoriteItems(items) {
  const pinnedItems = items.filter((item) => item.pinned);
  const unpinnedItems = items.filter((item) => !item.pinned);
  const grouped = {};
  unpinnedItems.forEach((item) => {
    const key = item.parentCategoryName;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  const sortedNames = Object.keys(grouped).sort((a, b) => {
    const aNum = parseInt((a.match(/^[0-9]+/) || ['0'])[0], 10);
    const bNum = parseInt((b.match(/^[0-9]+/) || ['0'])[0], 10);
    return aNum - bNum;
  });
  return { pinnedItems, groups: sortedNames.map((name) => ({ name, items: grouped[name] })) };
}

function buildFavoriteItemHtml(item) {
  const extraHtml = window.buildPinToggleHtml(item.id, item.pinned) + window.buildFavoriteToggleHtml(item.id, true);
  return window.buildNativeCategoryItemHtml({
    text: item.name,
    buttonClass: 'favorite-course-button',
    dataAttrs: { 'category-id': item.id },
    extraHtml,
    subText: item.summary || ''
  });
}

function buildFavoriteListHtml(items) {
  if (!items.length) {
    return '<div style="padding:16px;color:#666;">該当するお気に入りはありません</div>';
  }
  const { pinnedItems, groups } = groupFavoriteItems(items);
  let html = '';
  if (pinnedItems.length) {
    html += window.buildNativeSectionHeaderHtml('ピン止め');
    html += pinnedItems.map(buildFavoriteItemHtml).join('');
  }
  groups.forEach((group) => {
    html += window.buildNativeSectionHeaderHtml(group.name);
    html += group.items.map(buildFavoriteItemHtml).join('');
  });
  return html;
}

function handleFavoritesPanelOpen() {
  window.openNativeOverlay((overlay) => {
    let allItems = [];
    let filterValue = '';

    // お気に入り星・ピン止めボタンは表示を更新するたびに作り直すので、
    // イベントリスナーもその都度再登録する
    function wireListEvents() {
      overlay.querySelectorAll('.favorite-course-button').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          if (event.target.closest('.favorite-btn') || event.target.closest('.pin-btn')) return;
          const categoryId = btn.getAttribute('data-category-id');
          if (categoryId) {
            window.removeNativeOverlay();
            window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=${categoryId}`;
          }
        });
      });
      overlay.querySelectorAll('.favorite-btn').forEach((favBtn) => {
        const toggle = async (event) => {
          event.stopPropagation();
          event.preventDefault();
          if (favBtn.dataset.busy === '1') return;
          favBtn.dataset.busy = '1';
          const categoryId = favBtn.getAttribute('data-category-id');
          await window.toggleFavorite(categoryId);
          allItems = await createFavoriteListData();
          renderList();
        };
        favBtn.addEventListener('click', toggle);
        favBtn.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle(event);
          }
        });
      });
      overlay.querySelectorAll('.pin-btn').forEach((pinBtn) => {
        const togglePin = async (event) => {
          event.stopPropagation();
          event.preventDefault();
          if (pinBtn.dataset.busy === '1') return;
          pinBtn.dataset.busy = '1';
          const categoryId = pinBtn.getAttribute('data-category-id');
          let pinned = window.getSetting('pinnedFavorites', []);
          pinned = pinned.includes(categoryId) ? pinned.filter((id) => id !== categoryId) : [...pinned, categoryId];
          window.saveSetting('pinnedFavorites', pinned);
          allItems = await createFavoriteListData();
          renderList();
        };
        pinBtn.addEventListener('click', togglePin);
        pinBtn.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            togglePin(event);
          }
        });
      });
    }

    // 検索ボックスは全体を再描画すると入力中にフォーカスが切れてしまうため、
    // リスト部分（#favorite-native-list）だけを差し替える
    function renderList() {
      const keyword = filterValue.trim().toLowerCase();
      const filtered = keyword
        ? allItems.filter((item) => item.name.toLowerCase().includes(keyword) || item.parentCategoryName.toLowerCase().includes(keyword))
        : allItems;
      const listEl = overlay.querySelector('#favorite-native-list');
      if (listEl) listEl.innerHTML = buildFavoriteListHtml(filtered);
      wireListEvents();
    }

    overlay.innerHTML = window.renderNativeShellHtml({
      breadcrumbHtml: window.buildNativeBreadcrumbHtml([{ text: 'お気に入り' }]),
      extraAsideHtml: window.buildNativeSearchBoxHtml({ id: 'favorite-native-search', placeholder: '科目名・親カテゴリ名で検索' }),
      asideListHtml: '<div id="favorite-native-list" style="padding:16px;color:#666;">読み込み中...</div>'
    });

    const searchInput = overlay.querySelector('#favorite-native-search');
    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        filterValue = event.target.value;
        renderList();
      });
    }

    createFavoriteListData().then((items) => {
      // オーバーレイが（ナビゲーション等で）既に閉じられていれば描画しない
      if (!document.body.contains(overlay)) return;
      allItems = items;
      renderList();
    });
  });
}

// グローバルwindowに関数を公開
window.createFavoriteListData = createFavoriteListData;
window.handleFavoritesPanelOpen = handleFavoritesPanelOpen;
