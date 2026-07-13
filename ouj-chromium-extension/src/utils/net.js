/**
 * ネットワーク／キャッシュ関連のユーティリティ。
 * fetchWithCache / fetchFromNetwork / fetchWithoutCache / createConcurrencyGate。
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
 * @returns {Promise<Object|null>} 取得またはキャッシュされたJSONデータ、またはnull
 */
const fetchWithCache = async (url, cacheKey, minute=720) => {
    // 1. 最初にキャッシュされたデータを確認
    const result = await chrome.storage.local.get([cacheKey]);
    const cachedData = result[cacheKey];

    // 1.cachedData.dataが空でなく、かつ、timestampが当日のものであれば、それを返す
    if (cachedData && cachedData.data && cachedData.timestamp) {
        // cachedDataが空の場合はネットワークから取得
        if (cachedData.data.error || cachedData.data === null) {
            // console.warn(`fetchWithCache: ${cacheKey} のキャッシュはエラーまたはnullです。ネットワークからデータ取得を試行中...`);
        } else if (cachedData.data.length === 0) {
        }else if(cachedData.timestamp && (new Date().getTime() - new Date(cachedData.timestamp).getTime()) < minute * 60 * 1000) {
            return cachedData.data;
        } else {
        }
    }
    // 2. 当日のキャッシュがない場合のみネットワークリクエストを試みる
    const fetchResult = await fetchFromNetwork(url);
    if (fetchResult) {
        // 2. データをキャッシュに保存
        const cacheData = {
            data: fetchResult,
            timestamp: new Date().toISOString()
        };
        await chrome.storage.local.set({ [cacheKey]: cacheData });
        return fetchResult;
    }
    // 3. 古いキャッシュがあれば、それを返す
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
// TODO: fetchWithoutCacheはwindow.*に公開されておらず、src/内から呼び出し箇所も見当たらない
// (未使用の可能性が高い)。401005リトライも入れていないので、使う場合はfetchFromNetwork経由に
// 揃えるか同様のリトライを足す必要がある。今回のログイン周り修正の対象外のため未着手。
const fetchWithoutCache = async (url,cacheKey) => {
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            // 成功した場合のみキャッシュを更新
            const cacheData = {
                data: data,
                timestamp: new Date().toISOString()
            };
            await chrome.storage.local.set({ [cacheKey]: cacheData });
            return data;
        }
        return response.json();
    } catch (error) {
        console.warn(`fetchWithoutCache: ${url} のネットワークからのデータ取得に失敗しました。エラー: ${error.message}`);
        return null;
    }
};

// グローバル関数として公開
window.fetchWithCache = fetchWithCache;
window.createConcurrencyGate = createConcurrencyGate;
