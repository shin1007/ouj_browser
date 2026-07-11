// 「お知らせ」パネルと更新通知バッジ
// 拡張機能が更新されたとき（manifestのversionが変わったとき）、メニューの
// 「お知らせ」項目にNEWバッジを表示し、開くと新機能の一覧を確認できる。
// 一度開いたらそのバージョンは既読として記録し、バッジを消す。
//
// ★リリース時: 下のOUJ_CHANGELOG_ENTRIESの先頭に新しいバージョンの項目を追加すること

const LAST_SEEN_VERSION_KEY = 'lastSeenVersion';

// 表示する変更点（新しい順）。内容はREADMEの変更点の要約
const OUJ_CHANGELOG_ENTRIES = [
  {
    version: '今回の更新',
    items: [
      '動画終了時に「次の動画」のタイトルとカウントダウンを表示（キャンセル可能）',
      'メディアキー・スマホのロック画面から再生/停止・前後の回への移動が可能に（Media Session対応）',
      '動画ページに「小窓（ピクチャーインピクチャー）」「しおり」「あとで見る」ボタンを追加',
      'しおり: 再生位置にメモ付きのしおりを挟んで、メニューから一覧・ジャンプ',
      'あとで見る: 動画単位のリスト。リスト順の連続再生モードも追加',
      '再生速度・冒頭/末尾スキップ秒数を科目ごとに記憶するように変更',
      '動画タイトル横に「実質残り時間」（倍速換算）を表示',
      'A-B区間リピート（語学の聞き取り練習用）を追加',
      'スリープタイマーに「この回の終わりまで」を追加',
      '回一覧に視聴済みマーク（クリックで手動切替）と「あとで見る」ボタンを追加',
      '検索結果にテレビ/ラジオ・字幕・視聴状況のバッジを常時表示',
      '検索結果に「未完了のみ」「視聴途中のみ」フィルタ、年度・科目での絞り込み、「最近の検索」チップを追加',
      'ホーム画面に「続きから見る」パネルを追加',
      'お気に入りに「▶続き」ボタン（最初の未視聴回へ直行）と手動並び替えを追加',
      '科目一覧の進捗バッジに修了ペース予測（ツールチップ）と「▶続き」ボタンを追加',
      '学習時間: 期間切替（7/30/90日）・連続学習日数・1日の目標・科目別内訳を追加',
      '再生位置の保存を改善（動画が一瞬止まらない方式を優先し、失敗時のみ従来方式）',
    ],
  },
  {
    version: '2026.7.10',
    items: [
      '動画ページに「回一覧」を追加',
      '科目一覧に視聴進捗を表示',
      '検索結果の絞り込みチップ・並び替えを追加',
      'メニューに「学習時間」を追加',
      'ラジオ番組・字幕判定の不具合を修正',
    ],
  },
];

function getExtensionVersion() {
  try {
    return chrome.runtime.getManifest().version;
  } catch (e) {
    return '';
  }
}

// 未読の更新があるかどうか
function hasUnseenUpdate() {
  const version = getExtensionVersion();
  if (!version) return false;
  const lastSeen = window.getSetting(LAST_SEEN_VERSION_KEY, null);
  // 初回インストール直後（lastSeen未設定）はバッジを出さず、現在のバージョンを既読にする
  if (lastSeen === null) {
    window.saveSetting(LAST_SEEN_VERSION_KEY, version);
    return false;
  }
  return lastSeen !== version;
}

// メニューの「お知らせ」項目にNEWバッジを付ける/消す
function updateWhatsNewBadge(menuItemEl) {
  if (!menuItemEl) return;
  const existing = menuItemEl.querySelector('.ouj-whats-new-badge');
  if (hasUnseenUpdate()) {
    if (existing) return;
    const textArea = menuItemEl.querySelector('.text-area');
    if (!textArea) return;
    const badge = document.createElement('span');
    badge.className = 'ouj-whats-new-badge';
    badge.textContent = 'NEW';
    badge.style.cssText = 'display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;background:#e53935;color:#fff;font-size:10px;font-weight:bold;vertical-align:middle;';
    textArea.appendChild(badge);
  } else if (existing) {
    existing.remove();
  }
}

function handleWhatsNewPanelOpen() {
  // 開いた時点で現在のバージョンを既読として記録する
  const version = getExtensionVersion();
  if (version) {
    window.saveSetting(LAST_SEEN_VERSION_KEY, version);
  }
  // 全メニュー（左メニュー・ポップオーバー）のバッジを消す
  document.querySelectorAll('.ouj-whats-new-badge').forEach((badge) => badge.remove());

  window.openNativeOverlay((overlay) => {
    const sectionsHtml = OUJ_CHANGELOG_ENTRIES.map((entry) => `
      <div style="padding:0 20px 8px 20px;">
        <div style="font-size:15px;font-weight:bold;color:#1565c0;margin:16px 0 8px 0;">${entry.version}</div>
        <ul style="margin:0;padding-left:20px;">
          ${entry.items.map((item) => `<li style="font-size:13px;color:#374151;line-height:1.8;">${item}</li>`).join('')}
        </ul>
      </div>
    `).join('');
    overlay.innerHTML = window.renderNativeShellHtml({
      breadcrumbHtml: window.buildNativeBreadcrumbHtml([{ text: 'お知らせ' }]),
      mainHtml: `
        <div style="text-align:left;">
          ${sectionsHtml}
          <div style="padding:12px 20px 20px 20px;font-size:12px;color:#999;">
            バージョン: ${getExtensionVersion() || '不明'} ／ 不具合の報告・要望は
            <a href="https://github.com/shin1007/ouj_browser" target="_blank" rel="noopener" style="color:#1976d2;">GitHub</a>
            へお寄せください
          </div>
        </div>
      `
    });
  });
}

// グローバルwindowに関数を公開
window.handleWhatsNewPanelOpen = handleWhatsNewPanelOpen;
window.updateWhatsNewBadge = updateWhatsNewBadge;
