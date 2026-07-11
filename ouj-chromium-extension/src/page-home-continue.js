// ホーム画面の「続きから見る」パネル
// 視聴履歴のうち「途中まで見た」動画を最大4件、ホーム画面の最上部にカード表示する。
// ホームを開いてワンクリックで学習を再開できるようにするのが目的。

const HOME_CONTINUE_PANEL_ID = 'ouj-home-continue-panel';
const HOME_CONTINUE_MAX_CARDS = 4;
const HOME_CONTINUE_SCAN_LIMIT = 12; // 履歴の先頭から何件までを調べるか

// 履歴から「視聴途中」の動画を集める
async function collectContinueWatchingItems() {
  const history = window.getSetting('history', []);
  if (!Array.isArray(history) || history.length === 0) return [];
  const gate = window.createConcurrencyGate(3);
  const targets = history.slice(0, HOME_CONTINUE_SCAN_LIMIT);
  const results = await Promise.all(targets.map(async (entry) => {
    try {
      const status = await gate.run(() => window.getVideoViewingStatus(entry.contentId));
      // 「途中まで見た」ものだけを対象にする（未再生・視聴済みは除く）
      if (status.isFinished || !(status.currentTimeRate > 0.01)) return null;
      const video = await gate.run(() => window.getVideoData(entry.contentId));
      if (!video || !video.title) return null;
      return {
        contentId: entry.contentId,
        categoryId: video.categoryId,
        title: video.title,
        detail: video.detail || '',
        progress: status.currentTimeRate,
        date: entry.date,
      };
    } catch (e) {
      return null;
    }
  }));
  return results.filter(Boolean).slice(0, HOME_CONTINUE_MAX_CARDS);
}

function buildContinueCardHtml(item) {
  const thumb = `https://v.ouj.ac.jp/v1/tenants/1/vod-contents/${item.contentId}/thumbnail/large`;
  const percent = Math.floor(item.progress * 100);
  const courseName = (item.detail.split('\n')[0] || '').replace(/（’\d{2}）$/, '').trim();
  const safeTitle = (item.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeCourse = courseName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
    <div class="ouj-continue-card" role="button" tabindex="0" data-content-id="${item.contentId}" data-category-id="${item.categoryId || ''}" style="
      flex: 1 1 200px;
      max-width: 260px;
      min-width: 170px;
      cursor: pointer;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      transition: box-shadow 0.2s;
    ">
      <div style="position:relative;aspect-ratio:16/9;background:#000;">
        <img src="${thumb}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';">
        <div style="position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,0.4);">
          <div style="height:100%;width:${percent}%;background:#0091d9;"></div>
        </div>
        <div style="position:absolute;right:6px;bottom:8px;background:rgba(0,0,0,0.75);color:#fff;font-size:11px;padding:1px 6px;border-radius:3px;">${percent}%まで視聴</div>
      </div>
      <div style="padding:8px 10px;">
        <div style="font-size:13px;font-weight:bold;color:#333;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${safeTitle}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeCourse}</div>
      </div>
    </div>
  `;
}

async function insertHomeContinuePanel() {
  if (typeof window.waitForElement !== 'function') return;
  const items = await collectContinueWatchingItems();
  if (items.length === 0) return;

  window.waitForElement('#home-main-content .scroll-content', (scrollContent) => {
    // SPA遷移対策: 既にパネルがあれば作り直す
    const old = document.getElementById(HOME_CONTINUE_PANEL_ID);
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = HOME_CONTINUE_PANEL_ID;
    panel.style.cssText = 'padding: 12px 16px 4px 16px;';
    panel.innerHTML = `
      <div style="font-size:15px;font-weight:bold;color:#1565c0;margin-bottom:8px;">▶ 続きから見る</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${items.map(buildContinueCardHtml).join('')}
      </div>
    `;
    scrollContent.insertBefore(panel, scrollContent.firstChild);

    panel.querySelectorAll('.ouj-continue-card').forEach((card) => {
      const go = () => {
        const contentId = card.dataset.contentId;
        const categoryId = card.dataset.categoryId;
        window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/player?co=${contentId}&ct=V&ca=${categoryId}`;
      };
      card.addEventListener('click', go);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          go();
        }
      });
      card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; });
      card.addEventListener('mouseleave', () => { card.style.boxShadow = 'none'; });
    });
  }, 100, 50); // 最大約5秒待つ（ホームの描画が遅い場合に備える）
}

window.insertHomeContinuePanel = insertHomeContinuePanel;
