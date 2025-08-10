/**
 * 指定したcontentIdの動画データをAPIから取得する
 * @param {string|number} contentId
 * @returns {Promise<Object|null>}
 */
async function getVideoData(contentId) {
  try {
    const response = await fetch(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${contentId}`);
    if (!response.ok) {
      console.error('getVideoData: APIレスポンスエラー:', response.status, response.statusText);
      return null;
    }
    const videoData = await response.json();
    return videoData;
  } catch (error) {
    console.error('getVideoData: 動画データ取得でエラーが発生しました:', error);
    return null;
  }
}
// categories.js
// カテゴリ関連の関数
const CATEGORIES_API_URL = 'https://v.ouj.ac.jp/v1/tenants/1/categories';
const CATEGORIES_STORAGE_KEY = 'cachedCategoriesData'; // カテゴリデータを保存する際のキー



/**
 * 指定されたAPIからJSONデータを取得します。
 * 共通のキャッシュ機能を使用して、当日のキャッシュがある場合はそれを利用します。
 * 当日のキャッシュがない場合はネットワークリクエストを試みます。
 * ネットワークリクエストが成功すればキャッシュを更新します。
 * @returns {Promise<Object|null>} 取得またはキャッシュされたJSONデータ、またはnull
 */
async function getCategoriesData() {
  return await fetchWithCache(CATEGORIES_API_URL, CATEGORIES_STORAGE_KEY);
}
/**
 * 現在のURLの右端が「ca=整数」なら、その整数をcategoryNumとして取得し、
 * storageに保存されているcategoriesデータからparentIdがcategoryNumの項目のcategoryId, name一覧を
 * nameの左端3桁を整数化して昇順で返す
 */
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

/**
 * 現在のURLのhashからcaパラメータを取得し、カテゴリIDを文字列として返す
 * @returns {string} 現在のカテゴリID（文字列）
 */
function getCurrentCategoryId() {
  const hash = window.location.hash;
  
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
function getCurrentContentId() {
  const hash = window.location.hash;
  
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
  const cacheKey = `cachedVodContents_${categoryId}`;
  const list = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
  if (!Array.isArray(list)) return [];
  return list;

}

/**
 * categoriesデータの中でparentIdとして使われているcategoryIdを重複なく列挙して返す
 * @returns {Promise<number[]>} parentIdとして使われているcategoryIdの配列
 */
async function parentCategories() {
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

window.getCategoriesData = getCategoriesData;
window.getChildIds = getChildIds;
window.getCurrentCategoryId = getCurrentCategoryId;
window.getParentCategoryName = getParentCategoryName;
window.parentCategories = parentCategories;
window.getVideoListInCategory = getVideoListInCategory;
window.getVideoData = getVideoData;