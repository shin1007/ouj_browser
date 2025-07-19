const savePlaybackPosition = (position) => {
    window.saveSetting('playbackPosition', position);
};

const getPlaybackPosition = () => {
    return window.getSetting('playbackPosition', 0);
};

const saveFavorite = (videoId) => {
    let favorites = window.getSetting('favorites', []);
    if (!favorites.includes(videoId)) {
        favorites.push(videoId);
        window.saveSetting('favorites', favorites);
    }
};

const getFavorites = () => {
    return window.getSetting('favorites', []);
};

const readTitleAloud = (title) => {
    const utterance = new SpeechSynthesisUtterance(title);
    window.speechSynthesis.speak(utterance);
};

const clearVideoElements = () => {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
        video.style.display = 'none';
    });
};

const removeIntroAndOutro = (videoElement) => {
    videoElement.currentTime = videoElement.duration - 10; // Skip last 10 seconds as an example
};

/**
 * 日付が同じかどうかをチェックする関数
 * @param {string} dateString1 - 日付文字列1
 * @param {string} dateString2 - 日付文字列2
 * @returns {boolean} 同じ日付の場合true
 */
const isSameDate = (dateString1, dateString2) => {
    const date1 = new Date(dateString1);
    const date2 = new Date(dateString2);
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

/**
 * キャッシュ付きのAPIリクエストを行う関数
 * @param {string} url - APIのURL
 * @param {string} cacheKey - キャッシュのキー
 * @returns {Promise<Object|null>} 取得またはキャッシュされたJSONデータ、またはnull
 */
const fetchWithCache = async (url, cacheKey) => {
  

    // 1. 最初にキャッシュされたデータを確認
    const result = await chrome.storage.local.get([cacheKey]);
    const cachedData = result[cacheKey];

    if (cachedData && cachedData.timestamp) {
        if (isSameDate(cachedData.timestamp, new Date().toISOString())) {
    
            return cachedData.data;
        } else {
            console.log(`fetchWithCache: ${cacheKey} のキャッシュは当日のものではありません。ネットワークからデータ取得を試行中...`);
        }
    } else {
  
    }

    try {
        // 2. 当日のキャッシュがない場合のみネットワークリクエストを試みる
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // 3. 成功した場合、JSONデータとタイムスタンプをストレージに保存
        const cacheData = {
            data: data,
            timestamp: new Date().toISOString()
        };
        await chrome.storage.local.set({ [cacheKey]: cacheData });
  
        return data;

    } catch (error) {
        console.warn(`fetchWithCache: ${cacheKey} のネットワークからのデータ取得に失敗しました。エラー: ${error.message}`);
        
        // 古いキャッシュがあれば、それを返す
        if (cachedData && cachedData.data) {
            console.log(`fetchWithCache: ${cacheKey} のネットワークエラーのため、古いキャッシュを利用します。`, cachedData.data);
            return cachedData.data;
        }
        
        console.warn(`fetchWithCache: ${cacheKey} のキャッシュされたデータも見つかりませんでした。`);
        return null;
    }
};

/**
 * 指定された要素が存在するまで待機し、存在したらコールバックを実行する関数
 * @param {string} selector - CSSセレクタ
 * @param {Function} callback - 要素が見つかった時に実行するコールバック関数
 * @param {number} interval - 待機間隔（ミリ秒、デフォルト: 100）
 * @param {number} maxAttempts - 最大試行回数（デフォルト: 無制限）
 */
const waitForElement = (selector, callback, interval = 100, maxAttempts = null) => {
    let attempts = 0;
    
    const checkElement = () => {
        attempts++;
        const element = document.querySelector(selector);
        
        if (element) {
            console.log(`waitForElement: 要素が見つかりました: ${selector}`);
            callback(element);
            return;
        }
        
        if (maxAttempts && attempts >= maxAttempts) {
            console.warn(`waitForElement: 最大試行回数に達しました: ${selector}`);
            return;
        }
        
  
        setTimeout(checkElement, interval);
    };
    
    checkElement();
};

/**
 * 指定された条件が満たされるまで待機し、満たされたらコールバックを実行する関数
 * @param {Function} condition - 条件をチェックする関数（trueを返すと待機終了）
 * @param {Function} callback - 条件が満たされた時に実行するコールバック関数
 * @param {number} interval - 待機間隔（ミリ秒、デフォルト: 100）
 * @param {number} maxAttempts - 最大試行回数（デフォルト: 無制限）
 */
const waitForCondition = (condition, callback, interval = 100, maxAttempts = null) => {
    let attempts = 0;
    
    const checkCondition = () => {
        attempts++;
        
        if (condition()) {
            console.log('waitForCondition: 条件が満たされました');
            callback();
            return;
        }
        
        if (maxAttempts && attempts >= maxAttempts) {
            console.warn('waitForCondition: 最大試行回数に達しました');
            return;
        }
        
        console.log(`waitForCondition: 条件が満たされません。${interval}ms後に再試行します`);
        setTimeout(checkCondition, interval);
    };
    
    checkCondition();
};

/**
 * モーダルパネルを作成する関数
 * @param {string} id - パネルのID
 * @param {string} title - パネルのタイトル
 * @param {string} content - パネルの内容HTML
 * @param {Object} options - オプション設定
 * @returns {HTMLElement} 作成されたパネル要素
 */
const createModalPanel = (id, title, content, options = {}) => {
    const {
        width = 'min(90vw, 600px)',
        height = '480px',
        maxHeight = '480px',
        showCloseButton = true,
        closeOnOutsideClick = true,
        closeOnEscape = true,
        onClose = null
    } = options;

    // 既存パネルがあれば削除
    let existingPanel = document.getElementById(id);
    if (existingPanel) {
        existingPanel.remove();
    }

    // パネル要素を作成
    const panel = document.createElement('div');
    panel.id = id;
    panel.className = 'modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', `${id}-title`);
    panel.setAttribute('aria-modal', 'true');

    // #mainのスタイルを取得
    const main = document.getElementById('main');
    let mainWidth = '800px';
    let mainBg = '#fff';
    let mainFont = '';
    let mainFontSize = '14px';
    
    if (main) {
        const style = window.getComputedStyle(main);
        mainWidth = style.width;
        mainBg = style.backgroundColor;
        mainFont = style.fontFamily;
        mainFontSize = style.fontSize;
    }

    // モダンなスタイルを適用
    Object.assign(panel.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: width,
        maxWidth: mainWidth,
        minHeight: height,
        maxHeight: maxHeight,
        height: height,
        background: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '#1a2230' : '#f9fafb',
        fontFamily: mainFont || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: mainFontSize || '14px',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '0',
        zIndex: '9999',
        overflow: 'hidden',
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    });

    // ヘッダー部分
    const headerHtml = `
        <div style="background: #232c3a; padding: 20px 24px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a4658;">
            <h2 id="${id}-title" style="margin: 0; color: #fff; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">
                ${title}
            </h2>
            ${showCloseButton ? `
                <button id="${id}-close-btn" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: background-color 0.2s;" title="閉じる">
                    ×
                </button>
            ` : ''}
        </div>
    `;

    // コンテンツ部分
    const contentHtml = `
        <div style="padding: 0; height: calc(100% - 80px); overflow-y: auto;">
            ${content}
        </div>
    `;

    panel.innerHTML = headerHtml + contentHtml;

    // イベントリスナーを追加
    const closePanel = () => {
        panel.style.opacity = '0';
        panel.style.transform = 'translate(-50%, -50%) scale(0.95)';
        setTimeout(() => {
            if (panel.parentNode) {
                panel.remove();
            }
            if (onClose) onClose();
        }, 200);
    };

    if (showCloseButton) {
        const closeBtn = panel.querySelector(`#${id}-close-btn`);
        if (closeBtn) {
            closeBtn.addEventListener('click', closePanel);
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.backgroundColor = 'transparent';
            });
        }
    }

    if (closeOnOutsideClick) {
        const closePanelOnOutsideClick = (event) => {
            if (event.target === panel) {
                closePanel();
            }
        };
        panel.addEventListener('click', closePanelOnOutsideClick);
    }

    if (closeOnEscape) {
        const closePanelOnEscape = (event) => {
            if (event.key === 'Escape') {
                closePanel();
            }
        };
        document.addEventListener('keydown', closePanelOnEscape);
    }

    // ドキュメントに追加
    document.body.appendChild(panel);

    // アニメーション開始
    setTimeout(() => {
        panel.style.opacity = '1';
        panel.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    return panel;
};

/**
 * パネルを閉じる関数
 * @param {string} id - パネルのID
 */
const closeModalPanel = (id) => {
    const panel = document.getElementById(id);
    if (panel) {
        panel.style.opacity = '0';
        panel.style.transform = 'translate(-50%, -50%) scale(0.95)';
        setTimeout(() => {
            if (panel.parentNode) {
                panel.remove();
            }
        }, 200);
    }
};

/**
 * 設定を保存する関数
 * @param {string} key - 設定キー
 * @param {any} value - 保存する値
 */
const saveSetting = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        console.log(`saveSetting: 設定を保存しました - ${key}:`, value);
    } catch (error) {
        console.error(`saveSetting: 設定の保存に失敗しました - ${key}:`, error);
    }
};

/**
 * 設定を取得する関数
 * @param {string} key - 設定キー
 * @param {any} defaultValue - デフォルト値
 * @returns {any} 取得した値またはデフォルト値
 */
const getSetting = (key, defaultValue = null) => {
    try {
        const value = localStorage.getItem(key);
        if (value === null) {
            return defaultValue;
        }
        
        // JSONとして解析を試行
        try {
            return JSON.parse(value);
        } catch (parseError) {
            // JSON解析に失敗した場合、文字列として返す
            return value;
        }
    } catch (error) {
        console.error(`getSetting: 設定の取得に失敗しました - ${key}:`, error);
        return defaultValue;
    }
};

/**
 * ブール値の設定を取得する関数
 * @param {string} key - 設定キー
 * @param {boolean} defaultValue - デフォルト値
 * @returns {boolean} 取得したブール値
 */
const getBooleanSetting = (key, defaultValue = true) => {
    const value = getSetting(key, defaultValue);
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value !== 'false';
    }
    return defaultValue;
};

/**
 * 設定を削除する関数
 * @param {string} key - 設定キー
 */
const removeSetting = (key) => {
    try {
        localStorage.removeItem(key);
        console.log(`removeSetting: 設定を削除しました - ${key}`);
    } catch (error) {
        console.error(`removeSetting: 設定の削除に失敗しました - ${key}:`, error);
    }
};

/**
 * 通知を表示する関数
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 通知タイプ ('success', 'error', 'warning', 'info')
 * @param {number} duration - 表示時間（ミリ秒、デフォルト: 3000）
 * @param {Object} options - 追加オプション
 */
const showNotification = (message, type = 'info', duration = 3000, options = {}) => {
    const {
        position = 'top-right',
        showIcon = true,
        onClose = null
    } = options;

    // 既存の通知を削除
    const existingNotifications = document.querySelectorAll('.notification-toast');
    existingNotifications.forEach(notification => {
        if (notification.dataset.message === message) {
            notification.remove();
        }
    });

    // 通知要素を作成
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.dataset.message = message;
    
    // タイプに応じたスタイルを設定
    const typeStyles = {
        success: {
            background: '#10b981',
            color: '#ffffff',
            icon: '✓'
        },
        error: {
            background: '#ef4444',
            color: '#ffffff',
            icon: '✕'
        },
        warning: {
            background: '#f59e0b',
            color: '#ffffff',
            icon: '⚠'
        },
        info: {
            background: '#3b82f6',
            color: '#ffffff',
            icon: 'ℹ'
        }
    };

    const style = typeStyles[type] || typeStyles.info;

    // 位置に応じたスタイルを設定
    const positionStyles = {
        'top-right': {
            top: '20px',
            right: '20px',
            transform: 'translateX(100%)'
        },
        'top-left': {
            top: '20px',
            left: '20px',
            transform: 'translateX(-100%)'
        },
        'bottom-right': {
            bottom: '20px',
            right: '20px',
            transform: 'translateX(100%)'
        },
        'bottom-left': {
            bottom: '20px',
            left: '20px',
            transform: 'translateX(-100%)'
        },
        'top-center': {
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-100%)'
        },
        'bottom-center': {
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(100%)'
        }
    };

    const posStyle = positionStyles[position] || positionStyles['top-right'];

    // スタイルを適用
    Object.assign(notification.style, {
        position: 'fixed',
        ...posStyle,
        background: style.background,
        color: style.color,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '10000',
        maxWidth: '300px',
        wordWrap: 'break-word',
        opacity: '0',
        transition: 'all 0.3s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    });

    // アイコンとメッセージを設定
    notification.innerHTML = `
        ${showIcon ? `<span style="font-size: 16px; font-weight: bold;">${style.icon}</span>` : ''}
        <span>${message}</span>
    `;

    // ドキュメントに追加
    document.body.appendChild(notification);

    // アニメーション開始
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = posStyle.transform.replace('100%', '0%').replace('-100%', '0%');
    }, 10);

    // 自動削除
    const timeoutId = setTimeout(() => {
        closeNotification(notification);
    }, duration);

    // クリックで閉じる
    notification.addEventListener('click', () => {
        clearTimeout(timeoutId);
        closeNotification(notification);
    });

    // ホバーで一時停止
    let isHovered = false;
    notification.addEventListener('mouseenter', () => {
        isHovered = true;
        clearTimeout(timeoutId);
    });

    notification.addEventListener('mouseleave', () => {
        isHovered = false;
        const newTimeoutId = setTimeout(() => {
            if (!isHovered) {
                closeNotification(notification);
            }
        }, 1000);
    });

    return notification;
};

/**
 * 通知を閉じる関数
 * @param {HTMLElement} notification - 通知要素
 */
const closeNotification = (notification) => {
    if (!notification || !notification.parentNode) return;

    notification.style.opacity = '0';
    notification.style.transform = notification.style.transform.replace('0%', '100%');
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300);
};

// 便利な関数
const showSuccessNotification = (message, duration = 3000) => {
    return showNotification(message, 'success', duration);
};

const showErrorNotification = (message, duration = 5000) => {
    return showNotification(message, 'error', duration);
};

const showWarningNotification = (message, duration = 4000) => {
    return showNotification(message, 'warning', duration);
};

const showInfoNotification = (message, duration = 3000) => {
    return showNotification(message, 'info', duration);
};

/**
 * 確認ダイアログを表示する関数
 * @param {string} message - 確認メッセージ
 * @param {string} title - ダイアログのタイトル（デフォルト: '確認'）
 * @param {Object} options - オプション設定
 * @returns {Promise<boolean>} ユーザーの選択（true: OK, false: キャンセル）
 */
const showConfirmDialog = (message, title = '確認', options = {}) => {
    return new Promise((resolve) => {
        const {
            okText = 'OK',
            cancelText = 'キャンセル',
            okButtonClass = 'confirm-ok',
            cancelButtonClass = 'confirm-cancel'
        } = options;

        // 既存の確認ダイアログがあれば削除
        const existingDialog = document.getElementById('confirm-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // ダイアログ要素を作成
        const dialog = document.createElement('div');
        dialog.id = 'confirm-dialog';
        dialog.className = 'confirm-dialog';
        
        // オーバーレイを作成
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        
        // ダイアログコンテンツを作成
        const content = document.createElement('div');
        content.className = 'confirm-content';
        
        // スタイルを適用
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: '10001',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            transition: 'opacity 0.3s ease-in-out'
        });

        Object.assign(content.style, {
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            transform: 'scale(0.95)',
            transition: 'transform 0.3s ease-in-out',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        // HTMLコンテンツを設定
        content.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">${title}</h3>
            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #4b5563;">${message}</p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="${cancelButtonClass}" style="
                    padding: 8px 16px;
                    border: 1px solid #d1d5db;
                    background: #ffffff;
                    color: #374151;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                ">${cancelText}</button>
                <button class="${okButtonClass}" style="
                    padding: 8px 16px;
                    border: none;
                    background: #3b82f6;
                    color: #ffffff;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                ">${okText}</button>
            </div>
        `;

        // 要素を組み立て
        overlay.appendChild(content);
        dialog.appendChild(overlay);
        document.body.appendChild(dialog);

        // アニメーション開始
        setTimeout(() => {
            overlay.style.opacity = '1';
            content.style.transform = 'scale(1)';
        }, 10);

        // ボタンイベントリスナー
        const okButton = content.querySelector(`.${okButtonClass}`);
        const cancelButton = content.querySelector(`.${cancelButtonClass}`);

        // OKボタンに自動フォーカス
        setTimeout(() => {
            okButton.focus();
        }, 50);

        const closeDialog = (result) => {
            // イベントリスナーを削除
            document.removeEventListener('keydown', handleKeydown);
            
            overlay.style.opacity = '0';
            content.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.remove();
                }
                resolve(result);
            }, 300);
        };

        okButton.addEventListener('click', () => closeDialog(true));
        cancelButton.addEventListener('click', () => closeDialog(false));

        // オーバーレイクリックでキャンセル
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeDialog(false);
            }
        });

        // キーボードイベント
        const handleKeydown = (event) => {
            if (event.key === 'Enter') {
                // フォーカス中の要素で判定
                const active = document.activeElement;
                if (active === okButton) {
                    closeDialog(true);
                } else if (active === cancelButton) {
                    closeDialog(false);
                } else {
                    closeDialog(true);
                }
            } else if (event.key === 'Escape') {
                closeDialog(false);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
};

// グローバル関数として公開
window.savePlaybackPosition = savePlaybackPosition;
window.getPlaybackPosition = getPlaybackPosition;
window.saveFavorite = saveFavorite;
window.getFavorites = getFavorites;
window.readTitleAloud = readTitleAloud;
window.clearVideoElements = clearVideoElements;
window.removeIntroAndOutro = removeIntroAndOutro;
window.isSameDate = isSameDate;
window.fetchWithCache = fetchWithCache;
window.waitForElement = waitForElement;
window.waitForCondition = waitForCondition;
window.createModalPanel = createModalPanel;
window.closeModalPanel = closeModalPanel;
window.saveSetting = saveSetting;
window.getSetting = getSetting;
window.getBooleanSetting = getBooleanSetting;
window.removeSetting = removeSetting;
window.showNotification = showNotification;
window.closeNotification = closeNotification;
window.showSuccessNotification = showSuccessNotification;
window.showErrorNotification = showErrorNotification;
window.showWarningNotification = showWarningNotification;
window.showInfoNotification = showInfoNotification;
window.showConfirmDialog = showConfirmDialog;

// 初期化完了を通知
console.log('helpers.js: 共通関数の初期化が完了しました');
window.helpersInitialized = true;