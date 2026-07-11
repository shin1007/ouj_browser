/**
 * DOM／条件の出現を待つユーティリティ。
 * waitForElement / waitForCondition。
 */

/**
 * 指定された要素が存在するまで待機し、存在したらコールバックを実行する関数
 * @param {string} selector - CSSセレクタ
 * @param {Function} callback - 要素が見つかった時に実行するコールバック関数
 * @param {number} interval - 待機間隔（ミリ秒、デフォルト: 100）
 * @param {number} maxAttempts - 最大試行回数（デフォルト: 無制限）
 */
const waitForElement = (selector, callback, interval = 100, maxAttempts = null) => {
    let attempts = 0;

    const checkElement = () => {
        attempts++;
        const element = document.querySelector(selector);

        if (element) {
            callback(element);
            return;
        }

        if (maxAttempts && attempts >= maxAttempts) {
            // console.warn(`waitForElement: 最大試行回数に達しました: ${selector}`);
            return;
        }


        setTimeout(checkElement, interval);
    };

    checkElement();
};

/**
 * 指定された条件が満たされるまで待機し、満たされたらコールバックを実行する関数
 * @param {Function} condition - 条件をチェックする関数（trueを返すと待機終了）
 * @param {Function} callback - 条件が満たされた時に実行するコールバック関数
 * @param {number} interval - 待機間隔（ミリ秒、デフォルト: 100）
 * @param {number} maxAttempts - 最大試行回数（デフォルト: 無制限）
 */
const waitForCondition = (condition, callback, interval = 100, maxAttempts = null) => {
    let attempts = 0;

    const checkCondition = () => {
        attempts++;

        if (condition()) {
            callback();
            return;
        }

        if (maxAttempts && attempts >= maxAttempts) {
            // console.warn('waitForCondition: 最大試行回数に達しました');
            return;
        }

        setTimeout(checkCondition, interval);
    };

    checkCondition();
};

// グローバル関数として公開
window.waitForElement = waitForElement;
window.waitForCondition = waitForCondition;
