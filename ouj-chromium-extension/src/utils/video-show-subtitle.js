
// <li class="theo-menu-item vjs-menu-item" role="menuitemcheckbox" tabindex="0" aria-live="off" aria-label="字幕表示" aria-disabled="false" 
// id="setting-menu-item-subtitle" aria-checked="true">
// <span class="theo-settings-control-menu-item-title">字幕</span>
// <div class="toggle-switch" role="switch">
// <span class="slider"></span>
// </div></li>

function toggleSubtitle() {
  // console.log('toggleSubtitle: 字幕の表示/非表示を切り替えます');
  // id="setting-menu-item-subtitle"うちのtoggle-switchを切り替える
    const subtitleMenuItem = document.getElementById('setting-menu-item-subtitle');
    if (!subtitleMenuItem) {
        console.warn('toggleSubtitle: subtitleMenuItemが見つかりません');
        return;
    }
    const toggleSwitch = subtitleMenuItem.querySelector('.toggle-switch');
    if (!toggleSwitch) {
        console.warn('toggleSubtitle: toggleSwitchが見つかりません');
        return;
    }
    const slider = toggleSwitch.querySelector('.slider');
    if (!slider) {
        console.warn('toggleSubtitle: sliderが見つかりません');
        return;
        }
    // スライダーのクラスを切り替え
    // クリックイベントで切り替える
    slider.click();

    if (slider.classList.contains('active')) {
        console.log('toggleSubtitle: 字幕を「表示」として保存しました');
    } else {
        console.log('toggleSubtitle: 字幕を「非表示」として保存しました');
    }
}

// グローバル関数として公開
window.toggleSubtitle = toggleSubtitle;