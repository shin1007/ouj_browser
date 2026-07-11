// 設定・データのchrome.storageミラーリング基盤
//
// 拡張機能の設定やお気に入り・履歴などはv.ouj.ac.jpドメインのlocalStorageに
// 保存されている（getSetting/saveSettingが同期APIであることに依存する箇所が
// 多いため、これは変えない）。ただしlocalStorageだけだと
//   1. ブラウザの「サイトデータ削除」で全データが消える（バックアップ不能）
//   2. ポップアップ（拡張ページ）から設定を読み書きできない
//   3. 別のPC・タブレットとお気に入りや設定を共有できない
// という問題があるため、本ファイルで選択したキーだけをchrome.storageへ
// ミラーリングする。localStorageが常に「正」で、chrome.storage側は写し。
//
// - 小さな設定値・お気に入り → chrome.storage.sync（デバイス間同期される）
// - 履歴・学習時間など大きめのデータ → chrome.storage.local（バックアップ用）
// - ミラーのキーは "mirror:" プレフィックス付きで保存し、値は
//   { value, updatedAt } 形式。updatedAtの新しい方を採用する（last-writer-wins）
// - ポップアップや他デバイスからの変更はchrome.storage.onChangedで受け取り、
//   localStorageへ反映する

const OUJ_MIRROR_PREFIX = 'mirror:';
// localStorage側に持つ「各キーをいつミラーへ書いたか/いつミラーから取り込んだか」の記録
const OUJ_MIRROR_META_KEY = 'oujMirrorMeta';
// ミラー書き込みのデバウンス時間。学習時間のように高頻度で保存されるキーで
// chrome.storageへの書き込みが毎回走らないようにする
const OUJ_MIRROR_DEBOUNCE_MS = 1500;

// syncミラー対象（設定値・お気に入り。100KB/8KBのsyncクォータに収まる小さなもの）
const OUJ_SYNC_MIRROR_KEYS = [
  'favorites',
  'pinnedFavorites',
  'favoritesSortMode',
  'nextVideoSetting',
  'autoNextVideoEnabled',
  'autoPlayEnabled',
  'autoCaptionEnabledTV',
  'autoCaptionEnabledRadio',
  'preventCaptionShrink',
  'screenWakeLockEnabled',
  'volumeNormalizationEnabled',
  'playbackSpeedControlEnabled',
  'playbackSpeed',
  'skipEndSeconds',
  'skipStartSeconds',
  'playlogIntervalMinutes',
  'studyTimeGoalMinutes',
  'searchFilterMedia',
  'searchFilterCaptionOnly',
  'searchFilterUnwatchedOnly',
  'searchFilterPartialOnly',
];

// localミラー対象（大きめ・書き込み頻度が高いデータ。同期はせずバックアップ用）
const OUJ_LOCAL_MIRROR_KEYS = [
  'history',
  'studyTimeByDate',
  'bookmarks',
  'watchLater',
  'watchedOverride',
  'searchKeywordHistory',
  'lastSeenVersion',
];

// 科目別設定（playbackSpeed_30211 等）は数が動的に増えるため、
// 1つのミラーキー(perCourseSettings)にまとめて保存する
const OUJ_PER_COURSE_KEY_PATTERN = /^(playbackSpeed|skipEndSeconds|skipStartSeconds)_\d+$/;
const OUJ_PER_COURSE_MIRROR_KEY = 'perCourseSettings';

function oujGetMirrorArea(key) {
  if (OUJ_SYNC_MIRROR_KEYS.includes(key)) return 'sync';
  if (OUJ_LOCAL_MIRROR_KEYS.includes(key) || key === OUJ_PER_COURSE_MIRROR_KEY) return 'local';
  return null;
}

function oujReadMirrorMeta() {
  try {
    return JSON.parse(localStorage.getItem(OUJ_MIRROR_META_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function oujWriteMirrorMeta(meta) {
  try {
    localStorage.setItem(OUJ_MIRROR_META_KEY, JSON.stringify(meta));
  } catch (e) {
    // localStorageが使えない環境では何もしない
  }
}

// key -> デバウンス用タイマーID
const oujMirrorTimers = {};
// key -> 書き込み待ちの値
const oujMirrorPendingValues = {};

// ミラーへ実際に書き込む（デバウンスのフラッシュ処理）
function oujFlushMirrorWrite(key) {
  if (!(key in oujMirrorPendingValues)) return;
  const value = oujMirrorPendingValues[key];
  delete oujMirrorPendingValues[key];
  if (oujMirrorTimers[key]) {
    clearTimeout(oujMirrorTimers[key]);
    delete oujMirrorTimers[key];
  }
  const areaName = oujGetMirrorArea(key);
  if (!areaName || !chrome.storage || !chrome.storage[areaName]) return;
  const updatedAt = Date.now();
  const meta = oujReadMirrorMeta();
  meta[key] = updatedAt;
  oujWriteMirrorMeta(meta);
  try {
    chrome.storage[areaName].set({ [OUJ_MIRROR_PREFIX + key]: { value, updatedAt } }, () => {
      // syncのクォータ超過などで失敗してもlocalStorage側が正なので致命的ではない
      if (chrome.runtime.lastError) {
        console.warn('[OUJ拡張] ミラー書き込み失敗:', key, chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    // 拡張機能コンテキストが無効化された場合など
  }
}

// ミラーへの書き込みを予約する（デバウンス付き）
function oujScheduleMirrorWrite(key, value) {
  // 科目別設定は1つのミラーキーにまとめる
  if (OUJ_PER_COURSE_KEY_PATTERN.test(key)) {
    const grouped = oujMirrorPendingValues[OUJ_PER_COURSE_MIRROR_KEY]
      || window.getSetting(OUJ_PER_COURSE_MIRROR_KEY, {});
    grouped[key] = value;
    // localStorage側にもまとめキーを保持しておく（エクスポートや初回適用を単純にするため）
    try {
      localStorage.setItem(OUJ_PER_COURSE_MIRROR_KEY, JSON.stringify(grouped));
    } catch (e) { /* 何もしない */ }
    key = OUJ_PER_COURSE_MIRROR_KEY;
    value = grouped;
  }
  const areaName = oujGetMirrorArea(key);
  if (!areaName) return;
  oujMirrorPendingValues[key] = value;
  if (oujMirrorTimers[key]) clearTimeout(oujMirrorTimers[key]);
  oujMirrorTimers[key] = setTimeout(() => oujFlushMirrorWrite(key), OUJ_MIRROR_DEBOUNCE_MS);
}

// ミラーの値をlocalStorageへ取り込む（saveSettingを通すとミラーへ書き戻して
// しまうため、素のlocalStorage.setItemを使う）
function oujApplyMirrorEntry(key, entry) {
  if (!entry || typeof entry !== 'object' || !('value' in entry)) return false;
  const meta = oujReadMirrorMeta();
  if ((meta[key] || 0) >= (entry.updatedAt || 0)) return false;
  try {
    if (key === OUJ_PER_COURSE_MIRROR_KEY) {
      // まとめキーは展開して個別キーとして書き込む
      const grouped = entry.value || {};
      Object.keys(grouped).forEach((subKey) => {
        if (OUJ_PER_COURSE_KEY_PATTERN.test(subKey)) {
          localStorage.setItem(subKey, JSON.stringify(grouped[subKey]));
        }
      });
      localStorage.setItem(OUJ_PER_COURSE_MIRROR_KEY, JSON.stringify(grouped));
    } else {
      localStorage.setItem(key, JSON.stringify(entry.value));
    }
    meta[key] = entry.updatedAt || Date.now();
    oujWriteMirrorMeta(meta);
    return true;
  } catch (e) {
    return false;
  }
}

// 起動時: sync/local両方のミラーを読み、localStorageより新しいものを取り込む。
// また、ミラーがまだ存在しないキーはlocalStorage側の現在値をミラーへ書き出す
// （既存ユーザーの設定・お気に入りが最初からポップアップやバックアップに反映されるように）。
// 完了はwindow.oujSettingsSyncReadyのPromiseで待てる（content.jsのmainが利用）
async function oujInitializeSettingsSync() {
  if (!chrome.storage) return;
  const areas = ['sync', 'local'];
  const seenMirrorKeys = new Set();
  for (const areaName of areas) {
    try {
      const all = await new Promise((resolve) => chrome.storage[areaName].get(null, resolve));
      Object.keys(all || {}).forEach((storageKey) => {
        if (!storageKey.startsWith(OUJ_MIRROR_PREFIX)) return;
        const key = storageKey.slice(OUJ_MIRROR_PREFIX.length);
        if (oujGetMirrorArea(key) !== areaName) return;
        seenMirrorKeys.add(key);
        oujApplyMirrorEntry(key, all[storageKey]);
      });
    } catch (e) {
      // storageが読めなくても拡張機能自体は動作させる
    }
  }
  // ミラー未作成のキーをlocalStorageの現在値で種まきする
  [...OUJ_SYNC_MIRROR_KEYS, ...OUJ_LOCAL_MIRROR_KEYS].forEach((key) => {
    if (seenMirrorKeys.has(key)) return;
    try {
      if (localStorage.getItem(key) === null) return;
      oujScheduleMirrorWrite(key, window.getSetting(key, null));
    } catch (e) { /* 何もしない */ }
  });
}

// saveSettingをラップしてミラー書き込みを差し込む。
// menu.jsにも別のsaveSettingラッパー（おすすめプリフェッチ）があるが、
// このファイルはmenu.jsより先に読み込まれるため、ラップの順序は
// menu.jsのラッパー → このラッパー → 素のsaveSetting となり互いに干渉しない
(function () {
  const originalSaveSetting = window.saveSetting;
  window.saveSetting = function (key, value) {
    originalSaveSetting.apply(this, arguments);
    oujScheduleMirrorWrite(key, value);
  };
})();

// ページを閉じる直前に書き込み待ちのミラーをフラッシュする（ベストエフォート）
window.addEventListener('pagehide', () => {
  Object.keys(oujMirrorPendingValues).forEach((key) => oujFlushMirrorWrite(key));
});

// ポップアップ・他デバイス・他タブからの変更をlocalStorageへ反映する
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' && areaName !== 'local') return;
    Object.keys(changes).forEach((storageKey) => {
      if (!storageKey.startsWith(OUJ_MIRROR_PREFIX)) return;
      const key = storageKey.slice(OUJ_MIRROR_PREFIX.length);
      if (oujGetMirrorArea(key) !== areaName) return;
      oujApplyMirrorEntry(key, changes[storageKey].newValue);
    });
  });
}

window.oujSettingsSyncReady = oujInitializeSettingsSync();
