
/**
 * キャッシュ付きのAPIリクエストを行う関数
 * @param {string} url - APIのURL
 * @param {string} cacheKey - キャッシュのキー
 * @returns {Promise<Object|null>} 取得またはキャッシュされたJSONデータ、またはnull
 */
const fetchWithCache = async (url, cacheKey, minute=720) => {
    // 1. 最初にキャッシュされたデータを確認
    const result = await chrome.storage.local.get([cacheKey]);
    const cachedData = result[cacheKey];

    // 1.cachedData.dataが空でなく、かつ、timestampが当日のものであれば、それを返す
    if (cachedData && cachedData.data && cachedData.timestamp) {
        // cachedDataが空の場合はネットワークから取得
        if (cachedData.data.error || cachedData.data === null) {
            // console.warn(`fetchWithCache: ${cacheKey} のキャッシュはエラーまたはnullです。ネットワークからデータ取得を試行中...`);
        } else if (cachedData.data.length === 0) {
        }else if(cachedData.timestamp && (new Date().getTime() - new Date(cachedData.timestamp).getTime()) < minute * 60 * 1000) {
            return cachedData.data;
        } else {
        }
    }
    // 2. 当日のキャッシュがない場合のみネットワークリクエストを試みる
    const fetchResult = await fetchFromNetwork(url);
    if (fetchResult) {
        // 2. データをキャッシュに保存
        const cacheData = {
            data: fetchResult,
            timestamp: new Date().toISOString()
        };
        await chrome.storage.local.set({ [cacheKey]: cacheData });
        return fetchResult;
    }
    // 3. 古いキャッシュがあれば、それを返す
    if (cachedData && cachedData.data) {
        return cachedData.data;
    }
    // 4. 古いキャッシュもない場合は、nullを返す
    // console.warn(`fetchWithCache: ${cacheKey} のキャッシュされたデータも見つかりませんでした。`);
    return null;
};
/**
 * ページ全体で共有する同時実行数ゲートを作る。
 * runWithConcurrencyLimitは1回の呼び出し内でしか同時実行数を制限できないため、
 * IntersectionObserverなどにより「独立した呼び出し元」が同時多発するケース
 * （例: 画面内の科目フォルダが一度に10件以上検知され、それぞれが個別に
 * リクエストを投げ始める）では、呼び出し元ごとの制限を足し合わせた分だけ
 * 実際の同時リクエスト数が増えてしまう。createConcurrencyGateは呼び出し元を
 * またいで1つの上限を共有するためのユーティリティ。
 * @param {number} limit - ページ全体での同時実行数の上限
 * @returns {{ run: (fn: () => Promise<any>) => Promise<any> }}
 */
const createConcurrencyGate = (limit) => {
    let active = 0;
    const queue = [];
    const runNext = () => {
        if (active >= limit || queue.length === 0) return;
        active++;
        const { fn, resolve, reject } = queue.shift();
        fn().then(
            (value) => { active--; resolve(value); runNext(); },
            (error) => { active--; reject(error); runNext(); }
        );
    };
    return {
        run(fn) {
            return new Promise((resolve, reject) => {
                queue.push({ fn, resolve, reject });
                runNext();
            });
        },
    };
};
const fetchFromNetwork = async (url) => {
    try {
        const response = await fetch(url);
        return response.json();
    } catch (error) {
        // 50ms待ってからリトライ
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
            const response = await fetch(url);
            return response.json();
        } catch (error) {
            console.warn(`fetchFromNetwork: ${url} のネットワークからのデータ取得に失敗しました。エラー: ${error.message}`);
            return null;
        }
    }
};
const fetchWithoutCache = async (url,cacheKey) => {
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            // 成功した場合のみキャッシュを更新
            const cacheData = {
                data: data,
                timestamp: new Date().toISOString()
            };
            await chrome.storage.local.set({ [cacheKey]: cacheData });
            return data;
        }
        return response.json();
    } catch (error) {
        console.warn(`fetchWithoutCache: ${url} のネットワークからのデータ取得に失敗しました。エラー: ${error.message}`);
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
            callback(element);
            return;
        }
        
        if (maxAttempts && attempts >= maxAttempts) {
            // console.warn(`waitForElement: 最大試行回数に達しました: ${selector}`);
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
            callback();
            return;
        }
        
        if (maxAttempts && attempts >= maxAttempts) {
            // console.warn('waitForCondition: 最大試行回数に達しました');
            return;
        }
        
        setTimeout(checkCondition, interval);
    };
    
    checkCondition();
};


/**
 * 設定を保存する関数
 * @param {string} key - 設定キー
 * @param {any} value - 保存する値
 */
const saveSetting = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // console.error(`saveSetting: 設定の保存に失敗しました - ${key}:`, error);
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
        // console.error(`getSetting: 設定の取得に失敗しました - ${key}:`, error);
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
 * 科目別設定を取得する関数。
 * `${baseKey}_${categoryId}`（科目別）があればそれを、なければ全体設定を返す
 * @param {string} baseKey - 設定のベースキー（例: 'playbackSpeed'）
 * @param {string|number} categoryId - 科目のカテゴリID
 * @param {any} defaultValue - どちらも未設定の場合のデフォルト値
 */
const getPerCourseSetting = (baseKey, categoryId, defaultValue = null) => {
    if (categoryId) {
        const perCourse = getSetting(`${baseKey}_${categoryId}`, null);
        if (perCourse !== null) return perCourse;
    }
    return getSetting(baseKey, defaultValue);
};

/**
 * 科目別設定を保存する関数。
 * 科目別キーと全体キーの両方に保存する。「最後に設定した値が他科目のデフォルトになり、
 * 明示的に設定したことのある科目は自分の値を覚え続ける」という動きになる
 * @param {string} baseKey - 設定のベースキー
 * @param {string|number} categoryId - 科目のカテゴリID（無ければ全体のみ保存）
 * @param {any} value - 保存する値
 */
const savePerCourseSetting = (baseKey, categoryId, value) => {
    // window.saveSetting（menu.js等が差し替えたラッパー）経由で保存する。
    // モジュール内の素のsaveSettingを直接呼ぶと、再生ページ側のキャッシュ更新ラッパー等を
    // 通らないため、必ず公開APIのwindow.saveSettingを使う。
    const save = (typeof window !== 'undefined' && window.saveSetting) ? window.saveSetting : saveSetting;
    if (categoryId) {
        save(`${baseKey}_${categoryId}`, value);
    }
    save(baseKey, value);
};

/**
 * 設定を削除する関数
 * @param {string} key - 設定キー
 */
const removeSetting = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        // console.error(`removeSetting: 設定の削除に失敗しました - ${key}:`, error);
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

const trimTitle = (title) => {
    // タイトルの先頭の"第01回 "等の部分を削除
    title = title.replace(/^(第[0-9０-９]+回\s*)+/, '') 
    return title;
};

const trimCourseName = (courseName) => {
    // 科目名の先頭の"01 "等の部分を削除
    courseName = courseName.replace(/^[0-9]+\s*/, '');
    // 科目名の末尾の" 123456a"等の部分を削除
    courseName = courseName.replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
    // 科目名最後の"（’１８）"等の部分を削除する
    courseName = courseName.replace(/（’[0-9０-９]+）/, '');
    return courseName;
}

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

/**
 * 1行テキスト入力ダイアログを表示する関数（しおりのメモ入力などに使用）
 * @param {string} message - 説明メッセージ
 * @param {string} title - ダイアログのタイトル
 * @param {Object} options - { placeholder, defaultValue, okText, cancelText }
 * @returns {Promise<string|null>} 入力文字列（キャンセル時はnull）
 */
const showPromptDialog = (message, title = '入力', options = {}) => {
    return new Promise((resolve) => {
        const {
            placeholder = '',
            defaultValue = '',
            okText = 'OK',
            cancelText = 'キャンセル'
        } = options;

        // 既存のダイアログがあれば削除
        const existingDialog = document.getElementById('prompt-dialog');
        if (existingDialog) existingDialog.remove();

        const dialog = document.createElement('div');
        dialog.id = 'prompt-dialog';

        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0, 0, 0, 0.5)', zIndex: '10001',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: '0', transition: 'opacity 0.3s ease-in-out'
        });

        const content = document.createElement('div');
        Object.assign(content.style, {
            background: '#ffffff', borderRadius: '12px', padding: '24px',
            maxWidth: '400px', width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            transform: 'scale(0.95)', transition: 'transform 0.3s ease-in-out',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        content.innerHTML = `
            <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1f2937;">${title}</h3>
            <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #4b5563;">${message}</p>
            <input type="text" class="prompt-input" placeholder="${placeholder.replace(/"/g, '&quot;')}" style="
                width: 100%; box-sizing: border-box; padding: 8px 12px; margin-bottom: 20px;
                border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; color: #1f2937;">
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="prompt-cancel" style="padding: 8px 16px; border: 1px solid #d1d5db; background: #ffffff; color: #374151; border-radius: 6px; font-size: 14px; cursor: pointer;">${cancelText}</button>
                <button class="prompt-ok" style="padding: 8px 16px; border: none; background: #3b82f6; color: #ffffff; border-radius: 6px; font-size: 14px; cursor: pointer;">${okText}</button>
            </div>
        `;

        overlay.appendChild(content);
        dialog.appendChild(overlay);
        document.body.appendChild(dialog);

        const input = content.querySelector('.prompt-input');
        input.value = defaultValue;

        setTimeout(() => {
            overlay.style.opacity = '1';
            content.style.transform = 'scale(1)';
            input.focus();
        }, 10);

        const closeDialog = (result) => {
            document.removeEventListener('keydown', handleKeydown);
            overlay.style.opacity = '0';
            content.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (dialog.parentNode) dialog.remove();
                resolve(result);
            }, 300);
        };

        content.querySelector('.prompt-ok').addEventListener('click', () => closeDialog(input.value));
        content.querySelector('.prompt-cancel').addEventListener('click', () => closeDialog(null));
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeDialog(null);
        });

        const handleKeydown = (event) => {
            if (event.key === 'Enter') {
                closeDialog(input.value);
            } else if (event.key === 'Escape') {
                closeDialog(null);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
};

// 画面種別を判定する関数
async function detectOujPageType(url) {
    // ログイン画面
    if (url.includes('://sso.ouj.ac.jp/cas/login')) {
        return {subDomain: 'sso', referTo: await detectOujPageType(decodeURLComponentSafe(url))};
    }
    // システムWAKABA
    if (url.includes('://www.wakaba.ouj.ac.jp/')){
        return {subDomain: 'wakaba'};
    }
    // WEB通信指導
    if (url.includes('://tsushin.ouj.ac.jp/')){
        return {subDomain: 'tsushin'};
    }
    // WEB単位認定試験
    if (url.includes('://shiken.ouj.ac.jp/')){
        return {subDomain: 'shiken'};
    }
    // オンライン授業
    if (url.includes('://online.ouj.ac.jp/')){
        return {subDomain: 'online'};
    }
    // ライブWEB授業
    if (url.includes('://live.ouj.ac.jp/')){
        return {subDomain: 'live'};
    }
    // 自己学習サイト
    if (url.includes('://sls.ouj.ac.jp/')){
        return {subDomain: 'sls'};
    }
    // 看護師国家試験対策
    if (url.includes('://nurse.ouj.ac.jp/')){
        return {subDomain: 'nurse'};
    }
    // 印刷教材試し読み、過去問、修士論文
    if (url.includes('://info.ouj.ac.jp/')){
        // 印刷教材試し読み
        if (url.includes('modules/kyozaipdf/')){
            return {subDomain: 'info', page: 'kyozaipdf'};
        }
        // 過去問
        if (url.includes('modules/html/mondai/')){
            return {subDomain: 'info', page: 'mondai'};
        }
        // 過去問（学部）
        if (url.includes('gakubu/')){
            return {subDomain: 'info', page: 'gakubu'};
        }
        // 過去問（大学院）
        if (url.includes('daigakuin/')){
            return {subDomain: 'info', page: 'daigakuin'};
        }
        // 過去問（司書）
        if (url.includes('shisho/')){
            return {subDomain: 'info', page: 'shisho'};
        }
        // 修士論文
        if (url.includes('modules/inronbun/')){
            return {subDomain: 'info', page: 'inronbun'};
        }
        return {subDomain: 'info', page: 'unknown'};
    }
    // 動画配信サービス
    if (url.includes('://v.ouj.ac.jp/')){
        // ホームページ
        if (url.includes('://v.ouj.ac.jp/view/ouj/#/navi/home')) {
            return {subDomain: 'v', page: 'home'};
        }
        // 動画再生画面
        if (url.includes('://v.ouj.ac.jp/view/ouj/#/navi/player?co=')
            || url.includes('://v.ouj.ac.jp/view/ouj/#/navi/player&co=')) {
            return {subDomain: 'v', page: 'player'};
        }
        // 検索結果
        if (url.includes('://v.ouj.ac.jp/view/ouj/#/navi/vod?se=')
            || url.includes('://v.ouj.ac.jp/view/ouj/#/navi/vod&se=')) {
            return {subDomain: 'v', page: 'search-result'};
        }

        // 怪しい例：
        // 検索結果からの動画
        // co=36739&ct=V&se=英語&ca=30648
        // VOD画面以外はここで終了
        if (!url.includes('://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=')
            && !url.includes('://v.ouj.ac.jp/view/ouj/#/navi/vod&ca=')) {
            return {subDomain: 'v', page: 'other'};
        }

        const categoryId = window.getCurrentCategoryId(url);
        try {
            const parentIds = await window.categoriesUsedAsParent(url);
            if (parentIds.includes(categoryId)) {
            return {subDomain: 'v', page: 'series-select', categoryId: categoryId}; // 科目一覧（科目群選択後）
            }
        } catch (e) {
            console.error('[OUJ拡張] parentCategoriesの取得に失敗:', e);
        }

        // フォールバック判定: カテゴリIDの範囲で判定
        if (categoryId < 100 || (categoryId > 480 && categoryId < 500)) {
            return {subDomain: 'v', page: 'series-select', categoryId: categoryId};
        }
        const contentId = window.getCurrentContentId(url);
        return {subDomain: 'v', page: 'video-select', categoryId: categoryId, contentId: contentId}; // 動画一覧
    }
    return {subDomain: 'unknown', page: 'unknown'};
}

function decodeURLComponentSafe(url) {
    const stringtoDelete = url.split('=')[0] + '=';
    const encodedStr = url.replace(stringtoDelete, '');
    try {
        const decodedStr = decodeURIComponent(encodedStr);
        if (decodedStr.includes('%')) {
            return decodeURLComponentSafe(decodedStr);
        }
        return decodedStr;
    } catch (error) {
        return encodedStr; // デコードに失敗した場合は元の文字列を返す
    }
}

/*
システムWAKABA
https://www.wakaba.ouj.ac.jp/portal/home/home/display?&taglib.html.TOKEN=e6e2f37a40d81eebffa7d2ba4dd08fdc
WEB通信指導
https://tsushin.ouj.ac.jp/
WEB単位認定試験
https://shiken.ouj.ac.jp/
印刷教材試し読み
https://info.ouj.ac.jp/ouj/modules/kyozaipdf/kyozaipdf.html
過去問
https://info.ouj.ac.jp/ouj/modules/html/mondai.html
修士論文
https://info.ouj.ac.jp/ouj/modules/inronbun/inronbun.html
オンライン授業
https://online.ouj.ac.jp/
ライブWEB授業
https://live.ouj.ac.jp/login/index.php?loginredirect=1
自己学習サイト
https://sls.ouj.ac.jp/webclass/?acs_=90f7e8c8
看護師国家試験対策
https://nurse.ouj.ac.jp/webclass/login.php
**/

// グローバル関数として公開
window.fetchWithCache = fetchWithCache;
window.createConcurrencyGate = createConcurrencyGate;
window.waitForElement = waitForElement;
window.waitForCondition = waitForCondition;
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
window.showPromptDialog = showPromptDialog;
window.getPerCourseSetting = getPerCourseSetting;
window.savePerCourseSetting = savePerCourseSetting;
window.trimTitle = trimTitle;
window.trimCourseName = trimCourseName;
window.detectOujPageType = detectOujPageType;
window.decodeURLComponentSafe = decodeURLComponentSafe;