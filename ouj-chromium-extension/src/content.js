// 画面種別を判定する関数
function detectOujPageType() {
  return new Promise(async (resolve) => {
    const url = window.location.href;
    console.log("detectOujPageType: 現在のURL:", url);
    if (url.includes('https://sso.ouj.ac.jp/cas/login')) {
      console.log("detectOujPageType: 【ログイン画面】");
      resolve('login');
      return;
    }
    if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/player?co=')) {
      const coNum = url.split('co=')[1];
      console.log("detectOujPageType: 【動画再生画面】動画ID:", coNum);
      resolve('player');
      return;
    }
    if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=')) {
      // ca=の後ろの値を抽出
      const match = url.match(/vod\?ca=(\d+)/);
      if (match) {
        const caNum = parseInt(match[1], 10);
        if (isNaN(caNum)) {
          console.log("detectOujPageType: 【動画選択画面】ca=があるが値が取れない場合");
          resolve('vod-select'); // ca=があるが値が取れない場合
          return;
        }
        // parentCategories()を使って判定
        if (typeof window.parentCategories === 'function') {
          try {
            const parentIds = await window.parentCategories();
            console.log("detectOujPageType: parentCategoriesに含まれるかの確認:", parentIds);
            if (parentIds.includes(caNum)) {
              console.log("detectOujPageType: parentCategoriesに含まれるため【コース選択画面】カテゴリID:", caNum);
              resolve('course-select');
              return;
            }
            if (caNum < 100 ) {
              console.log("detectOujPageType: 【コース選択画面】カテゴリID:", caNum);
              resolve('course-select');
              return;
            } else if (480 < caNum && caNum < 500) {
              console.log("detectOujPageType: 【コース選択画面】カテゴリID:", caNum);
              resolve('course-select');
              return;
            } else {
              console.log("detectOujPageType: 【動画選択画面】カテゴリID:", caNum);
              resolve('video-select');
              return;
            }
          } catch (e) {
            console.error("detectOujPageType: parentCategoriesの取得に失敗", e);
            resolve('vod-select');
            return;
          }
        }
        // parentCategoriesが未定義の場合は従来通り
        if (caNum < 100 ) {
          console.log("detectOujPageType: 【コース選択画面】カテゴリID:", caNum);
          resolve('course-select');
          return;
        } else if (480 < caNum && caNum < 500) {
          console.log("detectOujPageType: 【コース選択画面】カテゴリID:", caNum);
          resolve('course-select');
          return;
        } else {
          console.log("detectOujPageType: 【動画選択画面】カテゴリID:", caNum);
          resolve('video-select');
          return;
        }
      }
      console.log("detectOujPageType: 【動画選択画面】ca=があるが値が取れない場合");
      resolve('vod-select');
      return;
    }
    console.log("detectOujPageType: 【そのほか】不明");
    resolve('');
  });
}

async function main() {
  // 画面種別を判定して処理を分岐
  const pageType = await detectOujPageType();
  if (pageType === 'login') {
    // ログイン画面の処理
    console.log("main: ログイン画面を検出しました。自動ログイン監視を開始します。");
    window.waitForPasswordAndLogin();
    return;
  }
  window.waitForLogoAndInsertMenu();

  // ログイン画面ではない場合
  window.getCategoriesData().then(categories => {
    if (pageType === 'player') {
      // 動画再生画面の処理
      // TODO: ・再生速度の調整（記憶させておいたもの）
      // TODO: ・OPスキップ
      // ・EDスキップ
      // ・自動で次を再生
      window.initializeVideoPlayer();
      
    } else if (pageType === 'course-select') {
      // コース選択画面
      // ・お気に入りされているかの確認
      // ・お気に入りボタンを追加
      window.waitThenAddFavBtnToCategoryList();
    } else if (pageType === 'video-select') {
      // 動画選択画面
      // ・お気に入りされているかの確認
      // ・お気に入りボタンを追加
      window.addFavoriteButtonToCategoryTop();
      // TODO: ・どれくらい再生されているのかを取得
      // TODO: ・どこまで再生したかの表示
    } else {
      // その他の処理
      console.log("main: 特に何もしません。");
    }
  });
}

function safeMain() {
  const missing = [];
  if (typeof window.waitForLogoAndInsertMenu !== 'function') missing.push('waitForLogoAndInsertMenu');
  if (typeof window.getCategoriesData !== 'function') missing.push('getCategoriesData');
  if (typeof window.waitThenAddFavBtnToCategoryList !== 'function') missing.push('waitThenAddFavToCategoryList');
  if (typeof window.addFavoriteButtonToCategoryTop !== 'function') missing.push('addFavoriteButtonToCategoryTop');
  if (typeof window.getCurrentCategoryId !== 'function') missing.push('getCurrentCategoryId');
  if (typeof window.getFavorites !== 'function') missing.push('getFavorites');
  
  if (missing.length > 0) {
    if (safeMain._warned !== missing.join(',')) {
      console.error('[OUJ拡張] グローバル関数未定義:', missing.join(', '));
      safeMain._warned = missing.join(',');
    }
    setTimeout(safeMain, 50);
    return;
  }
  main();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  safeMain();
} else {
  document.addEventListener("DOMContentLoaded", safeMain);
}

// SPA対応: URL変化を監視してmain()を再実行
(function() {
  let lastUrl = location.href;
  let urlChangeDetected = false;

  // history.pushState/replaceStateのフック
  function patchHistoryMethod(type) {
    const orig = history[type];
    history[type] = function() {
      const result = orig.apply(this, arguments);
      const event = new Event('ouj-urlchange');
      window.dispatchEvent(event);
      return result;
    };
  }
  patchHistoryMethod('pushState');
  patchHistoryMethod('replaceState');

  // popstateイベント
  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('ouj-urlchange'));
  });

  // 独自イベントでmain()再実行
  window.addEventListener('ouj-urlchange', () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      urlChangeDetected = true;
      console.log('[OUJ拡張] URL変化検知: main()再実行');
      safeMain();
    }
  });

  // フォールバック: どうしても検知できない場合のためのsetInterval
  // （一部のSPA実装ではhistory APIを直接使わずlocation.hashや独自管理の場合があるため）
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (!urlChangeDetected) {
        // history APIフックやpopstateで検知できなかった場合のみログ
        console.warn('[OUJ拡張] setIntervalによるURL変化検知: main()再実行（history APIフック非対応のSPAの可能性）');
      }
      urlChangeDetected = false;
      safeMain();
    }
  }, 1000); // 1秒間隔で十分

  /*
    【うまくいかない場合の主な原因】
    - サイト側がhistory.pushState/replaceStateをラップしている、または独自のルーティング管理をしている
    - location.hashのみで遷移管理している場合（hashchangeイベントも必要な場合あり）
    - そもそもURLが変わらずDOMだけ書き換えるSPAの場合（この場合は要素監視が必要）
    - 拡張機能のcontent scriptが早すぎてhistory APIパッチが間に合わない場合
    その場合はsetIntervalのフォールバックで最低限の検知を担保
  */
})();