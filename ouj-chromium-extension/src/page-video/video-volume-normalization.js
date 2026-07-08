// 音量正規化機能。Web Audio APIのDynamicsCompressorNodeで、ラジオ番組と
// テレビ番組の音量差など、大きな音量差を抑える。
// (DRM保護された動画でもcreateMediaElementSourceによる音声処理が問題なく
// 機能することは実際のDRM動画で検証済み)
//
// createMediaElementSourceは同一のvideo要素に対して一度しか呼べないため、
// 動画要素ごとに一度だけ音声グラフを構築する。設定のON/OFFはコンプレッサーを
// 経由させるかどうかの繋ぎ替えで切り替える(グラフ自体は作り直さない)。
let oujVolumeNormAudioContext = null;
let oujVolumeNormSource = null;
let oujVolumeNormCompressor = null;
let oujVolumeNormVideoEl = null;

// 現在の設定に応じて、コンプレッサー経由(正規化あり)か直結(正規化なし)かを切り替える
function applyVolumeNormalizationSetting(enabled) {
  if (!oujVolumeNormSource || !oujVolumeNormCompressor || !oujVolumeNormAudioContext) return;
  oujVolumeNormSource.disconnect();
  oujVolumeNormCompressor.disconnect();
  if (enabled) {
    oujVolumeNormSource.connect(oujVolumeNormCompressor);
    oujVolumeNormCompressor.connect(oujVolumeNormAudioContext.destination);
  } else {
    oujVolumeNormSource.connect(oujVolumeNormAudioContext.destination);
  }
}

function setupVolumeNormalization(video) {
  // 同じ動画要素に対して二重にグラフを構築しない
  if (oujVolumeNormVideoEl === video) return;

  // 前の動画ページで作ったAudioContextが残っていれば閉じる
  if (oujVolumeNormAudioContext) {
    oujVolumeNormAudioContext.close().catch(() => {});
    oujVolumeNormAudioContext = null;
    oujVolumeNormSource = null;
    oujVolumeNormCompressor = null;
  }
  oujVolumeNormVideoEl = video;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    oujVolumeNormAudioContext = new AudioCtx();
    oujVolumeNormSource = oujVolumeNormAudioContext.createMediaElementSource(video);
    oujVolumeNormCompressor = oujVolumeNormAudioContext.createDynamicsCompressor();
    // 静かな部分を持ち上げ、大きい部分を抑えることで番組間の音量差を縮める設定値
    oujVolumeNormCompressor.threshold.value = -30;
    oujVolumeNormCompressor.knee.value = 20;
    oujVolumeNormCompressor.ratio.value = 6;
    oujVolumeNormCompressor.attack.value = 0.02;
    oujVolumeNormCompressor.release.value = 0.3;

    if (oujVolumeNormAudioContext.state === 'suspended') {
      oujVolumeNormAudioContext.resume().catch(() => {});
    }

    const enabled = window.getBooleanSetting ? window.getBooleanSetting('volumeNormalizationEnabled', false) : false;
    applyVolumeNormalizationSetting(enabled);
  } catch (e) {
    console.warn('[OUJ拡張] 音量正規化用の音声グラフを構築できませんでした:', e);
    oujVolumeNormAudioContext = null;
    oujVolumeNormSource = null;
    oujVolumeNormCompressor = null;
  }
}

function startVolumeNormalizationManagement() {
  if (typeof window.waitForElement !== 'function') {
    setTimeout(startVolumeNormalizationManagement, 100);
    return;
  }
  window.waitForElement('video', (video) => {
    setupVolumeNormalization(video);
  });
}

window.startVolumeNormalizationManagement = startVolumeNormalizationManagement;
window.applyVolumeNormalizationSetting = applyVolumeNormalizationSetting;
