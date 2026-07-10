// 学習時間パネル（menu.jsから分離）
// study-time.jsが記録した日別学習時間(秒)を直近7日間の棒グラフで表示する。
// 見た目の共通基盤はmenu-native-shell.jsを利用する。

const STUDY_TIME_CHART_DAYS = 7;
const STUDY_TIME_WEEK_DAYS = 7;

function formatStudyMinutes(totalSeconds) {
  return Math.round(totalSeconds / 60);
}

// 今日を含む直近n日分の日付キー("YYYY-MM-DD")を古い順に返す
function getLastNDateKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, date: d });
  }
  return keys;
}

// startDaysAgo日前からendDaysAgoExclusive日前(を含まない)までの合計秒数
function sumStudyTimeRange(dataByDate, startDaysAgo, endDaysAgoExclusive) {
  let total = 0;
  const now = new Date();
  for (let i = startDaysAgo; i < endDaysAgoExclusive; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    total += dataByDate[key] || 0;
  }
  return total;
}

function buildStudyTimeChartHtml(dataByDate) {
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
  const entries = getLastNDateKeys(STUDY_TIME_CHART_DAYS);
  const values = entries.map(({ key }) => dataByDate[key] || 0);
  const maxValue = Math.max(...values, 60); // 全て0分でも棒が潰れないよう最低1分相当を確保

  const bars = entries.map(({ key, date }, i) => {
    const seconds = values[i];
    const heightPercent = seconds > 0 ? Math.max(Math.round((seconds / maxValue) * 100), 4) : 0;
    const isToday = i === entries.length - 1;
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;min-width:0;">
        <div style="font-size:11px;color:#666;margin-bottom:4px;white-space:nowrap;">${formatStudyMinutes(seconds)}分</div>
        <div style="width:100%;max-width:32px;height:120px;display:flex;align-items:flex-end;">
          <div style="width:100%;height:${heightPercent}%;background:${isToday ? '#1976d2' : '#90caf9'};border-radius:4px 4px 0 0;"></div>
        </div>
        <div style="font-size:12px;color:${isToday ? '#1976d2' : '#666'};font-weight:${isToday ? 'bold' : 'normal'};margin-top:4px;">${dayLabels[date.getDay()]}</div>
      </div>
    `;
  }).join('');

  return `<div style="display:flex;gap:8px;padding:16px 20px;align-items:flex-end;">${bars}</div>`;
}

function buildStudyTimeSummaryHtml(dataByDate) {
  const thisWeek = sumStudyTimeRange(dataByDate, 0, STUDY_TIME_WEEK_DAYS);
  const lastWeek = sumStudyTimeRange(dataByDate, STUDY_TIME_WEEK_DAYS, STUDY_TIME_WEEK_DAYS * 2);
  const diff = thisWeek - lastWeek;
  let diffText = '先週と同じ';
  let diffColor = '#666';
  if (diff > 0) {
    diffText = `先週より${formatStudyMinutes(diff)}分多い`;
    diffColor = '#2e7d32';
  } else if (diff < 0) {
    diffText = `先週より${formatStudyMinutes(Math.abs(diff))}分少ない`;
    diffColor = '#c62828';
  }
  return `
    <div style="padding:20px 20px 0 20px;">
      <div style="font-size:22px;font-weight:bold;color:#1565c0;">今週の学習時間: ${formatStudyMinutes(thisWeek)}分</div>
      <div style="font-size:13px;color:${diffColor};margin-top:4px;">${diffText}（先週: ${formatStudyMinutes(lastWeek)}分）</div>
    </div>
  `;
}

function handleStudyTimePanelOpen() {
  window.openNativeOverlay((overlay) => {
    const dataByDate = window.getStudyTimeByDate ? window.getStudyTimeByDate() : {};
    overlay.innerHTML = window.renderNativeShellHtml({
      breadcrumbHtml: window.buildNativeBreadcrumbHtml([{ text: '学習時間' }]),
      mainHtml: `
        ${buildStudyTimeSummaryHtml(dataByDate)}
        ${buildStudyTimeChartHtml(dataByDate)}
        <div style="padding:0 20px 20px 20px;font-size:12px;color:#999;">
          ※この拡張機能で動画を再生した時間のみを記録しています（この機能を追加する前の視聴時間は含まれません）
        </div>
      `
    });
  });
}

// グローバルwindowに関数を公開
window.handleStudyTimePanelOpen = handleStudyTimePanelOpen;
