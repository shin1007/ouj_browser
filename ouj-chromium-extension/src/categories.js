// categories.js
// カテゴリ関連の関数
const CATEGORIES_API_URL = 'https://v.ouj.ac.jp/v1/tenants/1/categories';
const CATEGORIES_STORAGE_KEY = 'cachedCategoriesData'; // カテゴリデータを保存する際のキー


/**
 * 指定されたAPIからJSONデータを取得します。
 * 取得に成功すればキャッシュを更新し、失敗した場合はキャッシュされたデータを返します。
 * キャッシュもなければnullを返します。
 * @returns {Promise<Object|null>} 取得またはキャッシュされたJSONデータ、またはnull
 */
async function getCategoriesData() {
  console.log('getCategoriesData: データ取得を試行中...');

  try {
    // 1. ネットワークリクエストを試みる
    const response = await fetch(CATEGORIES_API_URL);

    if (!response.ok) {
      // HTTPエラー（404, 500など）の場合
      throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json(); // JSONとしてパース

    // 2. 成功した場合、JSONデータをストレージに保存
    await chrome.storage.local.set({ [CATEGORIES_STORAGE_KEY]: data });
    console.log('getCategoriesData: 新しいJSONデータを取得し、キャッシュしました。', data);
    return data;

  } catch (error) {
    // ネットワークエラー、JSONパースエラー、HTTPエラーなど
    console.warn(`getCategoriesData: ネットワークからのデータ取得に失敗しました。エラー: ${error.message}`);
    console.log('getCategoriesData: キャッシュされたデータの読み込みを試みます...');

    // 3. 失敗した場合、キャッシュされたデータを読み込む
    const result = await chrome.storage.local.get([CATEGORIES_STORAGE_KEY]);
    const cachedData = result[CATEGORIES_STORAGE_KEY];

    if (cachedData) {
      console.log('getCategoriesData: キャッシュされたJSONデータを利用します。', cachedData);
      return cachedData;
    } else {
      console.warn('getCategoriesData: キャッシュされたJSONデータも見つかりませんでした。');
      return null; // データが利用できない
    }
  }
}
/**
 * 現在のURLの右端が「ca=整数」なら、その整数をcategoryNumとして取得し、
 * storageに保存されているcategoriesデータからparentIdがcategoryNumの項目のcategoryId, name一覧を
 * nameの左端3桁を整数化して昇順で返す
 */
async function getChildIds(categoryNum) {
  const categoryNumInt = parseInt(categoryNum, 10);

  let result = await chrome.storage.local.get([CATEGORIES_STORAGE_KEY]);
  const data = result[CATEGORIES_STORAGE_KEY];
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
  console.log("getCurrentCategoryId - hash:", hash);
  
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
  console.log("getCurrentCategoryId - categoryId:", categoryId);
  return categoryId;
}

window.getCategoriesData = getCategoriesData;
window.getChildIds = getChildIds;
window.getCurrentCategoryId = getCurrentCategoryId;
