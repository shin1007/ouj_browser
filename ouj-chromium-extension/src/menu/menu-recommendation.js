// おすすめ機能のデータ生成（アルゴリズム）。
// 履歴・お気に入り・カテゴリ類似度からおすすめ動画リストを生成する。
// 表示（パネル／HTML生成）は menu-recommendation-panel.js に分離している。

/**
 * 視聴履歴に基づいて最大2件のおすすめ動画を選定します。
 * 1. 視聴途中の動画があれば、それを「続きから見る」として推薦します。
 * 2. 視聴完了した動画があれば、そのコースの次の未視聴動画を推薦します。
 * @param {Array<Object>} history - 視聴履歴の配列。各要素は { contentId, date } を含みます（進捗は保持していないため関数内でgetVideoProgressを都度取得）。
 * @returns {Promise<Object>} おすすめ動画リスト、使用済みカテゴリIDセット、使用済みコンテンツIDセットを含むオブジェクト。
 */
async function getRecommendFromHistory(history) {
  const reccomendFromHistoryLength = window.getSetting('history-recommend-level', 2);
  // 返却するおすすめ動画のリスト
  let recommendList = [];
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
    const { contentId, date } = historyItem;

    // 不正なデータはスキップ
    if (!contentId) continue;
    if (usedContentIds.has(contentId)) continue;

    // 動画情報を取得
    const video = await window.getVideoData(contentId);
    if (!video || !video.contentId) continue;
    if (recommendList.length > reccomendFromHistoryLength*2) continue;
    // 履歴エントリ自体は{contentId, date}のみで進捗を持たないため、都度取得する
    const progress = await window.getVideoProgress(contentId);
    // パターン1: 視聴が完了していない動画 (進捗率95%未満)
    if (progress < 0.95) {
      // 「続きから見る」おすすめとしてリストに追加
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
          dateStr: '',
        });
        // 使用済みIDとして記録
        usedContentIds.add(nextVideo.contentId);
      }
    }
  }
  // recommendListをランダムに最大件数（reccomendFromHistoryLength）に絞る
  for (let i = recommendList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recommendList[i], recommendList[j]] = [recommendList[j], recommendList[i]];
  }
  recommendList = recommendList.slice(0, reccomendFromHistoryLength);
  // 同じカテゴリから重複して推薦しないように、使用したカテゴリIDを記録
  let usedCategoryIds = new Set();
  for (const video of recommendList) {
    // 使用済みカテゴリIDとして記録
    usedCategoryIds.add(video.categoryId);
  }

  return { recommendList, usedCategoryIds, usedContentIds };
}

/**
 * お気に入りから最大5件（履歴で選ばれた2科目と重複しない5科目）
 */
async function getRecommendFromFavorites(favorites, excludeCategoryIds) {
  const recommendFromFavoritesLength = window.getSetting('favorite-recommend-level', 5);
  let recommendList = [];
  let usedCategoryIds = new Set(excludeCategoryIds);
  if (!favorites.length) return { recommendList, usedCategoryIds };
  // favoritesをシャッフルしてランダムにする
  favorites = favorites.slice();
  for (let i = favorites.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [favorites[i], favorites[j]] = [favorites[j], favorites[i]];
  }
  // Aliasのリストを作る（IDが別でも同じエイリアスの同じ科目がある場合に対応する）
  let allCategories = await window.getCategoriesData();
  if (!Array.isArray(allCategories)) allCategories = [];
  const excludeCategoryAliases = new Set();
  allCategories.forEach(category => {
    if (excludeCategoryIds.has(category.categoryId)) {
      const aliasNum = (category.alias || '').match(/^[0-9]+/);
      if (aliasNum) {
        excludeCategoryAliases.add(aliasNum[0]);
      }
    }
  });

  for (const categoryId of favorites) {
    // alias（数字のみ）が同じなら見ない
    const category = await window.getCategoryData(categoryId);
    if (!category) continue;
    const aliasNum = (category.alias || '').match(/^[0-9]+/);
    if (aliasNum && excludeCategoryAliases.has(aliasNum[0])) continue;
    if (aliasNum === null) continue;

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
  // recommendListをランダムに最大件数（reccomendFromFavoritesLength）に絞る
  for (let i = recommendList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recommendList[i], recommendList[j]] = [recommendList[j], recommendList[i]];
  }
  recommendList = recommendList.slice(0, recommendFromFavoritesLength);
  // 同じカテゴリから重複して推薦しないように、使用したカテゴリIDを記録
  for (const video of recommendList) {
    // 使用済みカテゴリIDとして記録
    usedCategoryIds.add(video.categoryId);
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
  return (longerLength - levenshteinDistance(longer, shorter)) / parseFloat(longerLength);
}


/**
 * 類似している3件（履歴・お気に入りの合計7科目と重複がない3科目）
 * 履歴やお気に入りの科目名と類似した科目をおすすめする
 */
async function getRecommendFromSimilar(allCategories, excludeCategoryIds) {
  const reccomendFromSimilarLength = window.getSetting('similar-recommend-level', 3);
  if (!Array.isArray(allCategories) || !allCategories.length) return [];

  // 名前は類似度計算で作ってるのでexcludeCategoryNameが必要
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
  candidates.splice(reccomendFromSimilarLength * 2);

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
