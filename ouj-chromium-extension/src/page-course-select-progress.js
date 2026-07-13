// 科目一覧ページ(series-select)に、科目ごとの視聴進捗バッジ（例:「5/15回視聴済み」）を表示する機能
//
// コース内の全動画・一覧内の全科目に対して一括で視聴状況を取得すると放送大学サーバーへの
// 負荷が大きくなるため、IntersectionObserverで画面内に入った科目フォルダだけを対象に、
// 同時実行数を制限しながら遅延計算する。既存のお気に入りボタン機能(page-course-select.js)
// とは意図的に別ファイル・別関数に分離し、どちらかで例外が起きても他方に影響しないようにする。

function removeCourseProgressBadges() {
  document.querySelectorAll('.course-progress-badge').forEach((badge) => badge.remove());
  // バッジとセットで挿入した「▶続き」ボタンも一緒に消す（SPA遷移での再構築対策）
  document.querySelectorAll('.course-continue-btn').forEach((btn) => btn.remove());
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

// 直近2週間の視聴ペース（履歴ベース）から修了までの目安を計算する。
// 履歴にこの科目の動画がなければnullを返す（表示しない）
function estimateCompletionPace(videoList, finishedCount) {
  const remaining = videoList.length - finishedCount;
  if (remaining <= 0) return null;
  const history = window.getSetting('history', []);
  if (!Array.isArray(history) || history.length === 0) return null;
  const idsInCourse = new Set(videoList.map((v) => String(v.contentId)));
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentCount = history.filter((h) =>
    idsInCourse.has(String(h.contentId)) && h.date && new Date(h.date).getTime() >= twoWeeksAgo
  ).length;
  if (recentCount === 0) return null;
  const perWeek = recentCount / 2;
  const weeks = Math.ceil(remaining / perWeek);
  return { remaining, perWeek: Math.round(perWeek * 10) / 10, weeks };
}

async function classifyCourseProgress(categoryId, badge, gate) {
  try {
    // 科目一覧の取得・各動画の視聴状況取得は、この科目に関する全リクエストを
    // ページ共有ゲート経由にする。IntersectionObserverが同時に多数の科目フォルダを
    // 検知しても、ページ全体での同時リクエスト数はgateの上限を超えない(科目ごとに
    // 個別の並列数を持たせると合計が際限なく増えるため)
    const progress = await window.getCategoryProgress(categoryId, gate);
    if (!progress) {
      badge.remove();
      return;
    }
    const { finishedCount, statuses, videoList, suffix } = progress;
    badge.textContent = `${finishedCount}/${videoList.length}回視聴済み${suffix}`;
    if (finishedCount >= videoList.length) {
      badge.style.background = '#dcedc8';
      badge.style.color = '#33691e';
    } else if (finishedCount > 0) {
      badge.style.background = '#e3f2fd';
      badge.style.color = '#1565c0';
    }

    // 修了ペース予測（直近2週間の視聴履歴があるときだけツールチップで表示）
    const pace = estimateCompletionPace(videoList, finishedCount);
    if (pace) {
      badge.title = `あと${pace.remaining}回。直近2週間の視聴ペース（週${pace.perWeek}回）が続けば約${pace.weeks}週間で見終わります`;
    }

    // 「▶続き」ボタン: 最初の未視聴回へ直行する（未視聴回がある場合のみ）
    if (finishedCount < videoList.length && !badge.parentNode.querySelector('.course-continue-btn')) {
      const firstUnfinishedIndex = statuses.findIndex((s) => !s || !s.isFinished);
      const target = firstUnfinishedIndex >= 0 ? videoList[firstUnfinishedIndex] : null;
      if (target) {
        const contBtn = document.createElement('span');
        contBtn.className = 'course-continue-btn';
        contBtn.setAttribute('role', 'button');
        contBtn.setAttribute('tabindex', '0');
        contBtn.title = `続きから再生: ${target.title || ''}`;
        contBtn.textContent = '▶ 続き';
        contBtn.style.cssText = `
          display: inline-flex;
          align-items: center;
          margin-left: 6px;
          padding: 2px 10px;
          border: 1px solid #1976d2;
          border-radius: 12px;
          font-size: 12px;
          color: #1976d2;
          background: transparent;
          cursor: pointer;
          white-space: nowrap;
        `;
        const onContinue = (event) => {
          event.stopPropagation();
          event.preventDefault();
          window.location.href = `https://v.ouj.ac.jp/view/ouj/#/navi/player?co=${target.contentId}&ct=V&ca=${categoryId}`;
        };
        contBtn.addEventListener('click', onContinue);
        contBtn.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onContinue(event);
          }
        });
        badge.parentNode.insertBefore(contBtn, badge.nextSibling);
      }
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
  // getChildIdsのawait中に別の科目一覧ページへ遷移すると、childCategories(古いページの
  // カテゴリ)とitems(新しいページのDOM)がインデックスでずれ、進捗バッジが別科目に
  // 誤って紐付いてしまう。取得開始時点のURLと変わっていたら描画をやめる
  const startUrl = window.location.href;
  const childCategories = await window.getChildIds(ca);
  if (window.location.href !== startUrl) return;
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
