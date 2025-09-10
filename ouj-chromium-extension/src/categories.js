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
  const category = categories.find(cat => cat.categoryId === videoData.categoryId);
  return category || null;
}
async function getCategoryData(categoryId){
  const categories = await getCategoriesData();
  if (!(categories && Array.isArray(categories))) return null;
  const category = categories.find(cat => cat.categoryId === categoryId);
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
  const cacheKey = `cachedVideoList_${categoryId}`;
  const list = await window.fetchWithCache(`https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=${categoryId}&offset=0&limit=30&sortType=1&sortOrder=asc`, cacheKey);
  if (!Array.isArray(list)) return [];
  return list;

}

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
window.getCategoriesData = getCategoriesData;
window.getChildIds = getChildIds;
window.getCurrentCategoryId = getCurrentCategoryId;
window.getParentCategoryName = getParentCategoryName;
window.parentCategories = parentCategories;
window.getVideoListInCategory = getVideoListInCategory;
window.getVideoData = getVideoData;
window.getCategoryDataFromContentId = getCategoryDataFromContentId;
window.getVideoProgress = getVideoProgress;
window.getCategoryData = getCategoryData;