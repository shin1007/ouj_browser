/**
 * トースト通知ユーティリティ。
 * showNotification / closeNotification と、
 * success / error / warning / info の便利関数。
 */

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

// グローバル関数として公開
window.showNotification = showNotification;
window.closeNotification = closeNotification;
window.showSuccessNotification = showSuccessNotification;
window.showErrorNotification = showErrorNotification;
window.showWarningNotification = showWarningNotification;
window.showInfoNotification = showInfoNotification;
