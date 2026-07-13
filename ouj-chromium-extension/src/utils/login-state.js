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

  // 観測値を記録(初回もここで記録し、以降の比較基準にする)
  try {
    window.sessionStorage.setItem(OUJ_LAST_LOGIN_STATE_SS_KEY, current);
  } catch (e) { /* 保存失敗は致命的ではない */ }

  if (!previous) {
    // このタブでの初回観測。sessionStorage側には比較対象が無いが、
    // 別タブ/別セッションで取得されたキャッシュ(chrome.storage.localは最大12hタブをまたいで残る)
    // が現在のログイン状態と食い違っている可能性があるため、永続スタンプと突き合わせる。
    const stamped = await getStampedCategoriesLoginState();
    if (stamped === null) {
      // 拡張の初回起動などでスタンプが無い場合は、現状のキャッシュはそのままに基準だけ記録する。
      await setStampedCategoriesLoginState(current);
      return null;
    }
    if (stamped === current) return null; // キャッシュは現在の状態と一致
    // 'guest'→'user'の食い違いのみ信頼して更新する。逆方向('user'→'guest')は反映しない。
    // 理由: getOujLoginState()はDOM裏取り(getOujLoginStateFromDom)で大半のケースを補正するが、
    // このタブでの最初の観測はAngular側の描画がまだ済んでおらず、実際にはログイン済みなのに
    // 一時的に'guest'と判定されうる。この段階で'user'スタンプのキャッシュを'guest'扱いに
    // 書き換えてしまうと、後続の本物のゲストタブがその(実際にはログイン済みの)キャッシュを
    // そのまま受け取ってしまう回帰を招くため、信頼できる'guest'→'user'方向のみ即時反映する。
    // TODO: 逆方向('user'スタンプの状態で、本当にログアウト済みの新規タブを開いた場合)は
    // この初回観測では反映されず、このタブ内で改めてログイン状態が変化するまでは古い
    // 'user'向けキャッシュが残り続ける。実害は「一時的に古い一覧が出る」程度だが、
    // startOujLoginStateWatcherの次回ポーリング(500ms後、previous!==currentの通常経路)で
    // DOM描画が済めば少なくとも'user'方向の誤りは訂正される。厳密に直すには、DOM裏取りが
    // 確定するまで(例: 数回のポーリング)初回判定を保留するなどの対応が要る。
    if (current !== 'user') return null;
    await invalidateOujCachesForState(current);
    return current;
  }

  if (previous === current) return null; // 変化なし(同一タブ内)

  // ログイン⇔ログアウトが切り替わった(同一タブ内で検知) → 授業一覧＋ユーザー単位キャッシュを最新化する
  await invalidateOujCachesForState(current);
  return current; // 切り替わった新しい状態
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
}

// グローバル関数として公開
window.getOujLoginState = getOujLoginState;
window.clearOujUserScopedCaches = clearOujUserScopedCaches;
window.syncOujLoginStateAndInvalidate = syncOujLoginStateAndInvalidate;
window.startOujLoginStateWatcher = startOujLoginStateWatcher;
