// 音量正規化機能。Web Audio APIのDynamicsCompressorNodeで、ラジオ番組と
// テレビ番組の音量差など、大きな音量差を抑える。
// (DRM保護された動画でもcreateMediaElementSourceによる音声処理が問題なく
// 機能することは実際のDRM動画で検証済み)
//
// 注意: ブラウザの自動再生ポリシーにより、AudioContextはページ上でユーザーの
// 実際の操作(クリック/キー入力など)が一度もない状態では"suspended"のまま
// 音が出ない。そのため、この機能が有効な場合でも、AudioContextの生成は
// ページ読み込み時に無条件で行わず、実際のユーザー操作が起きるまで遅延させる
// (無効なユーザーには一切AudioContextを作らないので、この機能をオフにしている
// 大半のユーザーの音声には影響しない)。設定パネルのチェックボックスをクリックして
// 有効化した場合は、そのクリック自体がユーザー操作なのでその場で構築する。
//
// createMediaElementSourceは同一のvideo要素に対して一度しか呼べないため、
// 動画要素ごとに一度だけ音声グラフを構築する。設定のON/OFFはコンプレッサーを
// 経由させるかどうかの繋ぎ替えで切り替える(グラフ自体は作り直さない)。
let oujVolumeNormAudioContext = null;
let oujVolumeNormSource = null;
let oujVolumeNormCompressor = null;
let oujVolumeNormVideoEl = null;
let oujVolumeNormPendingVideo = null;
let oujVolumeNormGestureListenerAdded = false;

function isVolumeNormalizationEnabled() {
  return window.getBooleanSetting ? window.getBooleanSetting('volumeNormalizationEnabled', false) : false;
}

// 現在の設定に応じて、コンプレッサー経由(正規化あり)か直結(正規化なし)かを切り替える
function applyVolumeNormalizationSetting(enabled) {
  if (enabled) {
    // グラフがまだ無い場合、このタイミングがユーザー操作の直後(設定パネルの
    // チェックボックスの変更イベント内など)であれば、ここで構築してしまう
    const video = oujVolumeNormPendingVideo || document.querySelector('video');
    if (video) buildAudioGraphIfNeeded(video);
  }
  if (!oujVolumeNormSource || !oujVolumeNormCompressor || !oujVolumeNormAudioContext) return;
  if (oujVolumeNormAudioContext.state === 'suspended') {
    oujVolumeNormAudioContext.resume().catch(() => {});
  }
  oujVolumeNormSource.disconnect();
  oujVolumeNormCompressor.disconnect();
  if (enabled) {
    oujVolumeNormSource.connect(oujVolumeNormCompressor);
    oujVolumeNormCompressor.connect(oujVolumeNormAudioContext.destination);
  } else {
    oujVolumeNormSource.connect(oujVolumeNormAudioContext.destination);
  }
}

function buildAudioGraphIfNeeded(video) {
  if (oujVolumeNormVideoEl === video && oujVolumeNormAudioContext) return; // 構築済み

  // 前の動画ページで作ったAudioContextが残っていれば閉じる
  if (oujVolumeNormAudioContext) {
    oujVolumeNormAudioContext.close().catch(() => {});
  }
  oujVolumeNormAudioContext = null;
  oujVolumeNormSource = null;
  oujVolumeNormCompressor = null;
  oujVolumeNormVideoEl = video;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(video);
    const compressor = ctx.createDynamicsCompressor();
    // 静かな部分を持ち上げ、大きい部分を抑えることで番組間の音量差を縮める設定値
    compressor.threshold.value = -30;
    compressor.knee.value = 20;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.3;
    source.connect(compressor);
    compressor.connect(ctx.destination);

    oujVolumeNormAudioContext = ctx;
    oujVolumeNormSource = source;
    oujVolumeNormCompressor = compressor;
    ctx.resume().catch(() => {});
  } catch (e) {
    console.warn('[OUJ拡張] 音量正規化用の音声グラフを構築できませんでした:', e);
    oujVolumeNormAudioContext = null;
    oujVolumeNormSource = null;
    oujVolumeNormCompressor = null;
  }
}

// ページ上での最初の実ユーザー操作(クリック/タップ/キー入力)を待って、
// その時点で初めて音声グラフを構築する。自動再生ポリシー対策。
function ensureGestureTriggeredSetup() {
  if (oujVolumeNormGestureListenerAdded) return;
  oujVolumeNormGestureListenerAdded = true;
  const onGesture = () => {
    document.removeEventListener('pointerdown', onGesture, true);
    document.removeEventListener('keydown', onGesture, true);
    oujVolumeNormGestureListenerAdded = false;
    if (!isVolumeNormalizationEnabled()) return;
    const video = oujVolumeNormPendingVideo || document.querySelector('video');
    if (video) {
      buildAudioGraphIfNeeded(video);
      applyVolumeNormalizationSetting(true);
    }
  };
  document.addEventListener('pointerdown', onGesture, true);
  document.addEventListener('keydown', onGesture, true);
}

function startVolumeNormalizationManagement() {
  if (typeof window.waitForElement !== 'function' || typeof window.getBooleanSetting !== 'function') {
    setTimeout(startVolumeNormalizationManagement, 100);
    return;
  }
  // 設定が無効なら音声パイプラインには一切手を出さない
  if (!isVolumeNormalizationEnabled()) return;
  window.waitForElement('video', (video) => {
    oujVolumeNormPendingVideo = video;
    ensureGestureTriggeredSetup();
  });
}

window.startVolumeNormalizationManagement = startVolumeNormalizationManagement;
window.applyVolumeNormalizationSetting = applyVolumeNormalizationSetting;
