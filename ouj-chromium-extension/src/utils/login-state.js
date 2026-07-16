// login-state.js
// 放送大学サイトのログイン状態(ゲスト/CASログイン済み)の変化を監視し、
// 切り替わったタイミングで授業一覧(カテゴリ)キャッシュを破棄して取得しなおすためのユーティリティ。
//
// 判定根拠(実サイトで実測済み・tenantId=1固定):
// - サイト(Classtream)はログイン状態を sessionStorage に保持する。
//   - "ClasstreamIsCasLogin_1" … "true"=CASログイン済み / "false"=ゲスト。★これを信頼する。
//   - "ClasstreamIsGuest_1"    … サイト側スクリプトのバグ(コンストラクタで isCasLogin_ の値を
//                                 書き込んでしまう)で当てにならないため使わない。
// - ログイン前後で取得できる授業(カテゴリ)一覧が変わる(実測: ゲスト274件 → ログイン529件)。
//   そのため状態が切り替わったタイミングでキャッシュ(cachedCategoriesData)を破棄し、次回取得で最新化する。
// - 従来は「ログイン画面(sso .../cas/login)から離れた」URL遷移でのみキャッシュ破棄していたが、
//   ログアウト(.../logout/cas 経由)を捕捉できていなかった。本モジュールはURLではなく実際の
//   ログイン状態を見るため、ログイン・ログアウト双方を一様に扱える。
//
// 既知の実機不具合: 「既にログイン済みの状態(有効なCASセッションCookie)で新規タブを開く」場合、
// ClasstreamIsCasLogin_1 が 'false' のまま更新されないことがある(Playwrightで確認済み)。おそらく
// サイト側スクリプトがCASログインのリダイレクト処理の副作用としてのみこのフラグを立てており、
// 既存Cookieでの暗黙ログインは考慮していない。この誤検知(見た目はログイン済みなのに'guest'扱い)
// を補正するため、getOujLoginState()はフラグが'false'の場合に限り、実際に画面へ描画されたDOM
// (common-header の .user-id-menu 内、ユーザーIDラベル)も確認する。ログイン直後はAngular側の
// 描画がこのフラグより先に済むとは限らないため、初回はDOM未描画で'guest'と判定されることもあるが、
// その場合も後続のポーリング(startOujLoginStateWatcher、500ms間隔)でDOM描画後に'user'へ訂正され、
// 通常のログイン検知と同じ経路でキャッシュが破棄される。

// サイトのテナントID(全APIで /tenants/1/ 固定)
const OUJ_TENANT_ID = 1;
// CASログイン状態を保持するサイト側 sessionStorage キー
const OUJ_IS_CAS_LOGIN_SS_KEY = `ClasstreamIsCasLogin_${OUJ_TENANT_ID}`;
// ログイン済みの場合のみサイトが描画するユーザーIDラベルのセレクタ(tests/visual/auth.jsの
// ログイン済み判定と同じもの)。ClasstreamIsCasLogin_1 が'false'のまま更新されない実機不具合を
// 補正するためのDOM側フォールバックに使う。
const OUJ_USER_ID_LABEL_SELECTOR = '.user-id-menu ion-label.user-id';
// 前回観測したログイン状態を保持する自前キー(タブ単位=sessionStorage)。
// 現在値と同じスコープ(タブ単位)で持つことで、複数タブでログイン状態が食い違う
// 過渡期に「タブ間でキャッシュ破棄を撃ち合う」現象を避ける。
const OUJ_LAST_LOGIN_STATE_SS_KEY = 'oujLastKnownLoginState';
// cachedCategoriesDataを「取得した時点のログイン状態」を保持する永続キー(chrome.storage.local)。
// sessionStorageのタブ単位baselineだけだと、新しいタブでの初回観測は無条件でキャッシュ破棄を
// スキップするため、「別タブ/別セッションでゲスト状態のまま取得したキャッシュ(chrome.storage.local
// は最大12hタブをまたいで残る)を、ログイン済みの新規タブで初めて開いた」ケースを取りこぼす
// (実際に報告されたバグ: ログアウト状態→ログインしても授業一覧が更新されない)。
// この永続スタンプと突き合わせることでタブをまたいだ取りこぼしを防ぐ。
const OUJ_CATEGORIES_LOGIN_STATE_KEY = 'oujCategoriesLoginState';
// 初回観測で'user'スタンプ→'guest'方向の判定を保留する際、信頼するまでに要する連続確認回数
// (1回=約500msのポーリング間隔)。既存Cookieでの暗黙ログイン直後はAngular側の描画が
// 初回観測に間に合わないことがあるため、即断せず数回連続で'guest'が観測できてから信頼する。
const OUJ_GUEST_CONFIRM_POLLS = 2;
// 上記の連続確認カウンタ(タブ内メモリ、複数タブでは独立)。
let oujPendingGuestConfirmCount = 0;

// ログイン切替時に破棄する「ユーザー単位」キャッシュのキー接頭辞(chrome.storage.local)。
// - videoViewingStatus_* … 視聴進捗(currentTimeRate)。ユーザーごとに異なるため切替時に破棄し、
//   「X/Y回視聴済み」バッジ・続きから見る・サムネ進捗バーを現在のユーザーの内容にする。
//   ログアウト時は前ユーザーの進捗が残らないようにする狙いもある。
// ※ cachedVodContent_*(動画メタ)・cachedVideoList_*(回一覧)はログインでほぼ変わらない静的データの
//   ため対象外(TTL 12hで自然に消える)。お気に入り等のユーザーデータはlocalStorage側にあり無関係。
const OUJ_USER_SCOPED_CACHE_PREFIXES = ['videoViewingStatus_'];

/**
 * DOMに実際に描画されたユーザーIDラベルの有無からログイン状態を判定する。
 * サイト側sessionStorageのフラグと異なり、Angular側が実際に描画した内容を見るため、
 * 「既存Cookieでの暗黙ログイン」でも正しく検知できる。
 * @returns {'user'|'guest'} ラベルが描画されていれば'user'、無ければ'guest'
 */
function getOujLoginStateFromDom() {
  try {
    const label = document.querySelector(OUJ_USER_ID_LABEL_SELECTOR);
    if (label && label.textContent.trim()) return 'user';
  } catch (e) { /* noop */ }
  return 'guest';
}

/**
 * 現在のログイン状態を返す。
 * @returns {'user'|'guest'|'unknown'} 'user'=ログイン済み, 'guest'=未ログイン, 'unknown'=サイト未初期化
 */
function getOujLoginState() {
  let raw = null;
  try {
    raw = window.sessionStorage.getItem(OUJ_IS_CAS_LOGIN_SS_KEY);
  } catch (e) {
    return 'unknown';
  }
  if (raw === 'true') return 'user';
  // 'false'は「既存Cookieでの暗黙ログイン」時に誤検知しうるため、DOM側の描画内容でも裏取りする。
  if (raw === 'false') return getOujLoginStateFromDom();
  return 'unknown';
}

/**
 * chrome.storage.local から「ユーザー単位」キャッシュ(視聴進捗など)を一括破棄する。
 * 単一キーではなく接頭辞一致のため、全キーを走査して該当分だけ remove する。
 * お気に入り等のユーザーデータは localStorage 側にあるので巻き込まない。
 * @returns {Promise<number>} 破棄したキー数
 */
async function clearOujUserScopedCaches() {
  try {
    const all = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter((key) =>
      OUJ_USER_SCOPED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
    );
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
    return keysToRemove.length;
  } catch (error) {
    console.error('clearOujUserScopedCaches: ユーザー単位キャッシュの破棄に失敗しました:', error);
    return 0;
  }
}

/**
 * cachedCategoriesDataを取得した時点のログイン状態(永続スタンプ)を返す。
 * @returns {Promise<'user'|'guest'|null>} 記録が無ければnull
 */
async function getStampedCategoriesLoginState() {
  try {
    const result = await chrome.storage.local.get([OUJ_CATEGORIES_LOGIN_STATE_KEY]);
    return result[OUJ_CATEGORIES_LOGIN_STATE_KEY] || null;
  } catch (e) {
    return null;
  }
}

/** @param {'user'|'guest'} state */
async function setStampedCategoriesLoginState(state) {
  try {
    await chrome.storage.local.set({ [OUJ_CATEGORIES_LOGIN_STATE_KEY]: state });
  } catch (e) { /* 保存失敗は致命的ではない */ }
}

/**
 * 授業一覧＋ユーザー単位キャッシュを破棄し、永続スタンプを新しい状態に更新する。
 * @param {'user'|'guest'} newState
 */
async function invalidateOujCachesForState(newState) {
  if (typeof window.clearCachedCategoriesData === 'function') {
    await window.clearCachedCategoriesData(); // 授業一覧(cachedCategoriesData)
  }
  await clearOujUserScopedCaches(); // 視聴進捗(videoViewingStatus_*)
  // 全科目絞り込みパネル(search-box-all-subjects-panel.js)が持つ、視聴状況のメモリ内キャッシュ。
  // chrome.storage.local側(videoViewingStatus_*)とは別に、分類結果(watchState)自体を
  // パネル内で使い回しているため、こちらも合わせて破棄しないとログイン前の判定が残り続ける
  if (typeof window.clearOujAllSubjectsProgressCache === 'function') {
    window.clearOujAllSubjectsProgressCache();
  }
  await setStampedCategoriesLoginState(newState); // 次回取得はnewState向けである、と記録
}

/**
 * 現在のログイン状態を前回観測値と比較し、切り替わっていれば授業一覧キャッシュを破棄する。
 * 'unknown'(サイト未初期化)の場合は何もしない。
 * @returns {Promise<('user'|'guest'|null)>} 切り替わったら新しい状態、変化なし/未確定なら null
 */
async function syncOujLoginStateAndInvalidate() {
  const current = getOujLoginState();
  if (current === 'unknown') return null; // サイト未初期化。次回の観測に持ち越す

  let previous = null;
  try {
    previous = window.sessionStorage.getItem(OUJ_LAST_LOGIN_STATE_SS_KEY);
  } catch (e) { /* 読めなければ初回扱い */ }

  if (!previous) {
    // このタブでの初回観測。sessionStorage側には比較対象が無いが、
    // 別タブ/別セッションで取得されたキャッシュ(chrome.storage.localは最大12hタブをまたいで残る)
    // が現在のログイン状態と食い違っている可能性があるため、永続スタンプと突き合わせる。
    const stamped = await getStampedCategoriesLoginState();
    if (stamped === null) {
      // 拡張の初回起動などでスタンプが無い場合は、現状のキャッシュはそのままに基準だけ記録する。
      oujPendingGuestConfirmCount = 0;
      try { window.sessionStorage.setItem(OUJ_LAST_LOGIN_STATE_SS_KEY, current); } catch (e) { /* 保存失敗は致命的ではない */ }
      await setStampedCategoriesLoginState(current);
      return null;
    }
    if (stamped === current) {
      // キャッシュは現在の状態と一致
      oujPendingGuestConfirmCount = 0;
      try { window.sessionStorage.setItem(OUJ_LAST_LOGIN_STATE_SS_KEY, current); } catch (e) { /* 保存失敗は致命的ではない */ }
      return null;
    }
    // 'guest'→'user'の食い違いは、getOujLoginState()側のDOM裏取り(getOujLoginStateFromDom)込みの
    // 判定のため即座に信頼して更新する。
    if (current === 'user') {
      oujPendingGuestConfirmCount = 0;
      try { window.sessionStorage.setItem(OUJ_LAST_LOGIN_STATE_SS_KEY, current); } catch (e) { /* 保存失敗は致命的ではない */ }
      await invalidateOujCachesForState(current);
      return current;
    }
    // 逆方向('user'スタンプの状態で現在'guest'と判定された)。
    // 理由: このタブでの最初の観測はAngular側の描画がまだ済んでおらず、既存Cookieでの
    // 暗黙ログインの場合、実際にはログイン済みなのに一時的に'guest'と判定されうる。
    // この段階で即座に'user'スタンプのキャッシュを'guest'扱いに書き換えてしまうと、
    // 後続の本物のゲストタブがその(実際にはログイン済みの)キャッシュをそのまま受け取って
    // しまう回帰を招く。そのため、sessionStorageへのベースライン確定を保留し(=次回も
    // 「初回観測」として再評価させる)、OUJ_GUEST_CONFIRM_POLLS回連続で'guest'が観測できた
    // 場合のみ、本当のログアウト済み新規タブとみなしてキャッシュを破棄する。
    oujPendingGuestConfirmCount++;
    if (oujPendingGuestConfirmCount < OUJ_GUEST_CONFIRM_POLLS) return null;
    oujPendingGuestConfirmCount = 0;
    try { window.sessionStorage.setItem(OUJ_LAST_LOGIN_STATE_SS_KEY, current); } catch (e) { /* 保存失敗は致命的ではない */ }
    await invalidateOujCachesForState(current);
    return current;
  }

  oujPendingGuestConfirmCount = 0;
  try {
    window.sessionStorage.setItem(OUJ_LAST_LOGIN_STATE_SS_KEY, current);
  } catch (e) { /* 保存失敗は致命的ではない */ }

  if (previous === current) return null; // 変化なし(同一タブ内)

  // ログイン⇔ログアウトが切り替わった(同一タブ内で検知) → 授業一覧＋ユーザー単位キャッシュを最新化する
  await invalidateOujCachesForState(current);
  return current; // 切り替わった新しい状態
}

// vod系ページ(科目一覧・回一覧等)間の遷移だけでは、サイト自身(Angular)がログイン状態の
// 再検証を行わない(実機・Playwrightで確認済み: 既にCookieレベルではログイン済みでも、
// vod系ページを行き来している間はsessionStorageのClasstreamIsCasLogin_1もDOMのユーザーID
// ラベルもいつまでも更新されない)。そのため、別タブでのログイン等により実際にはログイン
// 済みになっていても、このタブのsyncOujLoginStateAndInvalidateは判定材料自体が更新されず
// 検知しようがなく、拡張のカテゴリキャッシュがゲスト時点のまま延々と古くなる不具合が起きる。
// 一方 #/navi/home への遷移では(理由不明だが)この再検証が実行されることを確認済みで、
// sessionStorageのフラグ自体は一瞬(実測100ms程度)で更新される(ユーザーIDラベルのDOM描画は
// もっと遅れて追従するが、カテゴリキャッシュの是正にはフラグの更新だけで足りる)。
// この性質を利用し、拡張自身が起点となる別コースへの遷移の直前にだけ、一瞬homeを経由させて
// からリダイレクトすることで、追加のサーバーリクエストを一切増やさずに解消できる
// (サイト純正のリンククリックまでは検知・介入できないため対象外。ゲストのまま操作を続ける
// 場合の方が多いため、頻繁に経由させるとちらつきが増える。ある程度の間隔を空けてスキップする)。
const OUJ_GUEST_REVALIDATE_SS_KEY = 'oujLastGuestRevalidateAt';
const OUJ_GUEST_REVALIDATE_DWELL_MS = 300;
const OUJ_GUEST_REVALIDATE_INTERVAL_MS = 2 * 60 * 1000;

function shouldBounceThroughHomeForGuestRevalidation() {
  if (getOujLoginState() !== 'guest') return false; // 既にuser、または未確定(unknown)なら不要
  let last = 0;
  try { last = Number(window.sessionStorage.getItem(OUJ_GUEST_REVALIDATE_SS_KEY)) || 0; } catch (e) { /* noop */ }
  return (Date.now() - last) >= OUJ_GUEST_REVALIDATE_INTERVAL_MS;
}

/**
 * 拡張自身が起点の別コース等への遷移の直前に呼ぶ。ゲスト判定中かつ直近で経由済みでなければ、
 * 一瞬 #/navi/home を経由してから本来の遷移先へ移動する(既にログイン済みだった場合、この
 * 一瞬の経由でカテゴリキャッシュが最新化される)。それ以外は素通しでそのまま即座に遷移する。
 * ホーム経由中は自動ログイン機能(utils/goToLoginPage.js)を1回だけ止め、ゲストのまま
 * 遷移しようとしたユーザーが意図せずSSOログイン画面へ飛ばされないようにする。
 * @param {string} targetUrl 本来の遷移先URL
 */
async function navigateWithOujGuestRevalidation(targetUrl) {
  if (!shouldBounceThroughHomeForGuestRevalidation()) {
    window.location.href = targetUrl;
    return;
  }
  try { window.sessionStorage.setItem(OUJ_GUEST_REVALIDATE_SS_KEY, String(Date.now())); } catch (e) { /* noop */ }
  window.__oujSkipAutoLoginOnce = true;
  window.location.hash = '#/navi/home';
  await new Promise((resolve) => setTimeout(resolve, OUJ_GUEST_REVALIDATE_DWELL_MS));
  // 待機中に(ユーザー操作等で)別の遷移が既に起きていたら上書きしない
  if (!window.location.href.includes('#/navi/home')) return;
  window.location.href = targetUrl;
}

/**
 * ログイン状態の変化を監視する。切り替わりを検知したらキャッシュ破棄後に onChange を呼ぶ。
 * sessionStorage への同一ドキュメント内書き込みでは storage イベントが飛ばないため、
 * 軽量なポーリングで監視する。二重起動はしない。
 * @param {(newState: 'user'|'guest') => void} [onChange] 切り替わり検知時(キャッシュ破棄後)に、
 *        新しい状態を引数として呼ばれる。表示中の内容を描き直す用途を想定。
 */
function startOujLoginStateWatcher(onChange) {
  if (window.__oujLoginStateWatcherStarted) return;
  window.__oujLoginStateWatcherStarted = true;

  const check = async () => {
    const newState = await syncOujLoginStateAndInvalidate();
    if (newState && typeof onChange === 'function') onChange(newState);
  };
  // 起動直後に一度観測(初回は基準の記録のみ)し、以降ポーリングで変化を追う。
  check();
  setInterval(check, 500);

  // バックグラウンドタブは500msポーリングがChromeに大幅スロットリングされる
  // (数分以上非アクティブだと1分に1回程度まで間引かれる)。ログイン前のタブを
  // 開いたまま別タブ/別操作でログインし、しばらくしてから元のタブへ戻ると、
  // ポーリングが追いつくまでの間「ログイン済みなのにコース一覧が少ないまま」に
  // 見え続ける不具合が起きうる。タブが前面に戻った瞬間はスロットリングされないため、
  // visibilitychangeでも即座に1回チェックし、素早く追従させる
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
}

// グローバル関数として公開
window.getOujLoginState = getOujLoginState;
window.clearOujUserScopedCaches = clearOujUserScopedCaches;
window.syncOujLoginStateAndInvalidate = syncOujLoginStateAndInvalidate;
window.startOujLoginStateWatcher = startOujLoginStateWatcher;
window.getStampedCategoriesLoginState = getStampedCategoriesLoginState;
window.navigateWithOujGuestRevalidation = navigateWithOujGuestRevalidation;
