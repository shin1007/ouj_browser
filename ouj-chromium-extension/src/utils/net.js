/**
 * ネットワーク／キャッシュ関連のユーティリティ。
 * fetchWithCache / fetchFromNetwork / createConcurrencyGate。
 */

// サイトAPIのエラーコード: CODE_401_NOT_FOUND_SESSION。
// ページ読み込み直後、拡張の fetch() がサイト側のセッション確立より先に実行されると
// 一時的にこのエラーになることがある(login-state.js のログイン状態検証中に実機確認)。
// 数百ms待てば解消する競合のため、この場合に限り短時間待って1回だけ再試行する。
const OUJ_SESSION_NOT_FOUND_ERROR_CODE = 401005;

/**
 * キャッシュ付きのAPIリクエストを行う関数
 * @param {string} url - APIのURL
 * @param {string} cacheKey - キャッシュのキー
 * @param {number} [minute] - キャッシュのTTL(分)
 * @param {(data: any) => boolean} [isValid] - 取得したデータが信用できる形かを判定する関数。
 *   省略時は常に信用する。指定してfalseを返した場合、キャッシュへの保存もキャッシュからの
 *   再利用も行わずネットワークから取得しなおす(カテゴリ一覧のように「常に数百件あるはずの
 *   一覧が、サイト側の一時的な不調で数件だけの200 OKを返す」ケースを弾くために使う。
 *   通常のエラー応答(.error付き)とは違い成功扱いのレスポンスなので、この仕組みが無いと
 *   TTL(既定12h)の間ずっと壊れた結果がキャッシュされ続けてしまう)
 * @returns {Promise<Object|null>} 取得またはキャッシュされたJSONデータ、またはnull
 */
const fetchWithCache = async (url, cacheKey, minute=720, isValid) => {
    // 1. 最初にキャッシュされたデータを確認
    const result = await chrome.storage.local.get([cacheKey]);
    const cachedData = result[cacheKey];

    // 1.cachedData.dataが空でなく、かつ、timestampが当日のものであれば、それを返す
    if (cachedData && cachedData.data && cachedData.timestamp) {
        // cachedDataがエラー/null/isValid不合格の場合のみキャッシュを信用せずネットワークから
        // 取得しなおす。空配列([])は「その科目に動画が0件」等の正当な結果でありうるため、
        // isValidを指定していない呼び出し元では他の結果と同様にTTL以内ならキャッシュを返す
        // (以前はここで素通りしてしまい、空配列の結果は毎回無条件にネットワーク再取得が
        // 走り続けていた)
        if (cachedData.data.error || cachedData.data === null || (isValid && !isValid(cachedData.data))) {
            // console.warn(`fetchWithCache: ${cacheKey} のキャッシュはエラーまたはnullです。ネットワークからデータ取得を試行中...`);
        } else if ((new Date().getTime() - new Date(cachedData.timestamp).getTime()) < minute * 60 * 1000) {
            return cachedData.data;
        }
    }
    // 2. 当日のキャッシュがない場合のみネットワークリクエストを試みる
    const fetchResult = await fetchFromNetwork(url);
    if (fetchResult && (!isValid || isValid(fetchResult))) {
        // 2. データをキャッシュに保存
        const cacheData = {
            data: fetchResult,
            timestamp: new Date().toISOString()
        };
        try {
            await chrome.storage.local.set({ [cacheKey]: cacheData });
        } catch (error) {
            // ストレージ容量超過等でキャッシュ保存に失敗しても、取得済みのfetchResultは
            // 呼び出し元に返す(キャッシュされないだけで、この回の動作自体は継続できる)
            console.warn(`fetchWithCache: ${cacheKey} のキャッシュ保存に失敗しました:`, error);
        }
        return fetchResult;
    }
    // 3. 古いキャッシュがあれば、それを返す(isValid不合格でも、無いよりはましなため最終手段として使う)
    if (cachedData && cachedData.data) {
        return cachedData.data;
    }
    // 4. 古いキャッシュもない場合は、nullを返す
    // console.warn(`fetchWithCache: ${cacheKey} のキャッシュされたデータも見つかりませんでした。`);
    return null;
};
/**
 * ページ全体で共有する同時実行数ゲートを作る。
 * runWithConcurrencyLimitは1回の呼び出し内でしか同時実行数を制限できないため、
 * IntersectionObserverなどにより「独立した呼び出し元」が同時多発するケース
 * （例: 画面内の科目フォルダが一度に10件以上検知され、それぞれが個別に
 * リクエストを投げ始める）では、呼び出し元ごとの制限を足し合わせた分だけ
 * 実際の同時リクエスト数が増えてしまう。createConcurrencyGateは呼び出し元を
 * またいで1つの上限を共有するためのユーティリティ。
 * @param {number} limit - ページ全体での同時実行数の上限
 * @returns {{ run: (fn: () => Promise<any>) => Promise<any> }}
 */
const createConcurrencyGate = (limit) => {
    let active = 0;
    const queue = [];
    const runNext = () => {
        if (active >= limit || queue.length === 0) return;
        active++;
        const { fn, resolve, reject } = queue.shift();
        fn().then(
            (value) => { active--; resolve(value); runNext(); },
            (error) => { active--; reject(error); runNext(); }
        );
    };
    return {
        run(fn) {
            return new Promise((resolve, reject) => {
                queue.push({ fn, resolve, reject });
                runNext();
            });
        },
    };
};
const fetchFromNetwork = async (url) => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.error && data.error.code === OUJ_SESSION_NOT_FOUND_ERROR_CODE) {
            // サイト側のセッション確立待ちの一時的な競合とみなし、少し待って1回だけ再試行する。
            await new Promise(resolve => setTimeout(resolve, 300));
            const retryResponse = await fetch(url);
            return retryResponse.json();
        }
        return data;
    } catch (error) {
        // 50ms待ってからリトライ
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
            const response = await fetch(url);
            return response.json();
        } catch (error) {
            console.warn(`fetchFromNetwork: ${url} のネットワークからのデータ取得に失敗しました。エラー: ${error.message}`);
            return null;
        }
    }
};
// グローバル関数として公開
window.fetchWithCache = fetchWithCache;
window.createConcurrencyGate = createConcurrencyGate;
