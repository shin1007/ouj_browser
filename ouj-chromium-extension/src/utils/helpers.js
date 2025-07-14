const savePlaybackPosition = (position) => {
    localStorage.setItem('playbackPosition', position);
};

const getPlaybackPosition = () => {
    return localStorage.getItem('playbackPosition') || 0;
};

const saveFavorite = (videoId) => {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    if (!favorites.includes(videoId)) {
        favorites.push(videoId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
};

const getFavorites = () => {
    return JSON.parse(localStorage.getItem('favorites')) || [];
};

const readTitleAloud = (title) => {
    const utterance = new SpeechSynthesisUtterance(title);
    window.speechSynthesis.speak(utterance);
};

const clearVideoElements = () => {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
        video.style.display = 'none';
    });
};

const removeIntroAndOutro = (videoElement) => {
    videoElement.currentTime = videoElement.duration - 10; // Skip last 10 seconds as an example
};

/**
 * 日付が同じかどうかをチェックする関数
 * @param {string} dateString1 - 日付文字列1
 * @param {string} dateString2 - 日付文字列2
 * @returns {boolean} 同じ日付の場合true
 */
const isSameDate = (dateString1, dateString2) => {
    const date1 = new Date(dateString1);
    const date2 = new Date(dateString2);
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

/**
 * キャッシュ付きのAPIリクエストを行う関数
 * @param {string} url - APIのURL
 * @param {string} cacheKey - キャッシュのキー
 * @returns {Promise<Object|null>} 取得またはキャッシュされたJSONデータ、またはnull
 */
const fetchWithCache = async (url, cacheKey) => {
    console.log(`fetchWithCache: ${cacheKey} のキャッシュ確認を開始...`);

    // 1. 最初にキャッシュされたデータを確認
    const result = await chrome.storage.local.get([cacheKey]);
    const cachedData = result[cacheKey];

    if (cachedData && cachedData.timestamp) {
        if (isSameDate(cachedData.timestamp, new Date().toISOString())) {
            console.log(`fetchWithCache: ${cacheKey} の当日キャッシュを利用します。`, cachedData.data);
            return cachedData.data;
        } else {
            console.log(`fetchWithCache: ${cacheKey} のキャッシュは当日のものではありません。ネットワークからデータ取得を試行中...`);
        }
    } else {
        console.log(`fetchWithCache: ${cacheKey} のキャッシュがないため、ネットワークからデータ取得を試行中...`);
    }

    try {
        // 2. 当日のキャッシュがない場合のみネットワークリクエストを試みる
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // 3. 成功した場合、JSONデータとタイムスタンプをストレージに保存
        const cacheData = {
            data: data,
            timestamp: new Date().toISOString()
        };
        await chrome.storage.local.set({ [cacheKey]: cacheData });
        console.log(`fetchWithCache: ${cacheKey} の新しいデータを取得し、キャッシュしました。`, data);
        return data;

    } catch (error) {
        console.warn(`fetchWithCache: ${cacheKey} のネットワークからのデータ取得に失敗しました。エラー: ${error.message}`);
        
        // 古いキャッシュがあれば、それを返す
        if (cachedData && cachedData.data) {
            console.log(`fetchWithCache: ${cacheKey} のネットワークエラーのため、古いキャッシュを利用します。`, cachedData.data);
            return cachedData.data;
        }
        
        console.warn(`fetchWithCache: ${cacheKey} のキャッシュされたデータも見つかりませんでした。`);
        return null;
    }
};


// グローバル関数として公開
window.savePlaybackPosition = savePlaybackPosition;
window.getPlaybackPosition = getPlaybackPosition;
window.saveFavorite = saveFavorite;
window.getFavorites = getFavorites;
window.readTitleAloud = readTitleAloud;
window.clearVideoElements = clearVideoElements;
window.removeIntroAndOutro = removeIntroAndOutro;
window.isSameDate = isSameDate;
window.fetchWithCache = fetchWithCache;