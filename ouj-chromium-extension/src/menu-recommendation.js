// おすすめ機能（menu.jsから分離）
// 履歴・お気に入り・カテゴリからおすすめ動画リストを生成

/**
 * 履歴から最大2件（2コース）を選定
 */
async function getRecommendFromHistory(history) {
  let recommendList = [];
  let usedCategoryIds = new Set();
  let usedContentIds = new Set();
  let count = 0;
  for (let i = 0; i < history.length && count < 2; i++) {
    const historyItem = history[i];
    const { contentId, progress, date } = historyItem;
    if (!contentId) continue;
    if (usedContentIds.has(contentId)) continue;
    let video = null;
    try {
      const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}`;
      video = await window.fetchWithCache(url, `cachedVodContent_${contentId}`) || {};
    } catch (e) { continue; }
    if (!video || !video.contentId) continue;
    if (progress < 0.95) {
      recommendList.push({
        ...video,
        progress,
        source: 'history',
        dateStr: new Date(date).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
      usedContentIds.add(contentId);
      usedCategoryIds.add(video.categoryId);
      count++;
      continue;
    } else {
      const categoryId = video.categoryId;
      if (!categoryId) continue;
      const cacheKey = `cachedVodContents_${categoryId}`;
      let videos = [];
      try {
        if (typeof window.fetchWithCache === 'function') {
          videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
        }
      } catch (e) {}
      if (!Array.isArray(videos) || !videos.length) continue;
      const idx = videos.findIndex(v => v.contentId == contentId);
      if (idx !== -1 && idx + 1 < videos.length) {
        const nextVideo = videos[idx + 1];
        if (nextVideo && !usedContentIds.has(nextVideo.contentId) && !history.some(h => h.contentId == nextVideo.contentId)) {
          recommendList.push({
            ...nextVideo,
            progress: 0,
            source: 'history',
            dateStr: ''
          });
          usedContentIds.add(nextVideo.contentId);
          usedCategoryIds.add(nextVideo.categoryId);
          count++;
        }
      }
    }
  }
  return { recommendList, usedCategoryIds, usedContentIds };
}

/**
 * お気に入りから最大5件（履歴で選ばれた2コースと重複しない5コース）
 */
async function getRecommendFromFavorites(favorites, excludeCategoryIds) {
  let recommendList = [];
  let usedCategoryIds = new Set(excludeCategoryIds);
  if (!favorites.length) return { recommendList, usedCategoryIds };
  favorites = favorites.slice();
  for (let i = favorites.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [favorites[i], favorites[j]] = [favorites[j], favorites[i]];
  }
  for (const categoryId of favorites) {
    if (recommendList.length >= 5) break;
    if (usedCategoryIds.has(categoryId)) continue;
    const cacheKey = `cachedVodContents_${categoryId}`;
    let videos = [];
    try {
      if (typeof window.fetchWithCache === 'function') {
        videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
      }
    } catch (e) {}
    if (!Array.isArray(videos) || !videos.length) continue;
    const contentIds = videos.map(v => v.contentId);
    const statusList = await window.getMultipleVideoViewingStatus(contentIds);
    let found = null;
    let foundStatus = null;
    for (let i = 0; i < videos.length; i++) {
      const status = statusList[i];
      if (status.currentTimeRate < 0.95) {
        found = videos[i];
        foundStatus = status;
        break;
      }
    }
    if (found) {
      recommendList.push({ ...found, progress: foundStatus ? foundStatus.currentTimeRate : 0, source: 'favorites' });
      usedCategoryIds.add(categoryId);
    }
  }
  return { recommendList, usedCategoryIds };
}

/**
 * 類似している3件（履歴・お気に入りの合計7コースと重複がない3コース）
 * 仮実装：カテゴリ一覧から重複しないものを3件選ぶ
 */
async function getRecommendFromSimilar(categories, excludeCategoryIds) {
  let recommendList = [];
  let count = 0;
  for (const cat of categories) {
    if (count >= 3) break;
    if (excludeCategoryIds.has(cat.categoryId)) continue;
    const cacheKey = `cachedVodContents_${cat.categoryId}`;
    let videos = [];
    try {
      if (typeof window.fetchWithCache === 'function') {
        videos = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${cat.categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
      }
    } catch (e) {}
    if (!Array.isArray(videos) || !videos.length) continue;
    const contentIds = videos.map(v => v.contentId);
    const statusList = await window.getMultipleVideoViewingStatus(contentIds);
    let found = null;
    let foundStatus = null;
    for (let i = 0; i < videos.length; i++) {
      const status = statusList[i];
      if (status.currentTimeRate < 0.95) {
        found = videos[i];
        foundStatus = status;
        break;
      }
    }
    if (found) {
      recommendList.push({ ...found, progress: foundStatus ? foundStatus.currentTimeRate : 0, source: 'similar' });
      excludeCategoryIds.add(cat.categoryId);
      count++;
    }
  }
  return recommendList;
}

/**
 * おすすめ動画リスト生成関数
 */
async function createRecommendListData() {
  let favorites = (typeof window.getFavorites === 'function') ? window.getFavorites() : [];
  let history = (typeof window.getSetting === 'function') ? window.getSetting('history', []) : [];
  const categories = await window.getCategoriesData();
  const { recommendList: historyList, usedCategoryIds: usedFromHistory, usedContentIds } = await getRecommendFromHistory(history);
  const { recommendList: favoriteList, usedCategoryIds: usedFromFavorites } = await getRecommendFromFavorites(favorites, usedFromHistory);
  const excludeCategoryIds = new Set([...usedFromFavorites]);
  const similarList = await getRecommendFromSimilar(categories, excludeCategoryIds);
  return [...historyList, ...favoriteList, ...similarList];
}

function handleRecommendPanelOpen() {
  // ダミーカードHTML生成は従来通り
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const cardBg = isDark ? '#232c3a' : '#fff';
  const cardText = isDark ? '#fff' : '#222';
  const cardSubText = isDark ? '#b0b8c9' : '#666';
  const barBg = isDark ? '#374151' : '#e5e7eb';
  const thumbBg = isDark ? '#444' : '#eee';
  const dummyCards = Array.from({ length: 5 }, (_, i) => `
    <div class="recommend-card" style="display:block;width:100%;background:${cardBg};border-radius:14px;box-shadow:0 2px 8px rgba(30,40,60,0.10);margin-bottom:8px;padding:0;opacity:0.7;">
      <div style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;">
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:110px;">
          <div style="display:block;width:110px;height:62px;background:${thumbBg};border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(30,40,60,0.10);animation:pulse 1.5s ease-in-out infinite;"></div>
          <div style="font-size:10px;color:${isDark ? '#60a5fa' : '#3b82f6'};background:${isDark ? '#60a5fa20' : '#3b82f620'};padding:2px 6px;border-radius:4px;text-align:center;font-weight:500;width:fit-content;margin:0 auto;animation:pulse 1.5s ease-in-out infinite;">取得中</div>
        </div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;justify-content:center;">
          <div style="display:flex;align-items:baseline;gap:8px;">
            <div style="font-size:15px;font-weight:600;color:${cardText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;height:18px;background:${barBg};border-radius:4px;animation:pulse 1.5s ease-in-out infinite;"></div>
            <div style="font-size:12px;color:${cardSubText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;height:14px;background:${barBg};border-radius:4px;width:80px;animation:pulse 1.5s ease-in-out infinite;"></div>
          </div>
          <div style="font-size:12px;color:${cardSubText};margin:2px 0 4px 0;text-align:left;height:36px;background:${barBg};border-radius:4px;animation:pulse 1.5s ease-in-out infinite;"></div>
          <div style="height:7px;background:${barBg};border-radius:4px;overflow:hidden;width:100%;margin-top:4px;box-shadow:0 1px 2px rgba(30,40,60,0.08);animation:pulse 1.5s ease-in-out infinite;"></div>
        </div>
      </div>
    </div>
  `).join('');
  window.openPanel({
    id: 'recommend-list-panel',
    className: 'recommend-panel',
    title: 'おすすめ動画',
    iconHtml: getIconHtml('recommend'),
    actionHtml: '',
    searchBoxHtml: '',
    listHtml: dummyCards,
    closeBtnId: 'close-recommend-list-panel',
    contentClass: 'history-panel-content',
    listClass: 'history-list',
    fetchData: async () => {
      // キャッシュがあれば即返す。なければ取得
      if (window.oujRecommendCache && window.oujRecommendCache.data) {
        // 裏で再取得も走らせておく
        prefetchRecommendListData();
        return window.oujRecommendCache.data;
      } else {
        const data = await createRecommendListData();
        window.oujRecommendCache = { data, lastFetched: Date.now() };
        return data;
      }
    },
    renderList: renderRecommendListHtml
  });
}

function renderRecommendListHtml(panel, closePanel, recommendList) {
  let categories = [];
  if (typeof window.getCategoriesData === 'function') {
    window.getCategoriesData().then(cats => { categories = cats; render(); });
  } else {
    render();
  }
  function render() {
    let isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let listHtml = recommendList.map(item => {
      let thumb = '';
      if (item.contentId) {
        thumb = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}/thumbnail/large2`;
      }
      if (!thumb) {
        thumb = item.thumbnailUrl || item.imageUrl || '';
      }
      if (!thumb && item.contentId) {
        thumb = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}/thumbnail`;
      }
      let courseName = '';
      if (Array.isArray(categories) && item.categoryId) {
        const cat = categories.find(c => c.categoryId == item.categoryId);
        courseName = cat ? cat.name : '';
        courseName = courseName.replace(/^[0-9]+\s*/, '');
        courseName = courseName.replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
      }
      let sourceLabel = '', sourceColor = '';
      if (item.source === 'history') {
        sourceLabel = '履歴';
        sourceColor = isDark ? '#60a5fa' : '#3b82f6';
      } else if (item.source === 'favorites') {
        sourceLabel = 'お気に入り';
        sourceColor = isDark ? '#fbbf24' : '#f59e0b';
      } else if (item.source === 'similar') {
        sourceLabel = '類似';
        sourceColor = isDark ? '#10b981' : '#059669';
      }
      const summary = item.summary || '';
      let progress = item.progress || 0;
      const dateStr = item.dateStr || '';
      return window.renderVideoCard({
        contentId: item.contentId,
        categoryId: item.categoryId,
        title: item.title,
        courseName,
        summary,
        progress,
        dateStr,
        showDelete: false,
        cardType: 'recommend',
        isDark,
        sourceLabel,
        sourceColor
      });
    }).join('');
    if (!listHtml) listHtml = `<div class=\"history-empty\" style=\"color:${isDark ? '#fff' : '#222'};padding:16px;text-align:center;\">おすすめ動画はありません（全て再生済み）</div>`;
    panel.querySelector('.history-panel-content').innerHTML = `<div class=\"history-list\">${listHtml}</div>`;
    // setupListItemEventsで共通化
    window.setupListItemEvents(panel, '.recommend-card', {
      onClick: (event, item) => {
        closePanel();
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
    // console.log('[おすすめ描画] recommendList:', recommendList.map(item => ({
    //   contentId: item.contentId,
    //   source: item.source,
    //   progress: item.progress,
    //   title: item.title,
    //   dateStr: item.dateStr
    // })));
  }
}
window.oujRecommendCache = {
  data: null,
  lastFetched: 0
};

async function prefetchRecommendListData() {
  window.oujRecommendCache.data = await createRecommendListData();
  window.oujRecommendCache.lastFetched = Date.now();
}
// グローバルwindowに関数を公開
window.prefetchRecommendListData = prefetchRecommendListData;
window.createRecommendListData = createRecommendListData;
window.handleRecommendPanelOpen = handleRecommendPanelOpen;