const optionsForm = document.getElementById('options-form');
const speedInput = document.getElementById('playback-speed');
const favoritesInput = document.getElementById('favorites');
const saveButton = document.getElementById('save-options');

// Load saved options
function loadOptions() {
    chrome.storage.sync.get(['playbackSpeed', 'favorites'], (data) => {
        if (data.playbackSpeed) {
            speedInput.value = data.playbackSpeed;
        }
        if (data.favorites) {
            favoritesInput.value = data.favorites.join(', ');
        }
    });
}

// Save options
function saveOptions() {
    const playbackSpeed = speedInput.value;
    const favorites = favoritesInput.value.split(',').map(item => item.trim());

    chrome.storage.sync.set({
        playbackSpeed: playbackSpeed,
        favorites: favorites
    }, () => {
        if (typeof window.showSuccessNotification === 'function') {
            window.showSuccessNotification('設定が保存されました！', 3000);
        } else {
            alert('設定が保存されました！');
        }
    });
}

// Event listeners
saveButton.addEventListener('click', saveOptions);
document.addEventListener('DOMContentLoaded', loadOptions);