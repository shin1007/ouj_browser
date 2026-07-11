document.addEventListener('DOMContentLoaded', function() {
    // 大きな放送大学ページボタン
    const openOujHomeButton = document.getElementById('open-ouj-home');
    
    // 自動ログインのチェックボックス
    const autoLoginCheckbox = document.getElementById('auto-login-checkbox');

    // 表示テーマの選択欄
    const themeSelect = document.getElementById('theme-select');

    // ポップアップが開いた際にボタンにフォーカスを当てる
    openOujHomeButton.focus();

    // 保存された自動ログイン設定を読み込む
    chrome.storage.sync.get(['autoLogin'], function(result) {
        if (result.autoLogin !== undefined) {
            autoLoginCheckbox.checked = result.autoLogin;
        }
    });

    // 自動ログイン設定の変更を保存
    autoLoginCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({
            autoLogin: autoLoginCheckbox.checked
        }, function() {
        });
    });

    // 保存された表示テーマ設定を読み込む（未設定時は自動＝OS追従）
    chrome.storage.sync.get(['darkMode'], function(result) {
        themeSelect.value = result.darkMode || 'auto';
    });

    // 表示テーマ設定の変更を保存
    themeSelect.addEventListener('change', function() {
        chrome.storage.sync.set({
            darkMode: themeSelect.value
        });
    });

    // 放送大学ホームページを開く
    openOujHomeButton.addEventListener('click', function() {
        const targetUrl = "https://v.ouj.ac.jp/view/ouj/#/navi/home";
        
        // 新しいタブで放送大学のホームページを開く
        chrome.tabs.create({ 
            url: targetUrl,
            active: true
        }, (newTab) => {
            if (chrome.runtime.lastError) {
                console.error('タブ作成エラー:', chrome.runtime.lastError);
            } else {
                // ポップアップを閉じる
                window.close();
            }
        });
    });

    // アコーディオンの開閉を共通化（ライセンス・設定・バックアップ）
    const setupAccordion = (headerId, contentId) => {
        const header = document.getElementById(headerId);
        const content = document.getElementById(contentId);
        if (!header || !content) return;
        const icon = header.querySelector('.accordion-icon');
        header.addEventListener('click', () => {
            const isOpen = content.style.display === 'block';
            content.style.display = isOpen ? 'none' : 'block';
            if (icon) icon.textContent = isOpen ? '▼' : '▲';
        });
    };
    setupAccordion('licenses-header', 'licenses-content');
    setupAccordion('settings-header', 'settings-content');
    setupAccordion('backup-header', 'backup-content');

    initSettingsSection();
    initBackupSection();
});

// =========================
// 再生・動画の設定（chrome.storage.syncのミラーを読み書きする）
// コンテンツスクリプト側のsettings-sync.jsがonChangedでlocalStorageに反映するため、
// ここでの変更は開いている放送大学のページにもすぐ届く
// =========================
const OUJ_POPUP_MIRROR_PREFIX = 'mirror:';

// settings-sync.jsのsyncミラー対象と同じキー一覧（インポート時の保存先判定に使う）
const OUJ_POPUP_SYNC_KEYS = [
    'favorites', 'pinnedFavorites', 'favoritesSortMode',
    'nextVideoSetting', 'autoNextVideoEnabled', 'autoPlayEnabled',
    'autoCaptionEnabledTV', 'autoCaptionEnabledRadio', 'preventCaptionShrink',
    'screenWakeLockEnabled', 'volumeNormalizationEnabled',
    'playbackSpeedControlEnabled', 'playbackSpeed', 'skipEndSeconds', 'skipStartSeconds',
    'playlogIntervalMinutes', 'studyTimeGoalMinutes',
    'searchFilterMedia', 'searchFilterCaptionOnly', 'searchFilterUnwatchedOnly', 'searchFilterPartialOnly',
];

function oujPopupReadMirror(key, defaultValue) {
    return new Promise((resolve) => {
        chrome.storage.sync.get([OUJ_POPUP_MIRROR_PREFIX + key], (result) => {
            const entry = result[OUJ_POPUP_MIRROR_PREFIX + key];
            if (entry && typeof entry === 'object' && 'value' in entry) {
                resolve(entry.value);
            } else {
                resolve(defaultValue);
            }
        });
    });
}

function oujPopupWriteMirror(key, value) {
    chrome.storage.sync.set({
        [OUJ_POPUP_MIRROR_PREFIX + key]: { value, updatedAt: Date.now() }
    });
}

// 保存値がboolean/文字列どちらでも扱えるように正規化する（getBooleanSettingと同じ規則）
function oujPopupToBoolean(value, defaultValue) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'false';
    return defaultValue;
}

function initSettingsSection() {
    // チェックボックス設定: [キー, デフォルト値]
    const checkboxSettings = [
        ['playbackSpeedControlEnabled', true],
        ['autoCaptionEnabledTV', true],
        ['autoCaptionEnabledRadio', true],
        ['preventCaptionShrink', true],
        ['volumeNormalizationEnabled', false],
        ['autoPlayEnabled', false],
        ['autoNextVideoEnabled', true],
        ['screenWakeLockEnabled', true],
    ];
    checkboxSettings.forEach(([key, defaultValue]) => {
        const checkbox = document.getElementById(`set-${key}`);
        if (!checkbox) return;
        oujPopupReadMirror(key, defaultValue).then((value) => {
            checkbox.checked = oujPopupToBoolean(value, defaultValue);
        });
        checkbox.addEventListener('change', () => {
            oujPopupWriteMirror(key, checkbox.checked);
        });
    });

    // 再生速度セレクト（動画ページと同じ選択肢）
    const speedSelect = document.getElementById('set-playbackSpeed');
    if (speedSelect) {
        const speeds = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2.0, 2.5, 3.0];
        speedSelect.innerHTML = speeds.map((s) => `<option value="${s.toFixed(1)}">${s.toFixed(1)}x</option>`).join('');
        oujPopupReadMirror('playbackSpeed', 1.0).then((value) => {
            const speed = Number(value) || 1.0;
            const matched = speeds.find((s) => Math.abs(s - speed) < 0.01);
            speedSelect.value = (matched !== undefined ? matched : 1.0).toFixed(1);
        });
        speedSelect.addEventListener('change', () => {
            oujPopupWriteMirror('playbackSpeed', Number(speedSelect.value));
        });
    }

    // その他のセレクト設定: [キー, デフォルト値]
    const selectSettings = [
        ['nextVideoSetting', 'same-course'],
        ['playlogIntervalMinutes', 3],
    ];
    selectSettings.forEach(([key, defaultValue]) => {
        const select = document.getElementById(`set-${key}`);
        if (!select) return;
        oujPopupReadMirror(key, defaultValue).then((value) => {
            select.value = String(value);
            // 保存値が選択肢にない場合はデフォルトに戻す
            if (select.selectedIndex === -1) select.value = String(defaultValue);
        });
        select.addEventListener('change', () => {
            const raw = select.value;
            oujPopupWriteMirror(key, /^\d+$/.test(raw) ? Number(raw) : raw);
        });
    });
}

// =========================
// データのバックアップ（エクスポート/インポート）
// chrome.storage(sync/local)に保存されたミラーと、拡張機能ネイティブの設定を
// 1つのJSONファイルにまとめて保存/復元する
// =========================
const OUJ_BACKUP_NATIVE_KEYS = ['darkMode', 'autoLogin', 'headerCollapsed'];

function setBackupStatus(message, isError = false) {
    const status = document.getElementById('backup-status');
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? '#c62828' : '#2e7d32';
}

async function collectBackupData() {
    const syncAll = await new Promise((resolve) => chrome.storage.sync.get(null, resolve));
    const localAll = await new Promise((resolve) => chrome.storage.local.get(null, resolve));
    const mirrors = {};
    [syncAll, localAll].forEach((all) => {
        Object.keys(all || {}).forEach((storageKey) => {
            if (!storageKey.startsWith(OUJ_POPUP_MIRROR_PREFIX)) return;
            const entry = all[storageKey];
            if (entry && typeof entry === 'object' && 'value' in entry) {
                mirrors[storageKey.slice(OUJ_POPUP_MIRROR_PREFIX.length)] = entry.value;
            }
        });
    });
    const native = {};
    OUJ_BACKUP_NATIVE_KEYS.forEach((key) => {
        if (syncAll && key in syncAll) native[key] = syncAll[key];
    });
    return {
        format: 'ouj-browser-backup',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        native,
        mirrors,
    };
}

async function applyBackupData(backup) {
    if (!backup || backup.format !== 'ouj-browser-backup' || typeof backup.mirrors !== 'object') {
        throw new Error('バックアップファイルの形式が正しくありません');
    }
    const now = Date.now();
    const syncItems = {};
    const localItems = {};
    Object.keys(backup.mirrors).forEach((key) => {
        const entry = { value: backup.mirrors[key], updatedAt: now };
        if (OUJ_POPUP_SYNC_KEYS.includes(key)) {
            syncItems[OUJ_POPUP_MIRROR_PREFIX + key] = entry;
        } else {
            localItems[OUJ_POPUP_MIRROR_PREFIX + key] = entry;
        }
    });
    // ネイティブ設定（テーマ・自動ログイン等）
    if (backup.native && typeof backup.native === 'object') {
        OUJ_BACKUP_NATIVE_KEYS.forEach((key) => {
            if (key in backup.native) syncItems[key] = backup.native[key];
        });
    }
    await new Promise((resolve) => chrome.storage.sync.set(syncItems, resolve));
    await new Promise((resolve) => chrome.storage.local.set(localItems, resolve));
}

function initBackupSection() {
    const exportButton = document.getElementById('backup-export');
    const importButton = document.getElementById('backup-import');
    const fileInput = document.getElementById('backup-import-file');
    if (!exportButton || !importButton || !fileInput) return;

    exportButton.addEventListener('click', async () => {
        try {
            const backup = await collectBackupData();
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `ouj-browser-backup-${dateStr}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setBackupStatus('バックアップファイルを保存しました');
        } catch (e) {
            setBackupStatus(`エクスポートに失敗しました: ${e.message}`, true);
        }
    });

    // MV3のポップアップではconfirm()が環境によって動作しないため、
    // ファイル選択後にインラインの確認ボタンを表示する二段階方式にする
    let pendingBackup = null;

    // 通常時はファイル選択を開き、確認状態のときは復元を実行する
    importButton.addEventListener('click', async () => {
        if (importButton.dataset.confirming === '1' && pendingBackup) {
            try {
                await applyBackupData(pendingBackup);
                setBackupStatus('復元しました。放送大学のページを開く（または再読み込みする）と反映されます。');
            } catch (e) {
                setBackupStatus(`復元に失敗しました: ${e.message}`, true);
            }
            pendingBackup = null;
            importButton.dataset.confirming = '';
            importButton.textContent = '📂 バックアップから復元（インポート）';
            return;
        }
        fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        fileInput.value = ''; // 同じファイルを選び直せるようにリセット
        if (!file) return;
        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            if (!backup || backup.format !== 'ouj-browser-backup' || typeof backup.mirrors !== 'object') {
                throw new Error('バックアップファイルの形式が正しくありません');
            }
            pendingBackup = backup;
            const count = Object.keys(backup.mirrors || {}).length;
            const exportedAt = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString('ja-JP') : '不明';
            setBackupStatus(`バックアップ（${exportedAt}保存・${count}項目）を読み込みました。現在のお気に入り・履歴・設定は上書きされます。`);
            importButton.textContent = '⚠ もう一度クリックで復元を実行';
            importButton.dataset.confirming = '1';
        } catch (e) {
            pendingBackup = null;
            setBackupStatus(`インポートに失敗しました: ${e.message}`, true);
        }
    });
}