// 画面種別を判定する関数
function detectOujPageType() {
  const url = window.location.href;
  console.log("現在のURL:", url);
  if (url.includes('https://sso.ouj.ac.jp/cas/login')) {
    console.log("【ログイン画面】");
    return 'login';
  }
  if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/player?co=')) {
    const coNum = url.split('co=')[1];
    console.log("【動画再生画面】動画ID:", coNum);
    return 'player';
  }
  if (url.includes('https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=')) {
    // ca=の後ろの値を抽出
    const match = url.match(/vod\?ca=(\d+)/);
    if (match) {
      const caNum = parseInt(match[1], 10);
      if (!isNaN(caNum)) {
        if (caNum < 100 ) {
          console.log("【コース選択画面】カテゴリID:", caNum);
          return 'course-select'; // コース選択画面
        } else if (480 < caNum && caNum < 500) {
          console.log("【コース選択画面】カテゴリID:", caNum);
          return 'course-select'; // コース選択画面
        } else {
          console.log("【動画選択画面】カテゴリID:", caNum);
          return 'video-select'; // 講座選択画面
        }
      }
    }
    console.log("【動画選択画面】ca=があるが値が取れない場合");
    return 'vod-select'; // ca=があるが値が取れない場合
  }
  console.log("【そのほか】不明");
  return ''; // 何も含まない場合
}

function main() {
  // 画面種別を判定して処理を分岐
  const pageType = detectOujPageType();
  if (pageType === 'login') {
    // ログイン画面の処理
    console.log("ログイン画面を検出しました。自動ログイン監視を開始します。");
    window.waitForPasswordAndLogin();
    return;
  }
  window.waitForLogoAndInsertMenu();

  // ログイン画面ではない場合
  window.getCategoriesData().then(categories => {
    console.log("categories:", categories);
    if (pageType === 'player') {
      // 動画再生画面の処理
      // TODO: ・再生速度の調整（記憶させておいたもの）
      // TODO: ・OPEDスキップ
      // TODO: ・自動で次を再生
    } else if (pageType === 'course-select') {
      // コース選択画面
      // TODO: ・お気に入りされているかの確認
      // ・お気に入りボタンを追加
      window.waitThenAddFavBtnToCategoryList();
    } else if (pageType === 'video-select') {
      // 動画選択画面
      // TODO: ・お気に入りされているかの確認
      // TODO: ・お気に入りボタンを追加
      window.addFavoriteButtonToCategoryTop();
      // TODO: ・どれくらい再生されているのかを取得
      // TODO: ・どこまで再生したかの表示
    } else {
      // その他の処理
      console.log("特に何もしません。");
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
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('[OUJ拡張] URL変化検知: main()再実行');
      safeMain();
    }
  }, 500);
})();