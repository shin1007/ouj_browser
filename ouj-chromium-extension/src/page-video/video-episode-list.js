// --- 回一覧ジャンプメニュー ---
// 前後動画リンク(video-prev-next.js)だけでは、試験前の見直しなどで特定の回に
// 直接飛びたいときに一度コース一覧まで戻る必要があるため、同じ科目内の全話を
// 折りたたみ一覧で表示し、クリックで直接ジャンプできるようにする。
async function insertEpisodeListMenu(titleElement) {
  const categoryId = window.getCurrentCategoryId();
  // insertPrevNextLinksと同じキャッシュキーを叩くため、直後に呼んでも追加のネットワークリクエストは発生しない
  const list = await window.getVideoListInCategory(categoryId);
  const currentVideoId = window.getCurrentVideoId();

  // 既存のメニューがあれば一度消す(SPA遷移での再構築対策)
  const old = document.getElementById('episode-list-menu');
  if (old) old.remove();

  if (!Array.isArray(list) || list.length < 2) {
    return;
  }

  const details = document.createElement('details');
  details.id = 'episode-list-menu';
  details.style.cssText = `
    margin: 16px 0;
    padding: 0;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
  `;

  const summary = document.createElement('summary');
  summary.style.cssText = `
    padding: 12px 16px;
    cursor: pointer;
    font-weight: 600;
    color: #1565c0;
  `;
  summary.textContent = `回一覧（${list.length}件）`;
  details.appendChild(summary);

  const listContainer = document.createElement('div');
  listContainer.style.cssText = `
    max-height: 400px;
    overflow-y: auto;
    border-top: 1px solid #ddd;
  `;

  list.forEach((item) => {
    const isCurrent = String(item.contentId) === String(currentVideoId);

    const link = document.createElement('a');
    link.href = window.location.href.replace(/co=\d+/, 'co=' + item.contentId);
    if (isCurrent) {
      link.setAttribute('aria-current', 'true');
    }
    link.style.cssText = `
      display: block;
      padding: 10px 16px;
      color: ${isCurrent ? '#fff' : '#333'};
      background: ${isCurrent ? '#1976d2' : '#fff'};
      text-decoration: none;
      border-bottom: 1px solid #eee;
      font-size: 14px;
      line-height: 1.4;
    `;
    link.textContent = item.title || String(item.contentId);
    link.onclick = function (e) {
      e.preventDefault();
      window.location.href = this.href;
    };
    if (!isCurrent) {
      link.onmouseenter = () => { link.style.background = '#e3f2fd'; };
      link.onmouseleave = () => { link.style.background = '#fff'; };
    }
    listContainer.appendChild(link);
  });

  details.appendChild(listContainer);

  // titleElementの直後、既にprev-next-linksがあればその後ろに挿入
  const insertAfter = (titleElement.nextSibling && titleElement.nextSibling.id === 'prev-next-links')
    ? titleElement.nextSibling
    : titleElement;
  if (insertAfter.nextSibling) {
    insertAfter.parentNode.insertBefore(details, insertAfter.nextSibling);
  } else {
    insertAfter.parentNode.appendChild(details);
  }
}

// グローバル関数として公開
window.insertEpisodeListMenu = insertEpisodeListMenu;
