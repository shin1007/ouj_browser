// 視聴回数バッジ（例:「5/15回視聴済み」）の見た目を、科目一覧ページ
// (page-course-select-progress.js)とお気に入りパネル(menu/menu-favorites.js)で共通化する。
//
// 過去に科目一覧ページで、バッジが空プレースホルダー→実データへ切り替わる瞬間に幅が変わり、
// 後続のお気に入り星が左右にずれる不具合が起きた(min-widthを設けて解消済み)。お気に入り
// パネルの視聴回数バッジも同じgetCategoryProgress由来・同じ見た目でmin-widthが無く、
// 同じ不具合を再現していたため、プレースホルダーのスタイルと色分けロジックをここに集約し、
// 新しく同種のバッジを追加する時にmin-width指定を書き忘れないようにする。

// 「999/999回視聴済み+」相当まで入っても幅が変わらないための下限
const OUJ_PROGRESS_BADGE_MIN_WIDTH = 110;

function oujProgressBadgeStyleText() {
  return `display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:${OUJ_PROGRESS_BADGE_MIN_WIDTH}px;margin-left:8px;padding:2px 10px;border-radius:12px;font-size:12px;color:#666;background:#eee;white-space:nowrap;`;
}

// 視聴回数バッジに文言・状態別の色を反映する（要素の追加・削除はしない＝幅が変わるのはテキスト量のみ）。
// 動画が無い等でバッジ自体を消す判断は呼び出し側の責務（min-widthはあくまで「表示するなら
// 最初から確保しておく」ためのもので、非表示にするケースまでは吸収しない）
function fillProgressCountBadge(badge, { finishedCount, total, suffix = '' }) {
  badge.textContent = `${finishedCount}/${total}回視聴済み${suffix}`;
  if (finishedCount >= total) {
    badge.style.background = '#dcedc8';
    badge.style.color = '#33691e';
  } else if (finishedCount > 0) {
    badge.style.background = '#e3f2fd';
    badge.style.color = '#1565c0';
  } else {
    badge.style.background = '#eee';
    badge.style.color = '#666';
  }
}

// 全科目絞り込みパネル(search-box-all-subjects-panel.js)用。「視聴済み」「視聴途中」の
// 短い状態ラベルのみを出すバッジで、視聴回数バッジとは文言が違うため別にmin-widthを持つ
// （実測値: 両文言とも12pxフォントで68px。同じ文字数なので既に幅は揃っているが、
// 空欄プレースホルダーの時点から確保しておく必要がある）
const OUJ_STATE_BADGE_MIN_WIDTH = 68;

function oujStateBadgeStyleText() {
  return `display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:${OUJ_STATE_BADGE_MIN_WIDTH}px;margin-left:8px;padding:2px 10px;border-radius:12px;font-size:12px;color:#666;background:#eee;white-space:nowrap;`;
}

window.oujProgressBadgeStyleText = oujProgressBadgeStyleText;
window.fillProgressCountBadge = fillProgressCountBadge;
window.oujStateBadgeStyleText = oujStateBadgeStyleText;
