// 分割されたファイルを読み込むためのメインファイル
// 各機能モジュールを読み込み

// --- 代わりに「Enter / Spaceキーで再生できる」旨を表示するUIを追加 ---
function showPlayHint() {
  if (document.getElementById('play-hint-notification')) return;
  const hint = document.createElement('div');
  hint.id = 'play-hint-notification';
  hint.style.cssText = `
    position: fixed;
    top: 18%;
    left: 50%;
    transform: translate(-50%, 0);
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 16px 28px;
    border-radius: 10px;
    font-size: 18px;
    z-index: 9999;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    text-align: center;
    pointer-events: none;
  `;
  hint.innerHTML = `
    <span style="font-size: 22px;">▶️</span> <b>Enter</b> または <b>Space</b> キーで再生できます
  `;
  document.body.appendChild(hint);
  setTimeout(() => {
    hint.remove();
  }, 6000);
}

// 動画ページ初期化時にヒントを表示
if (location.pathname.includes('/video/')) {
  showPlayHint();
}

// グローバル関数として公開
window.showPlayHint = showPlayHint; 