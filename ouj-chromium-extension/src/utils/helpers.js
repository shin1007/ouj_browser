const savePlaybackPosition = (position) => {
    localStorage.setItem('playbackPosition', position);
};

const getPlaybackPosition = () => {
    return localStorage.getItem('playbackPosition') || 0;
};

const saveFavorite = (videoId) => {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    if (!favorites.includes(videoId)) {
        favorites.push(videoId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
};

const getFavorites = () => {
    return JSON.parse(localStorage.getItem('favorites')) || [];
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

// グローバル関数として公開
window.savePlaybackPosition = savePlaybackPosition;
window.getPlaybackPosition = getPlaybackPosition;
window.saveFavorite = saveFavorite;
window.getFavorites = getFavorites;
window.readTitleAloud = readTitleAloud;
window.clearVideoElements = clearVideoElements;
window.removeIntroAndOutro = removeIntroAndOutro;