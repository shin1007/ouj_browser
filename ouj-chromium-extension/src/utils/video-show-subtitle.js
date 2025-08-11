
// <li class="theo-menu-item vjs-menu-item" role="menuitemcheckbox" tabindex="0" aria-live="off" aria-label="字幕表示" aria-disabled="false" 
// id="setting-menu-item-subtitle" aria-checked="true">
// <span class="theo-settings-control-menu-item-title">字幕</span>
// <div class="toggle-switch" role="switch">
// <span class="slider"></span>
// </div></li>


// <div class="cls-text-track-sami-cue cls-watermark-display-canvas-padding-bottom" style="height: 38%;"><div start="1403003" style="null">
// <p class="JAJPCC" style="null"><span style="color: #FFFF00;">成熟優位説は 1930年代から50年代にかけて</span><br style="display: none"></p>
// <p class="JAJPCC" style="null"><span style="color: #FFFF00;">発達心理学の有力な学説の１つとなり</span><br style="display: none"></p>
// <p class="JAJPCC" style="null"><span style="color: #FFFF00;">ジョン･ワトソンの提唱した行動主義に</span><br style="display: none"></p>
// <p class="JAJPCC" style="null"><span style="color: #FFFF00;">対立する見方を提示しました。</span>
// </p></div></div>
//


function isCaptionHidden() {
    let captionDiv = document.querySelector('.cls-sami-display');
    // captionDivにvjsHiddenクラスがあるかどうかを確認

    if (!captionDiv) return;
    console.log('classList:', captionDiv.classList);
    // vjsHiddenクラスがある場合は削除、ない場合は追加
    return captionDiv.classList.contains('vjs-hidden');

}
function getCaptionSlider() {
    // 設定メニューに字幕のトグルスイッチがあるか
    const subtitleMenuItem = document.getElementById('setting-menu-item-subtitle');
    if (!subtitleMenuItem) return;
    const toggleSwitch = subtitleMenuItem.querySelector('.toggle-switch');
    if (!toggleSwitch) return;
    const slider = toggleSwitch.querySelector('.slider');
    return slider;
}
function toggleSubtitle(on=true) {
    // トグルスイッチがあればクリックする
    // console.log('toggleSubtitle: 字幕の表示/非表示を切り替えます');
    let slider = getCaptionSlider();
    if (!slider) {
        console.warn('toggleSubtitle: 字幕のトグルスイッチが見つかりません。');
        return;
    }
    const isAlreadyOn = !isCaptionHidden();

    // 現在の状態と合わせるためのリターン
    if (on && isAlreadyOn) return;
    if (!on && !isAlreadyOn) return;
    slider.click();
}

// グローバル関数として公開
window.toggleSubtitle = toggleSubtitle;