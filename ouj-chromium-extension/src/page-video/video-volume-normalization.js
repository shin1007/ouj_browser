// 音量正規化機能。Web Audio APIのDynamicsCompressorNodeで、同じ番組の中での
// セリフの大小など音量の起伏を抑える(番組ごとに固定の音量差を付けるのではなく、
// 常に今流れている音声そのものに反応するリアルタイム処理のため、結果的に
// 番組間の音量差も縮まるが、主目的は番組内の音量ムラを均す方)。
// コンプレッサーだけでは大きい部分を抑えるだけで静かな部分は持ち上がらないため、
// 圧縮後にメイクアップゲインで底上げし、さらにその後段にリミッターを挟んで
// クリッピングを防ぐ(コンプレッサー→メイクアップゲイン→リミッター→出力)。
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
let oujVolumeNormMakeupGain = null;
let oujVolumeNormLimiter = null;
let oujVolumeNormVideoEl = null;
let oujVolumeNormPendingVideo = null;
let oujVolumeNormGestureListenerAdded = false;
// このページ(document)内で実ユーザー操作を一度でも観測したか。
// Chromeの自動再生ポリシーは「ページ内で一度でも実操作があったか」を基準にしており、
// 一度満たせば同じページ内(SPA内遷移でJSコンテキストが継続する間)は追加の操作なしに
// AudioContextを使い始められる。これが無いと、動画終了時の自動連続再生(ユーザー操作を
// 伴わない)のたびに新しいジェスチャーを待つことになり、2本目以降で音量正規化が
// 効かなくなってしまう
let oujVolumeNormGestureOccurred = false;

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
  oujVolumeNormLimiter.disconnect();
  if (enabled) {
    oujVolumeNormSource.connect(oujVolumeNormCompressor);
    oujVolumeNormLimiter.connect(oujVolumeNormAudioContext.destination);
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
  oujVolumeNormMakeupGain = null;
  oujVolumeNormLimiter = null;
  oujVolumeNormVideoEl = video;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(video);

    // 主圧縮: セリフの大小など、音量の起伏を抑える
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -35;
    compressor.knee.value = 20;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.3;

    // メイクアップゲイン: 圧縮で下がった全体音量を底上げし、静かな部分を
    // 実際に聞き取りやすくする(コンプレッサー単体では大きい部分を抑えるだけで
    // 静かな部分は持ち上がらないため)
    const makeupGain = ctx.createGain();
    makeupGain.gain.value = 2.0; // 約+6dB

    // リミッター: メイクアップゲインで底上げした結果、瞬間的な大きい音が
    // クリッピングしないよう安全弁として挟む
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;

    compressor.connect(makeupGain);
    makeupGain.connect(limiter);
    limiter.connect(ctx.destination);

    oujVolumeNormAudioContext = ctx;
    oujVolumeNormSource = source;
    oujVolumeNormCompressor = compressor;
    oujVolumeNormMakeupGain = makeupGain;
    oujVolumeNormLimiter = limiter;
    ctx.resume().catch(() => {});
  } catch (e) {
    console.warn('[OUJ拡張] 音量正規化用の音声グラフを構築できませんでした:', e);
    oujVolumeNormAudioContext = null;
    oujVolumeNormSource = null;
    oujVolumeNormCompressor = null;
    oujVolumeNormMakeupGain = null;
    oujVolumeNormLimiter = null;
  }
}

// ページ上での最初の実ユーザー操作(クリック/タップ/キー入力)を待って、
// その時点で初めて音声グラフを構築する。自動再生ポリシー対策。
function ensureGestureTriggeredSetup() {
  // 既にこのページ内で一度ジェスチャーを経ていれば、次の動画(自動連続再生を含む)でも
  // 追加の操作を待たずにその場で音声グラフを構築・接続する
  if (oujVolumeNormGestureOccurred) {
    if (!isVolumeNormalizationEnabled()) return;
    const video = oujVolumeNormPendingVideo || document.querySelector('video');
    if (video) {
      buildAudioGraphIfNeeded(video);
      applyVolumeNormalizationSetting(true);
    }
    return;
  }
  if (oujVolumeNormGestureListenerAdded) return;
  oujVolumeNormGestureListenerAdded = true;
  const onGesture = () => {
    document.removeEventListener('pointerdown', onGesture, true);
    document.removeEventListener('keydown', onGesture, true);
    oujVolumeNormGestureListenerAdded = false;
    oujVolumeNormGestureOccurred = true;
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
