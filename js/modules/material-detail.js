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

        // Проверка прав для вывода панели администратора
        const isAdmin = currentUserData.role === 'admin' || currentUserData.role === 'super_admin' || currentUserData.role === 'superuser';
        let adminPanelHtml = "";

        if (isAdmin) {
            adminPanelHtml = `
                <div style="display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    <button id="btn-edit-material" class="btn-outline" style="padding: 6px 16px; font-size: 13px;">Редактировать материал</button>
                    <button id="btn-delete-material" class="btn-outline" style="padding: 6px 16px; font-size: 13px; color: #d93025; border-color: #d93025;">Удалить</button>
                </div>
            `;
        }

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
                        Автор: <strong>${material.author || 'Не указан'}</strong>
                    </div>

                    <div class="material-tags-container">
                        ${(material.tags || []).map(tag => `<span class="material-tag">#${tag}</span>`).join('')}
                    </div>
                    ${adminPanelHtml}
                </div>

                <div class="material-description-block">
                    <h4 class="material-section-title">Описание материала</h4>
                    <p class="material-description-text">${material.description || 'Описание отсутствует'}</p>
                </div>

                <div class="material-content-viewer">
                    <h4 class="material-section-title">Учебный контент</h4>
                    <div id="media-content-place" class="media-content-place"></div>

                    <div class="material-footer-actions">
                        <span class="material-size-info">Размер файла: ${(material.file_size / (1024 * 1024)).toFixed(2)} МБ</span>
                        <a href="${fileSrc}" id="btn-trigger-download" target="_blank" class="btn-action-blue" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; height: 38px; padding: 0 20px;">
                            ${material.type === 'book' ? 'Скачать и читать книгу' : 'Открыть видео в новом окне'}
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("btn-back-to-materials-list").addEventListener("click", () => {
            openCategoryDetails(currentCategoryId, currentCategoryName, currentUserData);
        });

        if (isAdmin) {
            document.getElementById("btn-delete-material").addEventListener("click", () => {
                // Вызов модального окна - удаление материала
                showDeleteConfirmModal(material.title, async () => {
                    try {
                        const delRes = await fetch(`${API_BASE_URL}/admin/materials/${materialId}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${currentUserData.token}` }
                        });
                        if (delRes.ok) {
                            openCategoryDetails(currentCategoryId, currentCategoryName, currentUserData);
                        } else {
                            alert("Ошибка при удалении материала");
                        }
                    } catch (e) {
                        alert("Сетевая ошибка при удалении");
                    }
                });
            });

            document.getElementById("btn-edit-material").addEventListener("click", () => {
                import('./admin-material-edit.js').then(module => {
                    module.openEditMaterialModal(material, currentUserData, () => {
                        openMaterialDetails(materialId, currentCategoryId, currentCategoryName, currentUserData);
                    });
                });
            });
        }

        const mediaPlace = document.getElementById("media-content-place");
        if (material.type === 'video') {
            mediaPlace.innerHTML = `
                <video controls>
                    <source src="${fileSrc}" type="video/mp4">
                    Ваш браузер не поддерживает встроенные видео
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
        await fetch(`${API_BASE_URL}/history/track`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${currentUserData.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ material_id: materialId })
        });
    } catch (e) {
        console.error("Не удалось зафиксировать просмотр", e);
    }
}

function showDeleteConfirmModal(materialTitle, onConfirmCallback) {
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop"; // Класс для затемнения фона

    // Оформление - как у модалки "выход из системы"
    overlay.innerHTML = `
        <div class="modal-window" style="max-width: 360px; text-align: center;">
            <h3 style="margin-bottom: 12px; font-size: 18px; color: var(--text-main);">Удаление материала</h3>
            <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.5;">
                Вы действительно хотите удалить материал<br><strong>«${materialTitle}»</strong>?
            </p>
            <div class="modal-footer" style="justify-content: center; gap: 12px; padding: 0; border: none;">
                <button type="button" id="btn-cancel-delete-modal" class="btn-outline" style="padding: 8px 20px;">Отмена</button>
                <button type="button" id="btn-confirm-delete-modal" class="btn-action-blue" style="background-color: #d93025; padding: 8px 20px;">Удалить</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Кнопка "Отмена" - удаление модалки из DOM
    document.getElementById("btn-cancel-delete-modal").addEventListener("click", () => {
        overlay.remove();
    });

    // Кнопки "Удалить" - удаление модалки и запуск удаления с сервера
    document.getElementById("btn-confirm-delete-modal").addEventListener("click", () => {
        const btn = document.getElementById("btn-confirm-delete-modal");
        btn.disabled = true;
        btn.innerText = "Удаление...";

        overlay.remove();
        onConfirmCallback();
    });
}