// categories.js
// カテゴリ関連の関数
const CATEGORIES_API_URL = 'https://v.ouj.ac.jp/v1/tenants/1/categories';
const CATEGORIES_STORAGE_KEY = 'cachedCategoriesData'; // カテゴリデータを保存する際のキー

/**
 * 指定したcontentIdからカテゴリデータを取得する
 * @param {string|number} contentId
 * @returns {Promise<Object|null>} カテゴリデータ or null
 */
async function getCategoryDataFromContentId(contentId) {
  const videoData = await getVideoData(contentId);
  if (!videoData || !videoData.categoryId) return null;
  const categories = await getCategoriesData();
  if (!(categories && Array.isArray(categories))) return null;
  const category = categories.find(cat => String(cat.categoryId) === String(videoData.categoryId));
  return category || null;
}
async function getCategoryData(categoryId){
  const categories = await getCategoriesData();
  if (!(categories && Array.isArray(categories))) return null;
  const category = categories.find(cat => String(cat.categoryId) === String(categoryId));
  return category || null;
}
/**
 * 指定したcontentIdの動画データをAPIから取得する
 * @param {string|number} contentId
 * @returns {Promise<Object|null>}
 */
async function getVideoData(contentId) {
  try {
    const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}`;
    const cacheKey = `cachedVodContent_${contentId}`;
    const videoData = await window.fetchWithCache(url, cacheKey);
    return videoData;
  } catch (error) {
    console.error('getVideoData: 動画データ取得でエラーが発生しました:', error);
    return null;
  }
}

async function getCategoriesData(minute=720) {
  return await fetchWithCache(CATEGORIES_API_URL, CATEGORIES_STORAGE_KEY, minute);
}

async function getChildIds(categoryNum) {
  const categoryNumInt = parseInt(categoryNum, 10);

  let result = await chrome.storage.local.get([CATEGORIES_STORAGE_KEY]);
  const cachedData = result[CATEGORIES_STORAGE_KEY];
  
  // 新しいキャッシュ構造に対応
  const data = cachedData && cachedData.data ? cachedData.data : cachedData;
  
  if (!Array.isArray(data)) return [];

  const filtered = data.filter(item => item.parentId === categoryNumInt);

  filtered.sort((a, b) => {
    const aNum = parseInt(a.name.slice(0, 3), 10);
    const bNum = parseInt(b.name.slice(0, 3), 10);
    return aNum - bNum;
  });

  return filtered.map(item => ({ categoryId: item.categoryId, name: item.name }));
}

function getCurrentCategoryId(url="") {
  const hash = url ? new URL(url).hash : window.location.hash;

  // hashのcaを取得
  const params = hash.split('?')[1];
  if (!params) {
    return 0;
  }
  
  const caMatch = params.match(/ca=(\d+)/);
  if (!caMatch) {
    return 0;
  }
  
  const categoryId = caMatch[1];
  return parseInt(categoryId, 10);
}
function getCurrentContentId(url="") {
  const hash = url ? new URL(url).hash : window.location.hash;

  // hashのcaを取得
  const params = hash.split('?')[1];
  if (!params) {
    return 0;
  }
  
  const caMatch = params.match(/co=(\d+)/);
  if (!caMatch) {
    return 0;
  }
  
  const categoryId = caMatch[1];
  return parseInt(categoryId, 10);
}
/**
 * 指定されたカテゴリIDの親カテゴリ名を取得する
 * @param {number|string} categoryId - カテゴリID
 * @returns {Promise<string|null>} 親カテゴリ名、またはnull
 */
async function getParentCategoryName(categoryId) {
  try {
    const result = await chrome.storage.local.get([CATEGORIES_STORAGE_KEY]);
    const cachedData = result[CATEGORIES_STORAGE_KEY];
    
    // 新しいキャッシュ構造に対応
    const data = cachedData && cachedData.data ? cachedData.data : cachedData;
    
    if (!Array.isArray(data)) return null;
    
    // 指定されたカテゴリIDのカテゴリを検索
    const category = data.find(item => 
      item.categoryId.toString() === categoryId.toString() || 
      item.categoryId === parseInt(categoryId, 10)
    );
    
    if (!category || !category.parentId) return null;
    
    // 親カテゴリを検索
    const parentCategory = data.find(item => 
      item.categoryId.toString() === category.parentId.toString() || 
      item.categoryId === parseInt(category.parentId, 10)
    );
    
    return parentCategory ? parentCategory.name : null;
  } catch (error) {
    console.error("getParentCategoryName: 親カテゴリ名の取得に失敗しました:", error);
    return null;
  }
}
async function getVideoListInCategory(categoryId) {
  const result = await chrome.storage.local.get([CATEGORIES_STORAGE_KEY]);
  const cachedData = result[CATEGORIES_STORAGE_KEY];
  const data = cachedData && cachedData.data ? cachedData.data : cachedData;
  if (!Array.isArray(data)) return []; 
  const category = data.find(item => item.categoryId === parseInt(categoryId, 10));
  if (!category) return [];
  const cacheKey = `cachedVideoList_${categoryId}`;
  const list = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
  if (!Array.isArray(list)) return [];
  return list;
}

async function categoriesUsedAsParent() {
  const result = await chrome.storage.local.get([CATEGORIES_STORAGE_KEY]);
  const cachedData = result[CATEGORIES_STORAGE_KEY];
  const data = cachedData && cachedData.data ? cachedData.data : cachedData;
  if (!Array.isArray(data)) return [];

  // parentIdとして使われている値を列挙
  const parentIdSet = new Set();
  data.forEach(item => {
    if (typeof item.parentId === 'number' && item.parentId !== 0) {
      parentIdSet.add(item.parentId);
    }
  });
  return Array.from(parentIdSet);
}

/**
 * 「コース級」カテゴリ（生活と福祉コース・臨床心理学プログラム等）を、
 * その親（教養学部・大学院 等）ごとにまとめて返す。
 *
 * コース級の定義: 子として科目（summary付き）を1つ以上持つフォルダ。
 * （放送大学の階層は 学部/大学院 → コース/プログラム → 科目 → 回。中間のコース層を抜き出す）
 *
 * 検索ボックスのクイック絞り込みパネル(search-box-filter-panel.js)の「コースで探す」で使う。
 * @returns {Promise<Array<{parentId:number, parentName:string, courses:Array<{categoryId:number, name:string}>}>>}
 */
async function getCourseGroups() {
  const categories = await getCategoriesData();
  if (!Array.isArray(categories)) return [];

  const byId = new Map(categories.map((c) => [c.categoryId, c]));
  // 親IDごとの子リストを1回だけ構築する
  const childrenByParent = new Map();
  categories.forEach((c) => {
    if (!c.parentId) return;
    if (!childrenByParent.has(c.parentId)) childrenByParent.set(c.parentId, []);
    childrenByParent.get(c.parentId).push(c);
  });

  const groups = new Map(); // parentId -> { parentId, parentName, courses: [] }
  categories.forEach((c) => {
    const kids = childrenByParent.get(c.categoryId);
    // 子に科目(summary付き)が1つも無ければコース級ではない（さらに深いフォルダ or 科目そのもの）
    if (!kids || !kids.some((k) => k.summary)) return;
    const parent = byId.get(c.parentId);
    const parentName = parent ? parent.name : '';
    if (!groups.has(c.parentId)) {
      groups.set(c.parentId, { parentId: c.parentId, parentName, courses: [] });
    }
    groups.get(c.parentId).courses.push({ categoryId: c.categoryId, name: c.name });
  });

  // 名前先頭の番号（"01 …"）で親グループ・各コースを並べる（サイトの表示順に合わせる）
  const numPrefix = (name) => {
    const m = (name || '').match(/^\s*([0-9]+)/);
    return m ? parseInt(m[1], 10) : 9999;
  };
  const result = Array.from(groups.values());
  result.forEach((g) => g.courses.sort((a, b) => numPrefix(a.name) - numPrefix(b.name)));
  result.sort((a, b) => numPrefix(a.parentName) - numPrefix(b.parentName));
  return result;
}


async function getVideoProgress(contentId) {
  try {
    const url = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}/viewinglog/latest`;
    const cacheKey = `videoViewingStatus_${contentId}`;
    const cachedData = await fetchWithCache(url, cacheKey, 40);

    return cachedData.currentTimeRate || 0;
  } catch (error) {
    return 0;
  }
}
async function viewRankings(){
  console.log("カテゴリ別視聴回数ランキングを取得中...");
  const categories = await getCategoriesData();
  if (!(categories && Array.isArray(categories))) return [];
  console.log(`全${categories.length}カテゴリを取得`);
  const rankings = [];
  for(const category of categories){
    const videoList = await getVideoListInCategory(category.categoryId);
    if(videoList.length === 0) continue;
    let totalViewCount = 0;
    for (const video of videoList){
      const singleViewCount = video.viewingCount;
      totalViewCount += singleViewCount;
    }
    rankings.push({categoryId: category.categoryId, name: category.name, totalViewCount: totalViewCount});
  }
  rankings.sort((a, b) => b.totalViewCount - a.totalViewCount);
  console.log(rankings);
}
// 動画の視聴回数ランキングを使用する場合
// viewRankings();
window.getCategoriesData = getCategoriesData;
window.getChildIds = getChildIds;
window.getCurrentCategoryId = getCurrentCategoryId;
window.getParentCategoryName = getParentCategoryName;
window.categoriesUsedAsParent = categoriesUsedAsParent;
window.getCourseGroups = getCourseGroups;
window.getVideoListInCategory = getVideoListInCategory;
window.getVideoData = getVideoData;
window.getCategoryDataFromContentId = getCategoryDataFromContentId;
window.getVideoProgress = getVideoProgress;
window.getCategoryData = getCategoryData;