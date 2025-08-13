
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
async function toggleCaptionTv(isTurnOn=true) {
    const isRadioProgram = await window.isRadioProgram();
    if (!isRadioProgram) {
        // テレビ番組の場合は字幕のトグルスイッチをクリック
        toggleCaption(isTurnOn);
    }
}
async function toggleCaptionRadio(isTurnOn=true) {
    const isRadioProgram = await window.isRadioProgram();
    if (isRadioProgram) {
        // ラジオ番組の場合は字幕のトグルスイッチをクリック
        toggleCaption(isTurnOn);
    }
}
function toggleCaption(isTurnOn=true) {
    // トグルスイッチがあればクリックする
    // console.log('toggleSubtitle: 字幕の表示/非表示を切り替えます');
    let slider = getCaptionSlider();
    if (!slider) {
        // console.warn('toggleSubtitle: 字幕のトグルスイッチが見つかりません。');
        return;
    }
    const isAlreadyOn = !isCaptionHidden();

    // 現在の状態と合わせるためのリターン（設定項目のオンオフだけ切り替えられる結果になる）
    if (isTurnOn && isAlreadyOn) return;
    if (!isTurnOn && !isAlreadyOn) return;
    // トグルスイッチをクリックして状態を切り替える
    slider.click();
}
async function showCaptionAccordingToSetting() {
    // 設定に応じて字幕を表示する
    const isRadioProgram = await window.isRadioProgram();
    console.log('showCaptionAccordingToSetting: ラジオ番組かどうか:', isRadioProgram);
    if (isRadioProgram) {
        const autoCaptionEnabledRadio = window.getSetting('autoCaptionEnabledRadio', true);
        toggleCaptionRadio(autoCaptionEnabledRadio);
    } else {
        const autoCaptionEnabledTV = window.getSetting('autoCaptionEnabledTV', true);
        toggleCaptionTv(autoCaptionEnabledTV);
    }
}
// グローバル関数として公開
window.toggleCaptionTv = toggleCaptionTv;
window.showCaptionAccordingToSetting = showCaptionAccordingToSetting;