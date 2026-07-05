import { openCategoryDetails } from './category-detail.js';

export async function openMaterialDetails(materialId, currentCategoryId, currentCategoryName, currentUserData) {
    const detailContainer = document.getElementById("category-detail-container");
    if (!detailContainer) return;

    detailContainer.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>Загрузка содержимого материала...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/materials/${materialId}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${currentUserData.token}` }
        });

        if (!response.ok) throw new Error("Не удалось загрузить данные материала");
        const material = await response.json();

        const coverSrc = material.cover_url || '../icon/readIcon.png';
        const fileSrc = material.file_url || '#';

        detailContainer.innerHTML = `
            <div class="material-detail-wrapper">
                
                <button id="btn-back-to-materials-list" class="btn-back">← Назад к списку</button>
                
                <div class="material-banner">
                    <img src="${coverSrc}" alt="Обложка">
                </div>

                <div class="material-meta-header">
                    <div class="material-meta-header-top">
                        <h2 class="material-title">${material.title}</h2>
                        <span class="material-type-badge">
                            ${material.type === 'book' ? 'Книга (PDF)' : 'Видеоурок (MP4)'}
                        </span>
                    </div>
                    
                    <div class="material-author-row">
                        Автор / Спикер: <strong>${material.author || 'Не указан'}</strong>
                    </div>

                    <div class="material-tags-container">
                        ${(material.tags || []).map(tag => `<span class="material-tag">#${tag}</span>`).join('')}
                    </div>
                </div>

                <div class="material-description-block">
                    <h4 class="material-section-title">Описание материала</h4>
                    <p class="material-description-text">${material.description || 'Описание отсутствует'}</p>
                </div>

                <div class="material-content-viewer">
                    <h4 class="material-section-title">Учебный контент</h4>
                    
                    <div id="media-content-place" class="media-content-place">
                        </div>

                    <div class="material-footer-actions">
                        <span class="material-size-info">Размер файла: ${(material.file_size / (1024 * 1024)).toFixed(2)} МБ</span>
                        <a href="${fileSrc}" id="btn-trigger-download" target="_blank" class="btn-action-blue" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; height: 38px; padding: 0 20px;">
                            ${material.type === 'book' ? 'Скачать и читать книгу' : 'Открыть видео в новом окне'}
                        </a>
                    </div>
                </div>

            </div>
        `;

        // Логика кнопки возврата
        document.getElementById("btn-back-to-materials-list").addEventListener("click", () => {
            openCategoryDetails(currentCategoryId, currentCategoryName, currentUserData);
        });

        // Отрисовка медиа-элементов в зависимости от типа
        const mediaPlace = document.getElementById("media-content-place");
        if (material.type === 'video') {
            mediaPlace.innerHTML = `
                <video controls>
                    <source src="${fileSrc}" type="video/mp4">
                    Ваш браузер не поддерживает встроенные видео(
                </video>
            `;

            mediaPlace.querySelector('video').addEventListener('play', () => {
                registerDownloadEvent(materialId, currentUserData);
            }, { once: true });

        } else {
            mediaPlace.style.display = 'none';
            document.getElementById("btn-trigger-download").addEventListener("click", () => {
                registerDownloadEvent(materialId, currentUserData);
            });
        }

    } catch (err) {
        detailContainer.innerHTML = `<p style='color: red; padding: 20px;'>Ошибка: ${err.message}</p>`;
    }
}

async function registerDownloadEvent(materialId, currentUserData) {
    try {
        await fetch(`${API_BASE_URL}/materials/${materialId}/download`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${currentUserData.token}` }
        });
        console.log("Лог просмотра успешно зафиксирован");
    } catch (e) {
        console.error("Не удалось зафиксировать скачивание", e);
    }
}