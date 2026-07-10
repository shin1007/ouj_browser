// 科目一覧ページ(series-select)に、科目ごとの視聴進捗バッジ（例:「5/15回視聴済み」）を表示する機能
//
// コース内の全動画・一覧内の全科目に対して一括で視聴状況を取得すると放送大学サーバーへの
// 負荷が大きくなるため、IntersectionObserverで画面内に入った科目フォルダだけを対象に、
// 同時実行数を制限しながら遅延計算する。既存のお気に入りボタン機能(page-course-select.js)
// とは意図的に別ファイル・別関数に分離し、どちらかで例外が起きても他方に影響しないようにする。

function removeCourseProgressBadges() {
  document.querySelectorAll('.course-progress-badge').forEach((badge) => badge.remove());
}

function createCourseProgressBadgePlaceholder(categoryId) {
  const badge = document.createElement('span');
  badge.className = 'course-progress-badge';
  badge.dataset.categoryId = categoryId;
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    margin-left: 8px;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 12px;
    color: #666;
    background: #eee;
    white-space: nowrap;
  `;
  return badge;
}

async function classifyCourseProgress(categoryId, badge, gate) {
  try {
    // 科目一覧の取得も含め、この科目に関する全リクエストをページ共有ゲート経由にする
    const videoList = await gate.run(() => window.getVideoListInCategory(categoryId));
    if (!Array.isArray(videoList) || videoList.length === 0) {
      badge.remove();
      return;
    }
    // 動画ごとのリクエストも同じゲートを通す。IntersectionObserverが同時に
    // 多数の科目フォルダを検知しても、ページ全体での同時リクエスト数はgateの
    // 上限を超えない(科目ごとに個別の並列数を持たせると合計が際限なく増えるため)
    const statuses = await Promise.all(
      videoList.map((video) => gate.run(() => window.getVideoViewingStatus(video.contentId)))
    );
    const finishedCount = statuses.filter((s) => s && s.isFinished).length;
    // getVideoListInCategoryはlimit=30で打ち切られるため、ちょうど30件の場合は
    // 実際にはもっと話数がある可能性を示す「+」を付ける
    const suffix = videoList.length === 30 ? '+' : '';
    badge.textContent = `${finishedCount}/${videoList.length}回視聴済み${suffix}`;
    if (finishedCount >= videoList.length) {
      badge.style.background = '#dcedc8';
      badge.style.color = '#33691e';
    } else if (finishedCount > 0) {
      badge.style.background = '#e3f2fd';
      badge.style.color = '#1565c0';
    }
  } catch (error) {
    badge.remove();
  }
}

function startCourseProgressObserver() {
  // SPA遷移で#main配下がまるごと差し替わるため、古い監視インスタンス/ゲートを都度作り直す
  if (window.__oujCourseProgressObserver) {
    window.__oujCourseProgressObserver.disconnect();
  }
  // ページ内の全科目で共有する同時実行数ゲート。IntersectionObserverは初回表示時に
  // 画面内の科目フォルダをまとめて検知するため、科目ごとに個別の並列数を持たせると
  // 合計の同時リクエスト数が際限なく増えてしまう。1つのゲートを全科目で共有することで、
  // ページ全体での同時リクエスト数を確実に抑える
  const gate = window.createConcurrencyGate(4);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const badge = entry.target;
        // 二重ガード: 一度処理を開始したバッジは再度処理しない
        if (badge.dataset.oujStatus) return;
        badge.dataset.oujStatus = 'pending';
        observer.unobserve(badge);
        classifyCourseProgress(badge.dataset.categoryId, badge, gate);
      });
    },
    { root: null, rootMargin: '100px 0px', threshold: 0 }
  );
  window.__oujCourseProgressObserver = observer;
  return observer;
}

async function addProgressBadgesToCategoryList() {
  removeCourseProgressBadges();

  const ca = window.getCurrentCategoryId();
  if (!ca) return;
  const childCategories = await window.getChildIds(ca);
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  const minLength = Math.min(childCategories.length, items.length);
  if (minLength === 0) return;

  const observer = startCourseProgressObserver();
  for (let i = 0; i < minLength; i++) {
    const item = items[i];
    const category = childCategories[i];
    const badge = createCourseProgressBadgePlaceholder(category.categoryId);
    item.parentNode.appendChild(badge);
    observer.observe(badge);
  }
}

async function waitThenAddProgressBadgesToCategoryList() {
  if (typeof window.getChildIds !== 'function' || typeof window.getCategoriesData !== 'function') {
    setTimeout(waitThenAddProgressBadgesToCategoryList, 100);
    return;
  }
  const ca = window.getCurrentCategoryId();
  if (!ca) return;
  // 子カテゴリがさらにフォルダ(summaryなし)の場合は科目一覧ではないため何もしない
  // （page-course-select.jsのwaitThenAddFavBtnToCategoryListと同じ判定基準）
  const categories = await window.getCategoriesData();
  const childCategories = await window.getChildIds(ca);
  const hasSummaryInChildren = childCategories.some((child) => {
    const cat = categories.find((c) => c.categoryId === child.categoryId);
    return cat && cat.summary;
  });
  if (!hasSummaryInChildren) return;

  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  if (!items.length) {
    setTimeout(waitThenAddProgressBadgesToCategoryList, 100);
    return;
  }
  await addProgressBadgesToCategoryList();
}

window.waitThenAddProgressBadgesToCategoryList = waitThenAddProgressBadgesToCategoryList;
