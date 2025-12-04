

const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const songTitle = document.getElementById('songTitle');
const artistName = document.getElementById('artistName');
const albumCover = document.getElementById('albumCover');
const progress = document.getElementById('progress');
const progressBar = document.querySelector('.progress-bar');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const playlistContainer = document.getElementById('playlist');
const recentlyPlayedContainer = document.getElementById('recentlyPlayed');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchAlbumsBtn = document.getElementById('searchAlbumsBtn');
const songsTab = document.getElementById('songsTab');
const albumsTab = document.getElementById('albumsTab');
const playlistSection = document.getElementById('playlistSection');
const albumsSection = document.getElementById('albumsSection');
const albumDetailsSection = document.getElementById('albumDetailsSection');


/**
 * Функция debounce для уменьшения частоты вызовов
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}
const albumsList = document.getElementById('albumsList');
const backToAlbumsBtn = document.getElementById('backToAlbumsBtn');
const albumDetailsContainer = document.getElementById('albumDetailsContainer');



let currentSongIndex = 0;
let playlist = [];
let isPlaying = false;
let recentlyPlayed = [];
let currentAlbumTracks = [];
let isAlbumMode = false;



document.addEventListener('DOMContentLoaded', async () => {
    logAPI('Инициализация приложения...');
    
    // Загружаем плейлист
    await loadPlaylist();
    
    // Загружаем историю из localStorage
    loadRecentlyPlayed();
    
    // Устанавливаем первую песню
    if (playlist.length > 0) {
        loadSong(0);
    }
});



/**
 * Безопасное экранирование HTML специальных символов
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Загрузить плейлист из API
 */
async function loadPlaylist() {
    try {
        playlistContainer.innerHTML = '<p class="loading">Загрузка песен...</p>';
        
        // Сначала пытаемся получить топ-треки из Spotify
        let topTracks = await musicAPI.getSpotifyTopTracks();
        
        if (topTracks && topTracks.length > 0) {
            playlist = topTracks;
            console.log('Загружены топ-треки Spotify:', topTracks.length);
        } else {
            // Если не удалось получить Spotify треки, загружаем локальный плейлист
            playlist = await musicAPI.getAllSongs();
            console.log('Загружены локальные песни:', playlist.length);
        }
        
        if (!playlist || playlist.length === 0) {
            playlistContainer.innerHTML = '<p class="empty">Плейлист пуст</p>';
            return;
        }

        displayPlaylist(playlist);
        currentSongIndex = 0;
        if (playlist.length > 0) {
            loadSong(0);
        }
        
        logAPI('Плейлист загружен', playlist.length + ' песен');
    } catch (error) {
        console.error('Ошибка загрузки плейлиста:', error);
        logAPI('Ошибка загрузки плейлиста:', error);
        
        // Fallback на локальный плейлист
        try {
            playlist = await musicAPI.getAllSongs();
            displayPlaylist(playlist);
            if (playlist.length > 0) {
                loadSong(0);
            }
        } catch (e) {
            console.error('Ошибка fallback:', e);
            playlistContainer.innerHTML = '<p class="empty">Ошибка загрузки плейлиста</p>';
        }
    }
}

/**
 * Вывести плейлист на экран
 */
function displayPlaylist(songs) {
    playlistContainer.innerHTML = '';
    
    if (songs.length === 0) {
        playlistContainer.innerHTML = '<p class="empty">Песни не найдены</p>';
        return;
    }

    console.log('Количество песен для отображения:', songs.length);
    console.log('Первые 3 песни:', songs.slice(0, 3));

    let validSongCount = 0;

    songs.forEach((song, index) => {
        // Проверяем, что все необходимые поля есть
        if (!song || !song.title) {
            console.warn('Пропуск песни индекс ' + index + ', отсутствуют данные:', song);
            return;
        }

        validSongCount++;

        const songElement = document.createElement('div');
        songElement.className = 'playlist-item';
        if (index === currentSongIndex) {
            songElement.classList.add('active');
        }

        const title = song.title || 'Неизвестная песня';
        const artist = song.artist || 'Неизвестный исполнитель';
        const duration = song.duration ? formatTime(song.duration) : '0:00';

        songElement.innerHTML = `
            <div class="playlist-item-info">
                <div class="playlist-item-title">${escapeHtml(title)}</div>
                <div class="playlist-item-artist">${escapeHtml(artist)}</div>
            </div>
            <div class="playlist-item-duration">${duration}</div>
        `;

        songElement.addEventListener('click', () => {
            loadSong(index);
            playAudio();
        });

        playlistContainer.appendChild(songElement);
    });

    console.log('Плейлист отображен, валидных песен:', validSongCount, 'из', songs.length);
    logAPI('Плейлист отображен, песен:', validSongCount);

    logAPI('Плейлист отображен, песен:', validSongCount);
}

/**
 * Загрузить песню по индексу
 */
function loadSong(index) {
    if (index < 0 || index >= playlist.length) {
        console.warn('Невалидный индекс песни:', index);
        return;
    }

    currentSongIndex = index;
    const song = playlist[index];

    // Проверяем наличие данных
    if (!song) {
        console.warn('Песня не найдена по индексу:', index);
        return;
    }

    const title = song.title || 'Неизвестная песня';
    const artist = song.artist || 'Неизвестный исполнитель';
    const cover = song.cover || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22300%22/%3E%3C/svg%3E';
    const url = song.url;
    const duration = song.duration || 0;

    console.log('Загруженная песня:', { title, artist, url, duration });

    songTitle.textContent = title;
    artistName.textContent = artist;
    albumCover.src = cover;
    albumCover.onerror = () => {
        albumCover.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22300%22/%3E%3C/svg%3E';
    };
    
    if (url) {
        audioPlayer.src = url;
    } else {
        console.warn('Предпросмотр недоступен для песни:', title);
        audioPlayer.src = '';
        // Показываем уведомление что у песни нет превью
        const notif = document.createElement('div');
        notif.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #FF6B6B; color: white; padding: 15px 20px; border-radius: 5px; z-index: 1000; font-size: 14px;';
        notif.textContent = `⚠️ ${title} - предпросмотр недоступен`;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }
    
    durationEl.textContent = formatTime(duration);

    // Обновляем активный элемент в плейлисте
    document.querySelectorAll('.playlist-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    logAPI('Загружена песня:', title);
}



/**
 * Воспроизвести аудио
 */
function playAudio() {
    audioPlayer.play();
    isPlaying = true;
    playBtn.textContent = '⏸️ Пауза';
    playBtn.classList.add('playing');
    albumCover.classList.add('playing');
    albumCover.classList.remove('paused');
    logAPI('Воспроизведение начато');
}

/**
 * Пауза аудио
 */
function pauseAudio() {
    audioPlayer.pause();
    isPlaying = false;
    playBtn.textContent = '▶️ Играть';
    playBtn.classList.remove('playing');
    albumCover.classList.add('paused');
    albumCover.classList.remove('playing');
    logAPI('Пауза');
}

/**
 * Переключение воспроизведения/паузы
 */
function togglePlayPause() {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
}

/**
 * Следующая песня
 */
function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % playlist.length;
    loadSong(currentSongIndex);
    playAudio();
}

/**
 * Предыдущая песня
 */
function previousSong() {
    if (audioPlayer.currentTime > 5) {
        // Если прошло более 5 секунд, вернуться в начало текущей песни
        audioPlayer.currentTime = 0;
    } else {
        // Иначе перейти к предыдущей песне
        currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
        loadSong(currentSongIndex);
        playAudio();
    }
}


// Кнопки управления
playBtn.addEventListener('click', togglePlayPause);
nextBtn.addEventListener('click', nextSong);
prevBtn.addEventListener('click', previousSong);

// Автоматическая смена песни при окончании
audioPlayer.addEventListener('ended', () => {
    nextSong();
});

// Обновление прогресса
audioPlayer.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audioPlayer;
    const percent = (currentTime / duration) * 100;
    progress.style.width = percent + '%';
    currentTimeEl.textContent = formatTime(currentTime);
});

// Получение продолжительности
audioPlayer.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audioPlayer.duration);
});

// Клик по полоске прогресса
progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
});

// Выполнить поиск
async function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        loadPlaylist();
        return;
    }

    try {
        // Показываем индикатор загрузки
        playlistContainer.innerHTML = '<div class="loading-spinner"></div><p class="loading">Поиск...</p>';
        logAPI('Поиск:', query);

        let results = [];

        // Ищем в iTunes
        try {
            const itunesResults = await musicAPI.searchWithItunes(query);
            if (itunesResults && itunesResults.length > 0) {
                results = itunesResults;
                console.log('Результаты iTunes:', itunesResults.length);
            }
        } catch (e) {
            console.warn('Ошибка поиска iTunes:', e);
        }

        // Если мало результатов, ищем в локальных песнях
        if (results.length < 5) {
            try {
                const localResults = await musicAPI.searchSongs(query);
                if (localResults && localResults.length > 0) {
                    results = results.concat(localResults);
                    console.log('Локальные результаты:', localResults.length);
                }
            } catch (e) {
                console.warn('Ошибка локального поиска:', e);
            }
        }

        // Фильтруем дубликаты по названию и исполнителю
        const uniqueResults = [];
        const seen = new Set();
        
        for (const song of results) {
            const key = `${(song.title || '').toLowerCase()}|${(song.artist || '').toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(song);
            }
        }

        if (uniqueResults.length === 0) {
            playlistContainer.innerHTML = '<p class="empty">Песни не найдены</p>';
            return;
        }

        playlist = uniqueResults;
        currentSongIndex = 0;
        displayPlaylist(playlist);
        loadSong(0);
        
        logAPI('Найдено песен:', uniqueResults.length);
    } catch (error) {
        console.error('Ошибка поиска:', error);
        logAPI('Ошибка поиска:', error);
        playlistContainer.innerHTML = '<p class="empty">Ошибка при поиске</p>';
    }
}

searchBtn.addEventListener('click', performSearch);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});



    /**
     * Поиск альбомов
     */
    async function searchAlbums() {
        const query = searchInput.value.trim();
        
        if (!query) {
            albumsList.innerHTML = '<p class="empty">Введите название альбома или исполнителя</p>';
            return;
        }

        try {
            albumsList.innerHTML = '<p class="loading">Поиск альбомов...</p>';
            logAPI('Поиск альбомов:', query);

            const albums = await musicAPI.searchSpotifyAlbums(query);

            if (albums.length === 0) {
                albumsList.innerHTML = '<p class="empty">Альбомы не найдены</p>';
                return;
            }

            displayAlbumsList(albums);
            logAPI('Найдено альбомов:', albums.length);
        } catch (error) {
            logAPI('Ошибка поиска альбомов:', error);
            albumsList.innerHTML = '<p class="empty">Ошибка при поиске альбомов</p>';
        }
    }

/**
 * Вывести список альбомов
 */
function displayAlbumsList(albums) {
    albumsList.innerHTML = '';
    
    if (!albums || albums.length === 0) {
        albumsList.innerHTML = '<p class="empty">Альбомы не найдены</p>';
        return;
    }

    console.log('Отображение альбомов:', albums.length);

    albums.forEach((album, index) => {
        // Проверяем наличие необходимых данных
        if (!album || !album.title) {
            console.warn('Пропуск альбома, отсутствуют данные:', album);
            return;
        }

        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        
        const title = album.title || 'Неизвестный альбом';
        const artist = album.artist || 'Неизвестный исполнитель';
        const cover = album.cover || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22300%22/%3E%3C/svg%3E';
        const totalTracks = album.totalTracks || 0;
        const releaseYear = album.releaseDate ? album.releaseDate.split('-')[0] : 'N/A';
        
        albumCard.innerHTML = `
            <img src="${cover}" alt="${escapeHtml(title)}" class="album-card-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22300%22/%3E%3C/svg%3E'">
            <div class="album-card-title">${escapeHtml(title)}</div>
            <div class="album-card-artist">${escapeHtml(artist)}</div>
            <div class="album-card-info">${totalTracks} треков • ${releaseYear}</div>
        `;

        albumCard.addEventListener('click', () => {
            loadAlbumDetails(album);
        });

        albumsList.appendChild(albumCard);
    });
    
    console.log('Альбомы успешно отображены');
}

/**
 * Загрузить детали альбома
 */
async function loadAlbumDetails(album) {
    try {
        albumDetailsContainer.innerHTML = '<p class="loading">Загрузка альбома...</p>';
        
        const albumDetails = await musicAPI.getSpotifyAlbumDetails(
            album.collectionId || album.id,
            album.title,
            album.artist
        );
        
        if (!albumDetails) {
            albumDetailsContainer.innerHTML = '<p class="empty">Не удалось загрузить альбом</p>';
            return;
        }

        displayAlbumDetails(albumDetails);
        currentAlbumTracks = albumDetails.tracks;
        isAlbumMode = true;
        
        // Показываем раздел с деталями альбома
        playlistSection.style.display = 'none';
        albumsSection.style.display = 'none';
        albumDetailsSection.style.display = 'block';
        
        logAPI('Альбом загружен:', albumDetails.title);
    } catch (error) {
        logAPI('Ошибка загрузки альбома:', error);
        albumDetailsContainer.innerHTML = '<p class="empty">Ошибка загрузки альбома</p>';
    }
}

/**
 * Вывести детали альбома
 */
function displayAlbumDetails(album) {
    if (!album) {
        albumDetailsContainer.innerHTML = '<p class="empty">Альбом не найден</p>';
        return;
    }

    const title = album.title || 'Неизвестный альбом';
    const artist = album.artist || 'Неизвестный исполнитель';
    const cover = album.cover || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22300%22/%3E%3C/svg%3E';
    const releaseDate = album.releaseDate || 'N/A';
    const totalTracks = album.totalTracks || 0;
    const description = album.description || 'Альбом';

    albumDetailsContainer.innerHTML = `
        <div class="album-details-header">
            <div class="album-details-cover">
                <img src="${cover}" alt="${escapeHtml(title)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22300%22/%3E%3C/svg%3E'">
            </div>
            <div class="album-details-info">
                <h2>${escapeHtml(title)}</h2>
                <p><strong>Исполнитель:</strong> ${escapeHtml(artist)}</p>
                <p><strong>Дата выпуска:</strong> ${escapeHtml(releaseDate)}</p>
                <p><strong>Всего треков:</strong> ${totalTracks}</p>
                <p><strong>Жанр:</strong> ${escapeHtml(description)}</p>
            </div>
        </div>
        <div class="album-tracks">
            <h3>🎵 Треки альбома</h3>
            <div id="albumTracksContainer"></div>
        </div>
    `;

    const tracksContainer = document.getElementById('albumTracksContainer');
    
    if (!album.tracks || album.tracks.length === 0) {
        tracksContainer.innerHTML = '<p class="empty">Предпросмотры недоступны</p>';
        return;
    }

    console.log('Отображение треков альбома:', album.tracks.length);

    album.tracks.forEach((track, index) => {
        if (!track || !track.title) {
            console.warn('Пропуск трека, отсутствуют данные:', track);
            return;
        }

        const trackElement = document.createElement('div');
        trackElement.className = 'album-track-item';
        
        const trackTitle = track.title || 'Неизвестный трек';
        const trackArtist = track.artist || 'Неизвестный исполнитель';
        const trackDuration = track.duration ? formatTime(track.duration) : '0:00';
        const trackNumber = track.trackNumber || index + 1;

        trackElement.innerHTML = `
            <div class="album-track-number">${trackNumber}</div>
            <div class="album-track-info">
                <div class="album-track-title">${escapeHtml(trackTitle)}</div>
                <div class="album-track-artist">${escapeHtml(trackArtist)}</div>
            </div>
            <div class="album-track-duration">${trackDuration}</div>
        `;

        trackElement.addEventListener('click', () => {
            if (track.url) {
                // Переходим в режим воспроизведения альбома
                playlist = album.tracks.filter(t => t && t.url);
                currentSongIndex = playlist.findIndex(t => t.id === track.id);
                if (currentSongIndex === -1) currentSongIndex = 0;
                
                loadSong(currentSongIndex);
                playAudio();
                
                // Показываем обратно плеер
                playlistSection.style.display = 'block';
                albumsSection.style.display = 'none';
                albumDetailsSection.style.display = 'none';
            } else {
                alert('Предпросмотр для этого трека недоступен');
            }
        });

        tracksContainer.appendChild(trackElement);
    });
    
    console.log('Детали альбома успешно отображены');
}

/**
 * Вернуться к альбомам
 */
function backToAlbums() {
    isAlbumMode = false;
    playlistSection.style.display = 'none';
    albumsSection.style.display = 'block';
    albumDetailsSection.style.display = 'none';
}

/**
 * Переключение вкладок
 */
function switchTab(tabType) {
    if (tabType === 'songs') {
        songsTab.classList.add('active');
        albumsTab.classList.remove('active');
        playlistSection.style.display = 'block';
        albumsSection.style.display = 'none';
        albumDetailsSection.style.display = 'none';
        isAlbumMode = false;
    } else {
        songsTab.classList.remove('active');
        albumsTab.classList.add('active');
        playlistSection.style.display = 'none';
        albumsSection.style.display = 'block';
        albumDetailsSection.style.display = 'none';
    }
}

// Обработчики событий для вкладок
songsTab.addEventListener('click', () => switchTab('songs'));
albumsTab.addEventListener('click', () => switchTab('albums'));

// Обработчик для поиска альбомов
searchAlbumsBtn.addEventListener('click', () => {
    switchTab('albums');
    searchAlbums();
});

// Обработчик для возврата к альбомам
backToAlbumsBtn.addEventListener('click', backToAlbums);

/**
 * Добавить песню в историю
 */
function addToRecentlyPlayed(song) {
    // Удаляем песню если она уже есть
    recentlyPlayed = recentlyPlayed.filter(s => s.id !== song.id);
    
    // Добавляем в начало
    recentlyPlayed.unshift({
        ...song,
        playedAt: new Date().toISOString()
    });
    
    // Ограничиваем до 10 последних песен
    recentlyPlayed = recentlyPlayed.slice(0, 10);
    
    // Сохраняем в localStorage
    saveRecentlyPlayed();
    displayRecentlyPlayed();
    logAPI('Добавлено в историю:', song.title);
}

/**
 * Сохранить историю в localStorage
 */
function saveRecentlyPlayed() {
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
}

/**
 * Загрузить историю из localStorage
 */
function loadRecentlyPlayed() {
    const saved = localStorage.getItem('recentlyPlayed');
    if (saved) {
        recentlyPlayed = JSON.parse(saved);
        displayRecentlyPlayed();
    }
}

/**
 * Вывести историю на экран
 */
function displayRecentlyPlayed() {
    recentlyPlayedContainer.innerHTML = '';
    
    if (!recentlyPlayed || recentlyPlayed.length === 0) {
        recentlyPlayedContainer.innerHTML = '<p class="empty">История слушания пуста</p>';
        return;
    }

    recentlyPlayed.forEach(song => {
        if (!song || !song.title) return;

        const item = document.createElement('div');
        item.className = 'recently-played-item';
        
        const title = song.title || 'Неизвестная песня';
        const artist = song.artist || 'Неизвестный исполнитель';
        const cover = song.cover || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 60%22%3E%3Crect fill=%22%23333%22 width=%2260%22 height=%2260%22/%3E%3C/svg%3E';

        item.innerHTML = `
            <img src="${cover}" alt="${escapeHtml(title)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 60%22%3E%3Crect fill=%22%23333%22 width=%2260%22 height=%2260%22/%3E%3C/svg%3E'">>
            <div class="recently-played-info">
                <div class="recently-played-title">${escapeHtml(title)}</div>
                <div class="recently-played-artist">${escapeHtml(artist)}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            // Ищем песню в текущем плейлисте
            const index = playlist.findIndex(s => s && s.id === song.id);
            if (index !== -1) {
                loadSong(index);
                playAudio();
            } else {
                // Если песни нет в плейлисте, загружаем её отдельно
                if (song.url) {
                    loadSong(0);
                    audioPlayer.src = song.url;
                    songTitle.textContent = title;
                    artistName.textContent = artist;
                    albumCover.src = cover;
                    playAudio();
                }
            }
        });

        recentlyPlayedContainer.appendChild(item);
    });
}

// Добавляем в историю при воспроизведении
audioPlayer.addEventListener('play', () => {
    if (currentSongIndex < playlist.length) {
        addToRecentlyPlayed(playlist[currentSongIndex]);
    }
});



/**
 * Получить рекомендации (можно вызвать по клику кнопки)
 */
async function loadRecommendations() {
    try {
        logAPI('Загрузка рекомендаций...');
        
        // Получаем ID текущих треков для семени
        const seedTracks = playlist.slice(0, 5).map(s => s.id);
        
        // Пытаемся получить рекомендации из Spotify
        let recommendations = await musicAPI.getSpotifyRecommendations(seedTracks);
        
        // Если не удалось, используем локальные рекомендации
        if (!recommendations || recommendations.length === 0) {
            recommendations = await musicAPI.getRecommendations();
        }
        
        playlist = recommendations;
        currentSongIndex = 0;
        displayPlaylist(playlist);
        loadSong(0);
        logAPI('Рекомендации загружены');
    } catch (error) {
        logAPI('Ошибка загрузки рекомендаций:', error);
    }
}

/**
 * Переключение в полноэкранный режим
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    // Проверяем, не находимся ли мы в input поле
    const isInputFocused = document.activeElement.tagName === 'INPUT' || 
                          document.activeElement.tagName === 'TEXTAREA';
    
    switch(e.code) {
        case 'Space':
            if (!isInputFocused) {
                e.preventDefault();
                togglePlayPause();
            }
            break;
        case 'ArrowRight':
            if (!isInputFocused) {
                e.preventDefault();
                nextSong();
            }
            break;
        case 'ArrowLeft':
            if (!isInputFocused) {
                e.preventDefault();
                previousSong();
            }
            break;
    }
});

logAPI('Скрипт полностью загружен');
