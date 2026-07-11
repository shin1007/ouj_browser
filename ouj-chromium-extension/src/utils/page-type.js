/**
 * 放送大学の各サービスのURLから画面種別を判定するユーティリティ。
 * detectOujPageType / decodeURLComponentSafe。
 */

// 画面種別を判定する関数
async function detectOujPageType(url) {
    // ログイン画面
    if (url.includes('://sso.ouj.ac.jp/cas/login')) {
        return {subDomain: 'sso', referTo: await detectOujPageType(decodeURLComponentSafe(url))};
    }
    // システムWAKABA
    if (url.includes('://www.wakaba.ouj.ac.jp/')){
        return {subDomain: 'wakaba'};
    }
    // WEB通信指導
    if (url.includes('://tsushin.ouj.ac.jp/')){
        return {subDomain: 'tsushin'};
    }
    // WEB単位認定試験
    if (url.includes('://shiken.ouj.ac.jp/')){
        return {subDomain: 'shiken'};
    }
    // オンライン授業
    if (url.includes('://online.ouj.ac.jp/')){
        return {subDomain: 'online'};
    }
    // ライブWEB授業
    if (url.includes('://live.ouj.ac.jp/')){
        return {subDomain: 'live'};
    }
    // 自己学習サイト
    if (url.includes('://sls.ouj.ac.jp/')){
        return {subDomain: 'sls'};
    }
    // 看護師国家試験対策
    if (url.includes('://nurse.ouj.ac.jp/')){
        return {subDomain: 'nurse'};
    }
    // 印刷教材試し読み、過去問、修士論文
    if (url.includes('://info.ouj.ac.jp/')){
        // 印刷教材試し読み
        if (url.includes('modules/kyozaipdf/')){
            return {subDomain: 'info', page: 'kyozaipdf'};
        }
        // 過去問
        if (url.includes('modules/html/mondai/')){
            return {subDomain: 'info', page: 'mondai'};
        }
        // 過去問（学部）
        if (url.includes('gakubu/')){
            return {subDomain: 'info', page: 'gakubu'};
        }
        // 過去問（大学院）
        if (url.includes('daigakuin/')){
            return {subDomain: 'info', page: 'daigakuin'};
        }
        // 過去問（司書）
        if (url.includes('shisho/')){
            return {subDomain: 'info', page: 'shisho'};
        }
        // 修士論文
        if (url.includes('modules/inronbun/')){
            return {subDomain: 'info', page: 'inronbun'};
        }
        return {subDomain: 'info', page: 'unknown'};
    }
    // 動画配信サービス
    if (url.includes('://v.ouj.ac.jp/')){
        // ホームページ
        if (url.includes('://v.ouj.ac.jp/view/ouj/#/navi/home')) {
            return {subDomain: 'v', page: 'home'};
        }
        // 動画再生画面
        if (url.includes('://v.ouj.ac.jp/view/ouj/#/navi/player?co=')
            || url.includes('://v.ouj.ac.jp/view/ouj/#/navi/player&co=')) {
            return {subDomain: 'v', page: 'player'};
        }
        // 検索結果
        if (url.includes('://v.ouj.ac.jp/view/ouj/#/navi/vod?se=')
            || url.includes('://v.ouj.ac.jp/view/ouj/#/navi/vod&se=')) {
            return {subDomain: 'v', page: 'search-result'};
        }

        // 怪しい例：
        // 検索結果からの動画
        // co=36739&ct=V&se=英語&ca=30648
        // VOD画面以外はここで終了
        if (!url.includes('://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=')
            && !url.includes('://v.ouj.ac.jp/view/ouj/#/navi/vod&ca=')) {
            return {subDomain: 'v', page: 'other'};
        }

        const categoryId = window.getCurrentCategoryId(url);
        try {
            const parentIds = await window.categoriesUsedAsParent(url);
            if (parentIds.includes(categoryId)) {
            return {subDomain: 'v', page: 'series-select', categoryId: categoryId}; // 科目一覧（科目群選択後）
            }
        } catch (e) {
            console.error('[OUJ拡張] parentCategoriesの取得に失敗:', e);
        }

        // フォールバック判定: カテゴリIDの範囲で判定
        if (categoryId < 100 || (categoryId > 480 && categoryId < 500)) {
            return {subDomain: 'v', page: 'series-select', categoryId: categoryId};
        }
        const contentId = window.getCurrentContentId(url);
        return {subDomain: 'v', page: 'video-select', categoryId: categoryId, contentId: contentId}; // 動画一覧
    }
    return {subDomain: 'unknown', page: 'unknown'};
}

function decodeURLComponentSafe(url) {
    const stringtoDelete = url.split('=')[0] + '=';
    const encodedStr = url.replace(stringtoDelete, '');
    try {
        const decodedStr = decodeURIComponent(encodedStr);
        if (decodedStr.includes('%')) {
            return decodeURLComponentSafe(decodedStr);
        }
        return decodedStr;
    } catch (error) {
        return encodedStr; // デコードに失敗した場合は元の文字列を返す
    }
}

/*
システムWAKABA
https://www.wakaba.ouj.ac.jp/portal/home/home/display?&taglib.html.TOKEN=e6e2f37a40d81eebffa7d2ba4dd08fdc
WEB通信指導
https://tsushin.ouj.ac.jp/
WEB単位認定試験
https://shiken.ouj.ac.jp/
印刷教材試し読み
https://info.ouj.ac.jp/ouj/modules/kyozaipdf/kyozaipdf.html
過去問
https://info.ouj.ac.jp/ouj/modules/html/mondai.html
修士論文
https://info.ouj.ac.jp/ouj/modules/inronbun/inronbun.html
オンライン授業
https://online.ouj.ac.jp/
ライブWEB授業
https://live.ouj.ac.jp/login/index.php?loginredirect=1
自己学習サイト
https://sls.ouj.ac.jp/webclass/?acs_=90f7e8c8
看護師国家試験対策
https://nurse.ouj.ac.jp/webclass/login.php
**/

// グローバル関数として公開
window.detectOujPageType = detectOujPageType;
window.decodeURLComponentSafe = decodeURLComponentSafe;
