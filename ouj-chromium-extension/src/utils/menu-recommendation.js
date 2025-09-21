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
    const video = await window.getVideoData(contentId);
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
            progress: await window.getVideoProgress(nextVideo.contentId) || 0,
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
    // 未再生の動画を1件だけ追加
    for (let i = 0; i < videos.length; i++) {
      const status = await window.getVideoProgress(videos[i].contentId);
      if (status < 0.95) {
        recommendList.push({ ...videos[i], progress: status || 0, source: 'favorites' });
        usedCategoryIds.add(categoryId);
        break;
      }
    }
  }
  return { recommendList, usedCategoryIds };
}

/**
 * 2つの文字列のレーベンシュタイン距離を計算する
 * @param {string} s1
 * @param {string} s2
 * @returns {number} レーベンシュタイン距離
 */
function levenshteinDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

/**
 * 2つの文字列の類似度を計算する (0-1の範囲)
 * @param {string} s1
 * @param {string} s2
 * @returns {number} 類似度
 */
function calculateSimilarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - levenshteinDistance(longer, shorter)) / longerLength;
}

/**
 * 2つの名詞リストからJaccard係数を計算して意味的な類似度を算出する
 * @param {string[]} nouns1
 * @param {string[]} nouns2
 * @returns {number} 類似度 (0-1)
 */
function calculateJaccardSimilarity(nouns1, nouns2) {
  const set1 = new Set(nouns1);
  const set2 = new Set(nouns2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * 類似している3件（履歴・お気に入りの合計7コースと重複がない3コース）
 * 履歴やお気に入りのコース名と類似したコースをおすすめする
 */
async function getRecommendFromSimilar(allCategories, excludeCategoryIds) {
  if (!Array.isArray(allCategories) || !allCategories.length) return [];
  console.log('allCategories', allCategories);
  // kuromoji.jsのTokenizerを準備
  await window.getTokenizer();

  // 除外対象コースの名詞リストとエイリアスを作成
  const excludeNounsList = [];
  const excludeCategoryAliases = new Set();

  for (const category of allCategories) {
    if (excludeCategoryIds.has(category.categoryId)) {
      const aliasNum = (category.alias || '').match(/^[0-9]+/);
      if (aliasNum) {
        excludeCategoryAliases.add(aliasNum[0]);
        const nouns = await window.extractNouns(category.name);
        if (nouns.length > 0) {
          excludeNounsList.push(nouns);
        }
      }
    }
  }

  if (excludeNounsList.length === 0) return [];
  console.log('excludeNounsList', excludeNounsList);

  const candidatePromises = allCategories.map(async (category) => {
    if (excludeCategoryIds.has(category.categoryId)) return null;
    const aliasNum = (category.alias || '').match(/^[0-9]+/);
    if (aliasNum && excludeCategoryAliases.has(aliasNum[0])) return null;
    if (aliasNum === null) return null;

    const nouns = await window.extractNouns(category.name);
    if (nouns.length === 0) return null;

    let maxSimilarity = 0;
    for (const excludeNouns of excludeNounsList) {
      const similarity = calculateJaccardSimilarity(nouns, excludeNouns);
      if (similarity > maxSimilarity) maxSimilarity = similarity;
    }
    return { ...category, similarity: maxSimilarity };
  });

  const candidates = (await Promise.all(candidatePromises)).filter(Boolean);

  candidates.sort((a, b) => b.similarity - a.similarity);

  // 
  let recommendList = [];
  let count = 0;
  const usedContentIds = new Set();

  for (const category of candidates) {
    if (count >= 3) break;
    if (category.similarity < 0.3) continue;
    const videos = await window.getVideoListInCategory(category.categoryId);
    if (!Array.isArray(videos) || !videos.length) continue;
    for (const video of videos) {
      if (usedContentIds.has(video.contentId)) continue;
      const status = await window.getVideoProgress(video.contentId);
      if (status < 0.95) {
        recommendList.push({ ...video, progress: status || 0, source: 'similar' });
        usedContentIds.add(video.contentId);
        count++;
        break;
      }
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
  const allExcludeIds = new Set([...usedFromFavorites]);
  const similarList = await getRecommendFromSimilar(categories, allExcludeIds);
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
    contentClass: 'recommend-panel-content',
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
    panel.querySelector('.recommend-panel-content').innerHTML = `<div class=\"history-list\">${listHtml}</div>`;
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