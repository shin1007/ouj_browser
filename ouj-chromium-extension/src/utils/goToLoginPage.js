// ホームページの自動ログイン処理
async function handleHomePageAutoLogin() {
  if (!chrome.storage || !chrome.storage.sync) {
    console.warn('[OUJ拡張] chrome.storage.sync が未定義のため、自動でログイン画面に遷移します。');
  } else {
    const autoLogin = await new Promise(resolve => chrome.storage.sync.get(['autoLogin'], resolve));
    // 情報を取得できない場合などは何もしないで終了
    if (autoLogin === undefined) return;
    if (autoLogin.autoLogin === false) return;    
  }
  // ログインボタンが表示されるまで最大10秒待機し、表示されたらクリックする
  let retryCount = 0;
  const maxRetries = 10;
  const interval = setInterval(() => {
    retryCount++;
    const loginResult = tryPushLoginButton();
    if (loginResult) {
      clearInterval(interval);
      return;
    }

    // リトライ回数上限に達した場合
    if (retryCount >= maxRetries) {
      clearInterval(interval);
      // console.log('[OUJ拡張] 自動ログインチェックを停止しました（最大試行回数超過）。');
    }
  }, 1000);
}
function tryPushLoginButton(){
  const themeColorButton = document.querySelector('button#theme-color');
  const currentUrl = window.location.href;
  // ログインボタンが見つかった場合
  if (themeColorButton && themeColorButton.textContent.includes('ログイン')) {
    // currentUrlから最初のhttps://v.ouj.ac.jp/view/ouj/#/navi/を削除
    let rightUrl = currentUrl.replace(/^https:\/\/v\.ouj\.ac\.jp\/view\/ouj\/#\/navi\//, '');
    // ?を%26に変更
    // rightUrl = rightUrl.replace(/\?/g, '%3F');
    rightUrl = rightUrl.replace(/\?/g, '%26');
    // =を%3Dに変更
    rightUrl = rightUrl.replace(/=/g, '%3D');
    // &を%26に変更
    rightUrl = rightUrl.replace(/&/g, '%26');
    const newUrl = `https://sso.ouj.ac.jp/cas/login?service=https%3A%2F%2Fv.ouj.ac.jp%2Fv1%2Ftenants%2F1%2Flogin%2Fcas%3FredirectUrl%3Dhttps%253A%252F%252Fv.ouj.ac.jp%252Fview%252Fouj%252F%2523%252Fnavi%252F${rightUrl}`;
    console.log('newUrl =', newUrl);
    window.location.href = newUrl
    return true;
  }
  // ログイン画面に切り替わるかテスト用
  // https://v.ouj.ac.jp/view/ouj/#/navi/player?co=34475&ct=V&ca=30427
  return false;
}
window.tryPushLoginButton = tryPushLoginButton;
window.handleHomePageAutoLogin = handleHomePageAutoLogin;