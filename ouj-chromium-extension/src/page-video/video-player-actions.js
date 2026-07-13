// 動画タイトル横のアクションボタン群（共有ボタンの隣に並ぶ）
// - PiP: ピクチャーインピクチャーで「ながら視聴」
// - しおり: 現在の再生位置にメモ付きのしおりを挟む（メニューの「しおり」から一覧・ジャンプ）
// - あとで見る: 動画単位の「あとで見る」リストへ追加/削除

const BOOKMARKS_STORAGE_KEY = 'bookmarks';
const BOOKMARKS_MAX_ITEMS = 200;
// しおりからのジャンプ時に「どの動画の何秒に飛ぶか」を受け渡すキー
const PENDING_SEEK_STORAGE_KEY = 'pendingSeek';

function getBookmarks() {
  const list = window.getSetting(BOOKMARKS_STORAGE_KEY, []);
  return Array.isArray(list) ? list : [];
}

function saveBookmark(bookmark) {
  let list = getBookmarks();
  list.unshift(bookmark);
  if (list.length > BOOKMARKS_MAX_ITEMS) list = list.slice(0, BOOKMARKS_MAX_ITEMS);
  window.saveSetting(BOOKMARKS_STORAGE_KEY, list);
}

function removeBookmark(bookmarkId) {
  const list = getBookmarks().filter((item) => item.id !== bookmarkId);
  window.saveSetting(BOOKMARKS_STORAGE_KEY, list);
}

function formatBookmarkTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// タイトル横の小ボタンを共有ボタンと同じ見た目で作る
function createTitleActionButton({ className, title, html }) {
  const button = document.createElement('button');
  button.classList.add(className);
  button.style.marginLeft = '4px';
  button.style.verticalAlign = 'middle';
  button.style.padding = '2px 4px';
  button.style.fontSize = '12px';
  button.style.fontWeight = 'bold';
  button.style.cursor = 'pointer';
  button.style.border = '1px solid #ccc';
  button.style.borderRadius = '3px';
  button.style.backgroundColor = '#f0f0f0';
  button.title = title;
  button.innerHTML = html;
  return button;
}

// PiPボタン
function addPipButton(titleElement) {
  if (!document.pictureInPictureEnabled) return;
  if (titleElement.querySelector('.video-pip-button')) return;
  const button = createTitleActionButton({
    className: 'video-pip-button',
    title: 'ピクチャーインピクチャー（小窓）で再生',
    html: '⧉ 小窓',
  });
  button.addEventListener('click', async () => {
    const video = document.querySelector('video');
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      window.showErrorNotification('小窓表示に失敗しました');
    }
  });
  titleElement.appendChild(button);
}

// しおりボタン
function addBookmarkButton(titleElement, currentVideo) {
  // titleElementはSPA内で動画が切り替わっても(タイトルのテキストだけ更新されて)
  // 同じDOMノードが使い回されることがある。既存ボタンをそのまま残すと、クリック
  // ハンドラが最初に生成した時点のcurrentVideo(古い動画)をクロージャで握ったままに
  // なるため、既存があれば一度取り除いてから最新のcurrentVideoで作り直す
  const existing = titleElement.querySelector('.video-bookmark-button');
  if (existing) existing.remove();
  const button = createTitleActionButton({
    className: 'video-bookmark-button',
    title: '現在の再生位置にしおりを挟む（メニューの「しおり」から一覧できます）',
    html: '🔖 しおり',
  });
  button.addEventListener('click', async () => {
    const video = document.querySelector('video');
    if (!video) {
      window.showWarningNotification('動画が見つかりません');
      return;
    }
    const time = Math.floor(video.currentTime);
    const detailLines = (currentVideo?.detail || '').split('\n');
    const courseName = (detailLines[0] || '').replace(/（’\d{2}）$/, '').trim();
    const note = await window.showPromptDialog(
      `位置: ${formatBookmarkTime(time)} にしおりを挟みます。メモがあれば入力してください（空欄でもOK）。`,
      'しおりを追加',
      { placeholder: '例: 試験に出そうな用語の説明', okText: '追加' }
    );
    if (note === null) return; // キャンセル
    saveBookmark({
      id: `${currentVideo?.contentId || window.getCurrentVideoId()}_${time}_${Date.now()}`,
      contentId: String(currentVideo?.contentId || window.getCurrentVideoId()),
      categoryId: String(currentVideo?.categoryId || window.getCurrentCategoryId() || ''),
      time,
      title: currentVideo?.title || '',
      courseName,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    });
    window.showSuccessNotification(`しおりを追加しました（${formatBookmarkTime(time)}）`);
  });
  titleElement.appendChild(button);
}

// あとで見るトグルボタン
function addWatchLaterButton(titleElement, currentVideo) {
  // 同じDOMノード再利用時に古いcontentIdのクロージャが残らないよう、既存があれば作り直す
  // (理由はaddBookmarkButtonのコメント参照)
  const existing = titleElement.querySelector('.video-watch-later-button');
  if (existing) existing.remove();
  const contentId = String(currentVideo?.contentId || window.getCurrentVideoId());
  const categoryId = String(currentVideo?.categoryId || window.getCurrentCategoryId() || '');
  const button = createTitleActionButton({
    className: 'video-watch-later-button',
    title: '「あとで見る」リストに追加/削除（メニューから一覧できます）',
    html: '',
  });
  const updateLabel = () => {
    const active = window.isInWatchLater(contentId);
    button.innerHTML = active ? '✓ あとで見る' : '⏱ あとで見る';
    button.style.backgroundColor = active ? '#e3f2fd' : '#f0f0f0';
  };
  updateLabel();
  button.addEventListener('click', () => {
    const nowActive = window.toggleWatchLater(contentId, categoryId);
    updateLabel();
    window.showSuccessNotification(nowActive ? '「あとで見る」に追加しました' : '「あとで見る」から削除しました');
  });
  titleElement.appendChild(button);
}

/**
 * タイトル横のアクションボタン群を追加する（video-player-coreから呼ばれる）
 */
function addPlayerActionButtons(currentVideo) {
  const titleElement = document.querySelector('#content-detail-area > div.title');
  if (!titleElement) return;
  addPipButton(titleElement);
  addBookmarkButton(titleElement, currentVideo);
  addWatchLaterButton(titleElement, currentVideo);
}

/**
 * しおり一覧から予約されたシーク（pendingSeek）があれば適用する。
 * しおりパネルはこのキーに{contentId, time}を書いてから動画ページに遷移する。
 */
function applyPendingSeekIfAny() {
  const pending = window.getSetting(PENDING_SEEK_STORAGE_KEY, null);
  if (!pending || !pending.contentId) return;
  const currentId = window.getCurrentVideoId();
  if (String(pending.contentId) !== String(currentId)) return;
  // 古い予約（5分以上前）は無視して破棄する
  if (!pending.setAt || Date.now() - pending.setAt > 5 * 60 * 1000) {
    window.removeSetting(PENDING_SEEK_STORAGE_KEY);
    return;
  }
  window.removeSetting(PENDING_SEEK_STORAGE_KEY);
  window.waitForElement('video', (video) => {
    const seek = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.min(pending.time, Math.max(0, video.duration - 1));
        window.showInfoNotification(`しおりの位置（${formatBookmarkTime(pending.time)}）から再生します`);
      }
    };
    if (video.readyState >= 1 && isFinite(video.duration)) {
      seek();
    } else {
      video.addEventListener('loadedmetadata', seek, { once: true });
    }
  });
}

// グローバル関数として公開
window.getBookmarks = getBookmarks;
window.removeBookmark = removeBookmark;
window.formatBookmarkTime = formatBookmarkTime;
window.addPlayerActionButtons = addPlayerActionButtons;
window.applyPendingSeekIfAny = applyPendingSeekIfAny;
window.setPendingSeek = (contentId, time) => {
  window.saveSetting(PENDING_SEEK_STORAGE_KEY, { contentId: String(contentId), time, setAt: Date.now() });
};
