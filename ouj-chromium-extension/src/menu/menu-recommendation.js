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
    const { contentId, progress, date } = historyItem;

    // 不正なデータはスキップ
    if (!contentId) continue;
    if (usedContentIds.has(contentId)) continue;

    // 動画情報を取得
    const video = await window.getVideoData(contentId);
    if (!video || !video.contentId) continue;
    if (recommendList.length > reccomendFromHistoryLength*2) continue;
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

// ここからネイティブな動画一覧ページ（右ペイン）と同じ見た目の表示部分
// オーバーレイの共通基盤はmenu-native-shell.jsを利用する

// 履歴・お気に入り・類似それぞれの表示件数を選ぶドロップダウン（ネイティブの
// 並び順選択ion-item.sortの位置を再利用する）
function buildRecommendTopHtml() {
  const historyLevel = window.getSetting('history-recommend-level', 2);
  const favoriteLevel = window.getSetting('favorite-recommend-level', 5);
  const similarLevel = window.getSetting('similar-recommend-level', 3);
  const createOptions = (selectedValue) => {
    let options = '';
    for (let i = 0; i <= 10; i++) {
      options += `<option value="${i}" ${i === selectedValue ? 'selected' : ''}>${i}</option>`;
    }
    return options;
  };
  return `
    <ion-item class="sort item item-block item-md">
      <div class="item-inner">
        <div class="input-wrapper">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;width:100%;font-size:14px;color:#374151;">
            <label for="history-recommend-level">履歴から</label>
            <select id="history-recommend-level" title="履歴からのおすすめ表示数">${createOptions(historyLevel)}</select>
            <span>件</span>
            <label for="favorite-recommend-level">お気に入りから</label>
            <select id="favorite-recommend-level" title="お気に入りからのおすすめ表示数">${createOptions(favoriteLevel)}</select>
            <span>件</span>
            <label for="similar-recommend-level">類似から</label>
            <select id="similar-recommend-level" title="類似からのおすすめ表示数">${createOptions(similarLevel)}</select>
            <span>件</span>
          </div>
        </div>
      </div>
    </ion-item>
  `;
}

function buildRecommendItemHtml(item, categories) {
  const categoryPath = window.buildCategoryPathText(categories, item.categoryId);
  let sourceLabel = '';
  let sourceColor = '';
  if (item.source === 'history') {
    sourceLabel = '履歴';
    sourceColor = '#3b82f6';
  } else if (item.source === 'favorites') {
    sourceLabel = 'お気に入り';
    sourceColor = '#f59e0b';
  } else if (item.source === 'similar') {
    sourceLabel = '類似';
    sourceColor = '#059669';
  }
  const badgeHtml = sourceLabel
    ? `<span style="display:inline-block;font-size:11px;color:${sourceColor};background:${sourceColor}20;padding:2px 8px;border-radius:4px;font-weight:500;">${sourceLabel}</span>`
    : '';
  return window.buildNativeVideoItemHtml({
    contentId: item.contentId,
    categoryId: item.categoryId,
    title: item.title,
    summary: item.summary,
    categoryPath,
    rightAreaHtml: badgeHtml,
    progressPercent: Math.floor((item.progress || 0) * 100)
  });
}

function handleRecommendPanelOpen() {
  window.openNativeOverlay((overlay) => {
    let categories = [];

    function wireItemEvents() {
      overlay.querySelectorAll('.native-video-button').forEach((btn) => {
        btn.addEventListener('click', () => {
          // おすすめ動画はその動画自体の再生ページへ直接遷移する
          const contentId = btn.getAttribute('data-content-id');
          const categoryId = btn.getAttribute('data-category-id');
          if (contentId) {
            window.removeNativeOverlay();
            window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/player?co=${contentId}&ct=V&ca=${categoryId || ''}`;
          }
        });
      });
    }

    function renderList(recommendList) {
      const listEl = overlay.querySelector('#common-list-content');
      if (listEl) {
        listEl.innerHTML = recommendList.length
          ? recommendList.map((item) => buildRecommendItemHtml(item, categories)).join('')
          : '<div style="padding:16px;color:#666;">おすすめ動画はありません（全て再生済み）</div>';
      }
      wireItemEvents();
    }

    const refresh = () => {
      createRecommendListData().then((recommendList) => {
        window.oujRecommendCache = { data: recommendList, lastFetched: Date.now() };
        if (!document.body.contains(overlay)) return;
        renderList(recommendList);
      });
    };

    function wireDropdowns() {
      const setupDropdownListener = (id, settingKey) => {
        const dropdown = overlay.querySelector(`#${id}`);
        if (dropdown) {
          dropdown.addEventListener('change', (event) => {
            window.saveSetting(settingKey, parseInt(event.target.value, 10));
            refresh();
          });
        }
      };
      setupDropdownListener('history-recommend-level', 'history-recommend-level');
      setupDropdownListener('favorite-recommend-level', 'favorite-recommend-level');
      setupDropdownListener('similar-recommend-level', 'similar-recommend-level');
    }

    overlay.innerHTML = window.renderNativeShellHtml({
      breadcrumbHtml: window.buildNativeBreadcrumbHtml([{ text: 'おすすめ動画' }]),
      mainHtml: window.renderNativeVideoListMainHtml({
        topHtml: buildRecommendTopHtml(),
        itemsHtml: '<div style="padding:16px;color:#666;">読み込み中...</div>'
      })
    });
    wireDropdowns();

    window.getCategoriesData().then((cats) => {
      if (!document.body.contains(overlay)) return;
      categories = cats;
      if (window.oujRecommendCache && window.oujRecommendCache.data) {
        renderList(window.oujRecommendCache.data);
        // 裏で再取得も走らせておく（表示中の一覧はすぐには更新しない）
        prefetchRecommendListData();
      } else {
        refresh();
      }
    });
  });
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
