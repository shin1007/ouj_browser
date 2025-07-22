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
    console.error("getCurrentCategoryId: URLパラメータが見つかりません");
    return null;
  }
  
  const caMatch = params.match(/ca=(\d+)/);
  if (!caMatch) {
    console.error("getCurrentCategoryId: caパラメータが見つかりません");
    return null;
  }
  
  const categoryId = caMatch[1];
  return categoryId;
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

/**
 * 指定されたカテゴリIDからカテゴリ名を取得する（ID型を問わず）
 * @param {string|number} categoryId
 * @returns {Promise<string|null>} カテゴリ名、またはnull
 */
async function getCategoryNameById(categoryId) {
  try {
    const result = await chrome.storage.local.get([CATEGORIES_STORAGE_KEY]);
    const cachedData = result[CATEGORIES_STORAGE_KEY];
    // 新しいキャッシュ構造に対応
    const data = cachedData && cachedData.data ? cachedData.data : cachedData;
    if (!Array.isArray(data)) return null;
    const cat = data.find(item => item.categoryId.toString() === categoryId.toString());
    return cat ? cat.name : null;
  } catch (error) {
    console.error("getCategoryNameById: カテゴリ名の取得に失敗しました:", error);
    return null;
  }
}

window.getCategoriesData = getCategoriesData;
window.getChildIds = getChildIds;
window.getCurrentCategoryId = getCurrentCategoryId;
window.getParentCategoryName = getParentCategoryName;
window.parentCategories = parentCategories;
window.getCategoryNameById = getCategoryNameById;
