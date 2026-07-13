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
    // maxAttempts省略の呼び出しが多く、対象要素が最後まで現れないページ(SPA遷移で
    // 離脱した等)だとタイマーが無期限に残ってしまう。呼び出し開始時点のURLと
    // 変わっていたら「このページはもう見ていない」とみなして打ち切る
    // (content.jsは対象ページ向けの初期化をURL変化のたびに呼び直すため、
    // まだ必要な監視は次の呼び出しで自然に再開される)
    const startUrl = window.location.href;

    const checkElement = () => {
        attempts++;
        if (window.location.href !== startUrl) return;
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
    // waitForElementと同様、離脱後もポーリングが残り続けないようURL変化で打ち切る
    const startUrl = window.location.href;

    const checkCondition = () => {
        attempts++;
        if (window.location.href !== startUrl) return;

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
