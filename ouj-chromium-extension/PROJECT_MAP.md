# プロジェクト地図（放送大学授業ブラウザ拡張）

> このファイルはコードベース全体の「地図」です。作業前にまずここを読めば、
> 全ファイルを grep せずに担当ファイルを特定できます（トークン節約が目的）。
> 実装を変更したら、対応する行の要約も更新してください。

## 全体像

- **種別**: Chrome拡張（Manifest V3）。ビルド工程なし。生の `.js`/`.css` を [src/manifest.json](src/manifest.json) の `content_scripts` に**列挙した順**でロードする。
- **モジュール共有**: ES Modules や bundler は使わず、各ファイルは末尾で `window.関数名 = 関数名` として公開し、他ファイルは `window.*` 経由で呼ぶ。→ 並列作業向けのファイル分割方針（[AGENTS.md](AGENTS.md)）と対応。
- **ロード順 ＝ 依存順**: `utils/`（基盤）→ `menu/` → `page-video/` → `page-*`（各ページ）→ 最後に [src/content.js](src/content.js)（オーケストレーター）。
- **オーケストレーション**: [content.js](src/content.js) が `detectOujPageType()` で画面種別を判定し、ページごとに必要な機能を起動する。対象サイトはIonic/AngularのSPAなので、URL変化（pushState/popstate/hashchange＋250msポーリング）を監視して再実行する。
- **状態の保存先**:
  - `localStorage`（[utils/settings.js](src/utils/settings.js)）… お気に入り・履歴・あとで見る・しおり・視聴override・各種設定・学習時間 等。拡張機能のデータはほぼここ。
  - `chrome.storage.sync` … ポップアップの設定（自動ログインON/OFF・テーマ）など少数。
  - `window.*` 共有変数 … 動画ページの一時状態（`nextVideoId`, `videoListInCourse`, `currentVideoIndexInCourse` 等）。
- **重要方針**: 放送大学サーバーへの負荷を最小化する。API取得は [utils/net.js](src/utils/net.js) の `fetchWithCache` でキャッシュし、一覧系は IntersectionObserver＋同時実行制限で「画面内に入った項目だけ」遅延取得する。

## 対象サイトのAPI/画面

- カテゴリAPI: `https://v.ouj.ac.jp/v1/tenants/1/categories`（[utils/categories.js](src/utils/categories.js)）。
- 画面種別: `home` / `search-result` / `player`（動画再生）/ `series-select`（科目一覧）/ `video-select`（回の一覧）。判定は [utils/page-type.js](src/utils/page-type.js)。
- `target_site/` は放送大学実サイトの保存HTML/JSON（**参照用資料。拡張機能本体ではない**）。DOM構造やAPIレスポンス形状を確認したいときに読む。

---

## エントリポイント

| ファイル | 役割 | 主な公開IF |
|---|---|---|
| [src/background.js](src/background.js) | service worker。`webNavigation.onCompleted` で content.js 注入を補助 | — |
| [src/content.js](src/content.js) | **オーケストレーター**。ページ種別で分岐し各機能を起動。SPAのURL変化監視 | `main()` / `safeMain()`（内部） |

## utils/ — 基盤ユーティリティ（最初にロード）

| ファイル | 役割 | 主な公開IF（window.*） |
|---|---|---|
| [utils/net.js](src/utils/net.js) | APIキャッシュ・同時実行ゲート | `fetchWithCache`, `createConcurrencyGate` |
| [utils/dom-wait.js](src/utils/dom-wait.js) | DOM/条件の出現待ち | `waitForElement`, `waitForCondition` |
| [utils/settings.js](src/utils/settings.js) | localStorage設定の読み書き（科目別設定含む） | `getSetting`, `saveSetting`, `getBooleanSetting`, `getPerCourseSetting`, `savePerCourseSetting`, `removeSetting` |
| [utils/notification.js](src/utils/notification.js) | トースト通知 | `showNotification`, `show{Success,Error,Warning,Info}Notification`, `closeNotification` |
| [utils/dialog.js](src/utils/dialog.js) | モーダル確認/入力ダイアログ | `showConfirmDialog`, `showPromptDialog` |
| [utils/text.js](src/utils/text.js) | タイトル/科目名の整形 | `trimTitle`, `trimCourseName` |
| [utils/page-type.js](src/utils/page-type.js) | URLから画面種別を判定 | `detectOujPageType`, `decodeURLComponentSafe` |
| [utils/categories.js](src/utils/categories.js) | カテゴリ/動画データAPIのラッパ | `getCategoriesData`, `getChildIds`, `getCurrentCategoryId`, `getVideoData`, `getVideoListInCategory`, `getVideoProgress`, `getCategoryDataFromContentId`, `getParentCategoryName`, `getCourseGroups`（コース級を親でグループ化）他 |
| [utils/year.js](src/utils/year.js) | 年度データのヘルパー（科目名末尾の（'XX）から年度抽出・年度別に科目をまとめる）。categories.jsに依存。検索ボックスの絞り込み／科目一覧フィルタが利用（以前あったメニューの年度別パネルは廃止） | `createYearListData`, `extractYearFromCategoryName` |
| [utils/favorites-helper.js](src/utils/favorites-helper.js) | お気に入り（**科目単位**） | `getFavorites`, `isFavorite`, `addFavorite`, `removeFavorite`, `toggleFavorite` |
| [utils/watch-later.js](src/utils/watch-later.js) | あとで見る（**動画/回単位**のキュー） | `getWatchLaterList`, `isInWatchLater`, `addToWatchLater`, `removeFromWatchLater`, `toggleWatchLater`, `getNextWatchLaterVideo` |
| [utils/viewingStatus.js](src/utils/viewingStatus.js) | 視聴状況（再生率＋手動override） | `getVideoViewingStatus`, `get/setWatchedOverride`, `getCategoryProgress`, `findFirstUnfinishedVideo` |
| [utils/breadcrumbs.js](src/utils/breadcrumbs.js) | パンくずへお気に入りボタン挿入 | `addFavoriteButtonToBreadCrumbs` |
| [utils/thumbnail-progress.js](src/utils/thumbnail-progress.js) | サムネイルに再生進捗バー | `extractContentIdFromThumbnail` |
| [utils/study-time.js](src/utils/study-time.js) | 学習時間トラッキング（日別・科目別に積算） | `startStudyTimeTracking`, `getStudyTimeByDate`, `getStudyTimeTotalsByDate`, `getStudyTimeByCategory` |
| [utils/goToLoginPage.js](src/utils/goToLoginPage.js) | ホームでの自動ログイン遷移 | `handleHomePageAutoLogin`, `tryPushLoginButton` |
| [utils/login-state.js](src/utils/login-state.js) | ログイン状態(ゲスト/CASログイン済み)の変化を監視し、切替時に授業一覧(cachedCategoriesData)＋視聴進捗(videoViewingStatus_*)キャッシュを破棄。状態は `sessionStorage["ClasstreamIsCasLogin_1"]` で判定（`ClasstreamIsGuest_1` はサイト側バグで不可） | `getOujLoginState`, `clearOujUserScopedCaches`, `syncOujLoginStateAndInvalidate`, `startOujLoginStateWatcher` |
| [utils/dark-mode.js](src/utils/dark-mode.js) | ダークモード制御（`document_start`で別途ロード。ポップアップからも利用） | `isOujDarkModeActive`, `get/cycleOujDarkModeSetting`, `OUJ_DARK_MODE_LABELS` |

## menu/ — 左メニューと各パネル

| ファイル | 役割 | 主な公開IF（window.*） |
|---|---|---|
| [menu/menu.js](src/menu/menu.js) | メニュー本体。左メニュー挿入・`MENU_CONFIG`・開閉監視 | `insertLeftMenu`, `startMenuOpeningMutationObserver`, `getIconHtml` |
| [menu/menu-native-shell.js](src/menu/menu-native-shell.js) | **各パネル共通のネイティブ風右ペイン基盤**（お気に入り/履歴/おすすめ等が共用） | `openNativeOverlay`, `removeNativeOverlay`, `renderNativeShellHtml`, `buildNative*Html` 系多数 |
| [menu/menu-favorites.js](src/menu/menu-favorites.js) | お気に入りパネル（手動並び替え・「▶続き」・視聴回数バッジ） | `handleFavoritesPanelOpen`, `createFavoriteListData` |
| [menu/menu-watch-later.js](src/menu/menu-watch-later.js) | あとで見るパネル | `handleWatchLaterPanelOpen` |
| [menu/menu-bookmarks.js](src/menu/menu-bookmarks.js) | しおり一覧パネル（位置＋メモへジャンプ） | `handleBookmarksPanelOpen` |
| [menu/menu-history.js](src/menu/menu-history.js) | 視聴履歴パネル | `handleHistoryPanelOpen` |
| [menu/menu-recommendation.js](src/menu/menu-recommendation.js) | おすすめ**生成アルゴリズム**（履歴/お気に入り/類似度） | `createRecommendListData`, `prefetchRecommendListData`, `oujRecommendCache` |
| [menu/menu-recommendation-panel.js](src/menu/menu-recommendation-panel.js) | おすすめ**表示**（HTML生成） | `handleRecommendPanelOpen` |
| [menu/menu-study-time.js](src/menu/menu-study-time.js) | 学習時間パネル（7/30/90日・ストリーク・科目別内訳） | `handleStudyTimePanelOpen` |
| [menu/menu-whats-new.js](src/menu/menu-whats-new.js) | お知らせ/変更点（NEWバッジ）。**★リリース時は `OUJ_CHANGELOG_ENTRIES` 先頭に追記** | `handleWhatsNewPanelOpen`, `updateWhatsNewBadge` |
| [menu/menu-header-darkmode.js](src/menu/menu-header-darkmode.js) | ヘッダーのテーマ切替ボタン | `insertHeaderDarkModeToggle` |
| [menu/menu-header-collapse.js](src/menu/menu-header-collapse.js) | ヘッダー行の折りたたみ | `insertHeaderCollapseToggle` |

## page-video/ — 動画再生ページ（player）

| ファイル | 役割 | 主な公開IF（window.*） |
|---|---|---|
| [page-video/video-player-core.js](src/page-video/video-player-core.js) | **再生ページ初期化の中心**。次動画の決定と共有状態管理 | `initializeVideoPlayer`, `fetchNextVideoId`, `fetchNextVideoFrom{SameCourse,Favorites}`, `getCurrent/NextVideoId`, 共有: `nextVideoId`/`videoListInCourse`/`currentVideoIndexInCourse` |
| [page-video/video-playback-management.js](src/page-video/video-playback-management.js) | 再生管理・再生位置保存(playlog)・速度・次へスキップ | `StartPlaybackManagement`, `setPlaybackSpeed`, `skipToNextVideo` |
| [page-video/video-player-actions.js](src/page-video/video-player-actions.js) | タイトル横ボタン（PiP/しおり/あとで見る）・しおりデータ・pendingSeek | `addPlayerActionButtons`, `getBookmarks`, `removeBookmark`, `formatBookmarkTime`, `applyPendingSeekIfAny`, `setPendingSeek` |
| [page-video/video-settings.js](src/page-video/video-settings.js) | 動画下部の設定パネル（トークン方式で二重挿入を防ぐ） | `addVideoSettingsPanel` |
| [page-video/video-prev-next.js](src/page-video/video-prev-next.js) | 前後の回へのリンク | `insertPrevNextLinks` |
| [page-video/video-episode-list.js](src/page-video/video-episode-list.js) | 同一科目の回一覧ジャンプメニュー | `insertEpisodeListMenu` |
| [page-video/video-radio-detection.js](src/page-video/video-radio-detection.js) | ラジオ判定・字幕有無判定（videoWidth/Heightで判定） | `checkIfRadioProgram`, `isRadioProgram`, `isCaptionAvailable`, `getVideoSrcInfo`, `showRadioProgramUI` |
| [page-video/video-ending.js](src/page-video/video-ending.js) | 動画終了監視・次へのカウントダウン表示 | `startVideoEndMonitoring`, `startNextVideoCountdown`, `isNextVideoCountdown{Active,Cancelled}` |
| [page-video/video-media-session.js](src/page-video/video-media-session.js) | Media Session API（メディアキー/ロック画面操作） | `startMediaSession` |
| [page-video/video-ab-repeat.js](src/page-video/video-ab-repeat.js) | A-B区間リピート（語学練習用、保存しない） | `insertAbRepeatControls`, `clearABRepeat` |
| [page-video/video-sleep-timer.js](src/page-video/video-sleep-timer.js) | スリープタイマー（分指定/この回の終わりまで） | `armSleepTimer`, `armSleepTimerEndOfEpisode`, `clearSleepTimer`, `getSleepTimerRemainingMinutes` 他 |
| [page-video/video-wake-lock.js](src/page-video/video-wake-lock.js) | 画面ロック防止（Screen Wake Lock） | `startWakeLockManagement`, `releaseVideoWakeLock` |
| [page-video/video-volume-normalization.js](src/page-video/video-volume-normalization.js) | 音量正規化（Web Audio コンプレッサ） | `startVolumeNormalizationManagement`, `applyVolumeNormalizationSetting` |
| [page-video/video-show-subtitle.js](src/page-video/video-show-subtitle.js) | 字幕のオンオフ | `toggleCaptionTv`, `showCaptionAccordingToSetting` |
| [page-video/video-subtitle-size.js](src/page-video/video-subtitle-size.js) ＋ [.css](src/page-video/video-subtitle-size.css) | 字幕を動画外に出して動画縮小を防ぐ | `applyCaptionShrinkFix` |

## page-*.js — その他の各ページ

| ファイル | 役割 | 主な公開IF（window.*） |
|---|---|---|
| [page-login.js](src/page-login.js) | ログインページの自動処理 | `waitForPasswordAndLogin`, `clearCachedCategoriesData` |
| [page-home-continue.js](src/page-home-continue.js) | ホームの「続きから見る」パネル | `insertHomeContinuePanel` |
| [page-course-select.js](src/page-course-select.js) | 科目一覧(series-select)のお気に入りボタン | `waitThenAddFavBtnToCategoryList` |
| [page-course-select-progress.js](src/page-course-select-progress.js) | 科目一覧の視聴進捗バッジ・「▶続き」（遅延計算） | `waitThenAddProgressBadgesToCategoryList` |
| [page-course-select-filters.js](src/page-course-select-filters.js) | 科目一覧(series-select)の絞り込み（媒体/字幕は行の表示テキストから即判定、未完了/視聴途中は`getCategoryProgress`で必要時のみ遅延判定、年度は科目名末尾の（'YY）から即判定）。検索と同じ設定キーを共有。検索ボックスパネルから`window.__oujPendingCourseYear`で年度初期値を受け取る | `initializeCourseListFilters`, `refreshCourseListFilterUI` |
| [page-video-select.js](src/page-video-select.js) | 回の一覧(video-select)へ「あとで見る」トグル | `addWatchLaterButtonsToVideoList` |
| [page-search-result.js](src/page-search-result.js) | 検索結果の重複講義を非表示 | `startSearchResultDedupObserver`, `updateSearchResultItemVisibility` |
| [page-search-result-filters.js](src/page-search-result-filters.js) | 検索結果の絞り込み/並び替え。回一覧(video-select)でも`context`引数で流用（視聴状況フィルタ＋並び替えのみ／媒体・字幕・年度・科目・最近の検索は出さない） | `initializeSearchResultFilters(context)`, `refreshSearchResultFilterUI`, `buildOujFilterChip`, `OUJ_SEARCH_*_KEY` |
| [search-box-filter-panel.js](src/search-box-filter-panel.js) | 検索ボックスのクイック絞り込みパネル（全ページ共通）。「最近の検索」／「年度・コースで探す（コースを選ぶとそのコースへ遷移、年度も選べば遷移先を年度絞り込み）」／絞り込みプリセット | `initSearchBoxFilterPanel` |

## popup/ — ポップアップ兼オプションページ

- [popup/popup.html](src/popup/popup.html) / [popup.css](src/popup/popup.css) / [popup.js](src/popup/popup.js) … 放送大学ページを開くボタン、自動ログインON/OFF、テーマ切替。
- [popup/licenses.js](src/popup/licenses.js) … ライセンス表示。

## CSS（content_scriptで注入）

- [utils/dark-mode.css](src/utils/dark-mode.css) … `html.ouj-dark-mode` のinvertフィルタ（`document_start`）。
- [thumbnail-progress.css](src/thumbnail-progress.css) … サムネイル進捗バー。
- [page-video/video-subtitle-size.css](src/page-video/video-subtitle-size.css) … 字幕レイアウト。

## tests/ — Playwright視覚回帰テスト

- 設定: [playwright.config.js](playwright.config.js)。`workers:1`（実サイト負荷回避）。desktop/mobileの2ビューポート。
- `popup.spec.js` はログイン不要の専用プロジェクト。`subtitle-layout.spec.js` はDRM検証用にEdge(`drm-*`)で分離。
- 共通: [tests/visual/fixtures.js](tests/visual/fixtures.js)（ログイン処理）, [helpers.js](tests/visual/helpers.js), [auth.js](tests/visual/auth.js)。
- 実行: `npm run test:visual` / `test:visual:update`（スナップショット更新）/ `test:drm`。認証情報は `.env`（[.env.example](.env.example) 参照）。

## content.js のページ別起動フロー（要約）

```
sso（ログイン画面） → waitForPasswordAndLogin → 成功ならhomeへ
v.* 共通           → startOujLoginStateWatcher(ログイン/ログアウト検知で授業一覧キャッシュ破棄)
                    ／ insertLeftMenu / ヘッダー2ボタン / メニュー監視 / initSearchBoxFilterPanel
                    ＋ SPA遷移対策: 前ページのフィルターバー(search-result-filter-bar / course-list-filter-bar)を除去
  home            → insertHomeContinuePanel + handleHomePageAutoLogin
  search-result   → startSearchResultDedupObserver + initializeSearchResultFilters
  player          → addFavoriteButtonToBreadCrumbs + initializeVideoPlayer
  series-select   → waitThenAddFavBtnToCategoryList + waitThenAddProgressBadgesToCategoryList + initializeCourseListFilters
  video-select    → addFavoriteButtonToBreadCrumbs + addWatchLaterButtonsToVideoList + initializeSearchResultFilters('video-select')
```

## バージョン運用メモ

- `manifest.json` の `version` はストア公開直前にのみ上げる。README変更点の記載とは別タイミング。
- リリース時は [menu/menu-whats-new.js](src/menu/menu-whats-new.js) の `OUJ_CHANGELOG_ENTRIES` 先頭にも追記する。
