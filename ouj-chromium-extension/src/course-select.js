// コース一覧の各動画にお気に入りボタンを追加
function addFavoriteButtonsToCourseList() {
  // 関数の開始をコンソールにログ出力
  console.log("addFavoriteButtonsToLectureList: 開始");
  // ion-list#common-list-content内のion-itemを全て取得
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  
  items.forEach(item => {
    // すでに追加済みならスキップ
    if (item.querySelector('.favorite-btn')) return;
    // お気に入りボタン作成
    const favBtn = document.createElement('button');
    favBtn.className = 'favorite-btn';
    favBtn.title = 'お気に入り';
    favBtn.style.background = 'none';
    favBtn.style.border = 'none';
    favBtn.style.cursor = 'pointer';
    favBtn.style.marginLeft = '8px';
    favBtn.style.display = 'inline-flex';
    favBtn.style.alignItems = 'center';
    favBtn.style.verticalAlign = 'top';
    favBtn.style.height = item.offsetHeight*0.9 + 'px';
    // 白抜きアイコン（outline）をデフォルトで使用
    // TODO: お気に入りに追加されている場合は塗られているアイコンにする
    favBtn.innerHTML = '<ion-icon name="star-outline" class="icon icon-md ion-md-star-outline item-icon" aria-label="お気に入り" style="font-size:22px;"></ion-icon>';
    // タイトルの右側に追加
    item.parentNode.appendChild(favBtn);
    // コンソールにログ出力
    console.log("addFavoriteButtonsToLectureList: お気に入りボタンを追加しました。", item);
  });
  // 関数の終了をコンソールにログ出力
  console.log("addFavoriteButtonsToLectureList: 完了");
}

function waitThenAddFavToCourseList() {
  console.log("waitThenAddFavToCourseList: 開始");
  const categoryNum = parseInt(new URLSearchParams(window.location.search).get('ca'), 10);
  if (isNaN(categoryNum)) {
    const childCategories = getChildIds();
  } else {
    const childCategories = getChildIds(categoryNum);
  }
  console.log("childCategories:", childCategories);
  const items = document.querySelectorAll('#main div.icon-text > .icon-area');
  if (!items.length) {
    setTimeout(waitThenAddFavToCourseList, 100);
    return;
  }
  addFavoriteButtonsToCourseList();
  console.log("お気に入りボタンを追加しました");
}
window.waitThenAddFavToCourseList = waitThenAddFavToCourseList;