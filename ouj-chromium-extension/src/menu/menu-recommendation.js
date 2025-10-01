// おすすめ機能（menu.jsから分離）
// 履歴・お気に入り・カテゴリからおすすめ動画リストを生成

/**
 * 視聴履歴に基づいて最大2件のおすすめ動画を選定します。
 * 1. 視聴途中の動画があれば、それを「続きから見る」として推薦します。
 * 2. 視聴完了した動画があれば、そのコースの次の未視聴動画を推薦します。
 * @param {Array<Object>} history - 視聴履歴の配列。各要素は { contentId, progress, date } を含みます。
 * @returns {Promise<Object>} おすすめ動画リスト、使用済みカテゴリIDセット、使用済みコンテンツIDセットを含むオブジェクト。
 */
async function getRecommendFromHistory(history) {
  // おすすめ動画の最大件数を定義
  const reccomendFromHistoryLength = 2;
  // 返却するおすすめ動画のリスト
  let recommendList = [];
  // 同じカテゴリから重複して推薦しないように、使用したカテゴリIDを記録
  let usedCategoryIds = new Set();
  // 同じ動画を重複して推薦しないように、使用したコンテンツIDを記録
  let usedContentIds = new Set();
  // historyをランダムに並べ替え
  for (let i = history.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [history[i], history[j]] = [history[j], history[i]];
  }

  // 履歴をループし、最大件数に達するまでおすすめを選定
  for (let i = 0; i < history.length; i++) {
    const historyItem = history[i];
    // && count < reccomendFromHistoryLength
    const { contentId, progress, date } = historyItem;

    // 不正なデータはスキップ
    if (!contentId) continue;
    if (usedContentIds.has(contentId)) continue;

    // 動画情報を取得
    const video = await window.getVideoData(contentId);
    if (!video || !video.contentId) continue;
    usedCategoryIds.add(video.categoryId);
    if (recommendList.length + 1 > reccomendFromHistoryLength*2) continue;
    // パターン1: 視聴が完了していない動画 (進捗率95%未満)
    if (progress < 0.95) {
      // 「続きから見る」おすすめとしてリストに追加
      console.log('履歴からおすすめ追加', video.progress, video.title);
      recommendList.push({
        ...video,
        progress,
        source: 'history',
        dateStr: new Date(date).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
      // 使用済みIDとして記録
      usedContentIds.add(contentId);
      continue;
    } else {
      // パターン2: 視聴完了済みの動画 (進捗率95%以上)
      const categoryId = video.categoryId;
      if (!categoryId) continue;

      // 同じカテゴリ（コース）の動画リストを取得
      const videos = await window.getVideoListInCategory(categoryId);
      if (!Array.isArray(videos) || !videos.length) continue;

      // 現在の動画のインデックスを探し、次の動画を取得
      const idx = videos.findIndex(v => v.contentId == contentId);
      if (idx !== -1 && idx + 1 < videos.length) {
        const nextVideo = videos[idx + 1];
        // 次の動画が未視聴であれば、おすすめとしてリストに追加
        if (!nextVideo) continue;
        if (usedContentIds.has(nextVideo.contentId)) continue;
        if (history.some(h => h.contentId == nextVideo.contentId)) continue;

        const progress = await window.getVideoProgress(nextVideo.contentId);
        if (progress >= 0.95) continue; // 既に視聴済みならスキップ
        recommendList.push({
          ...nextVideo,
          progress,
          source: 'history',
          dateStr: ''
        });
        // 使用済みIDとして記録
        usedContentIds.add(nextVideo.contentId);
      }
    }
  }
  console.log(usedCategoryIds);
  // recommendListをランダムに最大件数（reccomendFromHistoryLength）に絞る
  for (let i = recommendList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recommendList[i], recommendList[j]] = [recommendList[j], recommendList[i]];
  }
  recommendList = recommendList.slice(0, reccomendFromHistoryLength);
  return { recommendList, usedCategoryIds, usedContentIds };
}

/**
 * お気に入りから最大5件（履歴で選ばれた2科目と重複しない5科目）
 */
async function getRecommendFromFavorites(favorites, excludeCategoryIds) {
  const recommendFromFavoritesLength = 5;
  let recommendList = [];
  let usedCategoryIds = new Set(excludeCategoryIds);
  if (!favorites.length) return { recommendList, usedCategoryIds };
  // favoritesをシャッフルしてランダムにする
  favorites = favorites.slice();
  for (let i = favorites.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [favorites[i], favorites[j]] = [favorites[j], favorites[i]];
  }
  for (const categoryId of favorites) {
    if (usedCategoryIds.has(categoryId)) continue;
    usedCategoryIds.add(categoryId);
    // 長さを超える分はここまで
    if (recommendList.length >= recommendFromFavoritesLength*2) continue;
    const cacheKey = `cachedVodContents_${categoryId}`;
    let videos = [];
    // お気に入りの動画リストを取得
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
        break;
      }
    }
  }
  console.log(usedCategoryIds);
  // recommendListをランダムに最大件数（reccomendFromFavoritesLength）に絞る
  for (let i = recommendList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recommendList[i], recommendList[j]] = [recommendList[j], recommendList[i]];
  }
  recommendList = recommendList.slice(0, recommendFromFavoritesLength);
  return { recommendList, usedCategoryIds};
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
  return (longerLength - levenshteinDistance(longer, shorter)) / parseFloat(longerLength);
}


// /**
//  * 2つの名詞リストからJaccard係数を計算して意味的な類似度を算出する
//  * @param {string[]} nouns1
//  * @param {string[]} nouns2
//  * @returns {number} 類似度 (0-1)
//  */
// function calculateJaccardSimilarity(nouns1, nouns2) {
//   const set1 = new Set(nouns1);
//   const set2 = new Set(nouns2);
//   const intersection = new Set([...set1].filter(x => set2.has(x)));
//   const union = new Set([...set1, ...set2]);
//   if (union.size === 0) return 0;
//   return intersection.size / union.size;
// }

// /**
//  * 類似している3件（履歴・お気に入りの合計7科目と重複がない3科目）
//  * 履歴やお気に入りの科目名と類似した科目をおすすめする
//  */
// async function getRecommendFromSimilar(allCategories, excludeCategoryIds) {
//   if (!Array.isArray(allCategories) || !allCategories.length) return [];
//   console.log('allCategories', allCategories);
//   // kuromoji.jsのTokenizerを準備
//   await window.getTokenizer();

//   // 除外対象科目の名詞リストとエイリアスを作成
//   const excludeNounsList = [];
//   const excludeCategoryAliases = new Set();

//   for (const category of allCategories) {
//     if (excludeCategoryIds.has(category.categoryId)) {
//       const aliasNum = (category.alias || '').match(/^[0-9]+/);
//       if (aliasNum) {
//         excludeCategoryAliases.add(aliasNum[0]);
//         const nouns = await window.extractNouns(category.name);
//         if (nouns.length > 0) {
//           excludeNounsList.push(nouns);
//         }
//       }
//     }
//   }

//   if (excludeNounsList.length === 0) return [];
//   console.log('excludeNounsList', excludeNounsList);

//   // 除外対象科目の名詞リストとどれくらい似ているかを算出
//   const candidatePromises = allCategories.map(async (category) => {
//     if (excludeCategoryIds.has(category.categoryId)) return null;
//     const aliasNum = (category.alias || '').match(/^[0-9]+/);
//     if (aliasNum && excludeCategoryAliases.has(aliasNum[0])) return null;
//     if (aliasNum === null) return null;

//     const nouns = await window.extractNouns(category.name);
//     if (nouns.length === 0) return null;

//     let maxSimilarity = 0;
//     for (const excludeNouns of excludeNounsList) {
//       const similarity = calculateJaccardSimilarity(nouns, excludeNouns);
//       if (similarity > maxSimilarity) maxSimilarity = similarity;
//     }
//     return { ...category, similarity: maxSimilarity };
//   });

//   const candidates = (await Promise.all(candidatePromises)).filter(Boolean);
//   console.log('candidates', candidates);

//   candidates.sort((a, b) => b.similarity - a.similarity);

//   // 3つに絞る
//   let recommendList = [];
//   let count = 0;
//   const usedContentIds = new Set();

//   for (const category of candidates) {
//     if (count >= 3) break;
//     if (category.similarity < 0.3) continue;
//     const videos = await window.getVideoListInCategory(category.categoryId);
//     if (!Array.isArray(videos) || !videos.length) continue;
//     for (const video of videos) {
//       if (usedContentIds.has(video.contentId)) continue;
//       const status = await window.getVideoProgress(video.contentId);
//       if (status < 0.95) {
//         recommendList.push({ ...video, progress: status || 0, source: 'similar' });
//         usedContentIds.add(video.contentId);
//         count++;
//         break;
//       }
//     }
//   }
//   return recommendList;
// }

/**
 * 類似している3件（履歴・お気に入りの合計7科目と重複がない3科目）
 * 履歴やお気に入りの科目名と類似した科目をおすすめする
 */
async function getRecommendFromSimilar(allCategories, excludeCategoryIds) {
  const reccomendFromSimilarLength = 3;
  if (!Array.isArray(allCategories) || !allCategories.length) return [];

  // excludeCategoryAliasを作成
  const excludeCategoryNames = new Set();
  const excludeCategoryAliases = new Set();
  allCategories.forEach(category => {
    if (excludeCategoryIds.has(category.categoryId)) {
      const aliasNum = (category.alias || '').match(/^[0-9]+/);
      if (aliasNum) {
        excludeCategoryAliases.add(aliasNum[0]);
        const cleanName = (category.name || '').replace(/\s*（’\d{2}）\s*\d*[a-zA-Z]*$/, '').replace(/^[0-9]+\s/, '');
        excludeCategoryNames.add(cleanName);
      }
    }
  });

  if (excludeCategoryAliases.size === 0) return [];

  const candidates = allCategories.map(category => {
    // 除外カテゴリは見ない
    if (excludeCategoryIds.has(category.categoryId)) return null;
    // alias（数字のみ）が同じなら見ない
    const aliasNum = (category.alias || '').match(/^[0-9]+/);
    if (aliasNum && excludeCategoryAliases.has(aliasNum[0])) return null;
    if (aliasNum === null) return null;
    // 同じものを2つ追加する可能性を除外
    excludeCategoryAliases.add(aliasNum[0]);
    // excludeNameとの名前の類似度を見る
    const cleanName = (category.name || '').replace(/\s*（’\d{2}）\s*\d*[a-zA-Z]*$/, '').replace(/^[0-9]+\s/, '');
    let maxSimilarity = 0;
    for (const excludeName of excludeCategoryNames) {
      const similarity = calculateSimilarity(cleanName, excludeName);
      if (similarity > maxSimilarity) maxSimilarity = similarity;
    }
    // 一番高い類似度をとる
    return { ...category, similarity: maxSimilarity };
  }).filter(Boolean);

  // 類似度順に並べ、reccomendFromSimilarLength*2の数までに絞る
  candidates.sort((a, b) => b.similarity - a.similarity);
  candidates.splice(0, candidates.length - reccomendFromSimilarLength * 2);

  // ランダムに並べ替える
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // 3つに絞る
  let recommendList = [];
  let count = 0;
  const usedContentIds = new Set();

  for (const category of candidates) {
    if (count >= reccomendFromSimilarLength) break;
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