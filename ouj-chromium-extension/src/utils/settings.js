/**
 * localStorageベースの設定の読み書きユーティリティ。
 * saveSetting / getSetting / getBooleanSetting / getPerCourseSetting /
 * savePerCourseSetting / removeSetting。
 */

/**
 * 設定を保存する関数
 * @param {string} key - 設定キー
 * @param {any} value - 保存する値
 */
const saveSetting = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // console.error(`saveSetting: 設定の保存に失敗しました - ${key}:`, error);
    }
};

/**
 * 設定を取得する関数
 * @param {string} key - 設定キー
 * @param {any} defaultValue - デフォルト値
 * @returns {any} 取得した値またはデフォルト値
 */
const getSetting = (key, defaultValue = null) => {
    try {
        const value = localStorage.getItem(key);
        if (value === null) {
            return defaultValue;
        }

        // JSONとして解析を試行
        try {
            return JSON.parse(value);
        } catch (parseError) {
            // JSON解析に失敗した場合、文字列として返す
            return value;
        }
    } catch (error) {
        // console.error(`getSetting: 設定の取得に失敗しました - ${key}:`, error);
        return defaultValue;
    }
};

/**
 * ブール値の設定を取得する関数
 * @param {string} key - 設定キー
 * @param {boolean} defaultValue - デフォルト値
 * @returns {boolean} 取得したブール値
 */
const getBooleanSetting = (key, defaultValue = true) => {
    const value = getSetting(key, defaultValue);
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value !== 'false';
    }
    return defaultValue;
};

/**
 * 科目別設定を取得する関数。
 * `${baseKey}_${categoryId}`（科目別）があればそれを、なければ全体設定を返す
 * @param {string} baseKey - 設定のベースキー（例: 'playbackSpeed'）
 * @param {string|number} categoryId - 科目のカテゴリID
 * @param {any} defaultValue - どちらも未設定の場合のデフォルト値
 */
const getPerCourseSetting = (baseKey, categoryId, defaultValue = null) => {
    if (categoryId) {
        const perCourse = getSetting(`${baseKey}_${categoryId}`, null);
        if (perCourse !== null) return perCourse;
    }
    return getSetting(baseKey, defaultValue);
};

/**
 * 科目別設定を保存する関数。
 * 科目別キーと全体キーの両方に保存する。「最後に設定した値が他科目のデフォルトになり、
 * 明示的に設定したことのある科目は自分の値を覚え続ける」という動きになる
 * @param {string} baseKey - 設定のベースキー
 * @param {string|number} categoryId - 科目のカテゴリID（無ければ全体のみ保存）
 * @param {any} value - 保存する値
 */
const savePerCourseSetting = (baseKey, categoryId, value) => {
    // window.saveSetting（menu.js等が差し替えたラッパー）経由で保存する。
    // モジュール内の素のsaveSettingを直接呼ぶと、再生ページ側のキャッシュ更新ラッパー等を
    // 通らないため、必ず公開APIのwindow.saveSettingを使う。
    const save = (typeof window !== 'undefined' && window.saveSetting) ? window.saveSetting : saveSetting;
    if (categoryId) {
        save(`${baseKey}_${categoryId}`, value);
    }
    save(baseKey, value);
};

/**
 * 設定を削除する関数
 * @param {string} key - 設定キー
 */
const removeSetting = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        // console.error(`removeSetting: 設定の削除に失敗しました - ${key}:`, error);
    }
};

// グローバル関数として公開
window.saveSetting = saveSetting;
window.getSetting = getSetting;
window.getBooleanSetting = getBooleanSetting;
window.removeSetting = removeSetting;
window.getPerCourseSetting = getPerCourseSetting;
window.savePerCourseSetting = savePerCourseSetting;
