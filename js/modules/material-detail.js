import { openCategoryDetails } from './category-detail.js';
import { openCourseStructure } from './course-detail.js';

export async function openMaterialDetails(materialId, currentCategoryId, currentCategoryName, currentUserData, courseContext = null) {
    const detailContainer = document.getElementById("category-detail-container");
    if (!detailContainer) return;

    detailContainer.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>Загрузка содержимого материала...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/materials/${materialId}?t=${Date.now()}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${currentUserData.token}` }
        });

        if (!response.ok) throw new Error("Не удалось загрузить данные материала");
        const material = await response.json();

        let backendOrigin = "";
        try {
            backendOrigin = new URL(API_BASE_URL).origin;
        } catch (e) {
            console.error("Ошибка API", e);
        }

        // Сборка ссылки на обложку материала
        const coverSrc = material.cover_url && material.cover_url !== '#'
            ? (material.cover_url.startsWith('http') ? material.cover_url : `${backendOrigin}${material.cover_url}`)
            : '../icon/readIcon.png';

        const fileSrc = material.file_url && material.file_url !== '#'
            ? (material.file_url.startsWith('http') ? material.file_url : `${backendOrigin}${material.file_url}`)
            : '#';

        // Синхронизация навигации в шапке
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) {
            if (courseContext) {
                pageTitle.innerHTML = `
                    <span id="bc-home" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">Категории</span> 
                    <span style="color: var(--text-muted); margin: 0 6px;">/</span> 
                    <span id="bc-cat" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">${currentCategoryName}</span>
                    <span style="color: var(--text-muted); margin: 0 6px;">/</span>
                    <span id="bc-course" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">${courseContext.courseName || 'Курс'}</span>
                    <span style="color: var(--text-muted); margin: 0 6px;">/</span>
                    <span style="color: var(--text-main); font-weight: 400;">${material.title}</span>
                `;
                document.getElementById("bc-course").addEventListener("click", () => {
                    openCourseStructure(courseContext.courseId, currentCategoryId, currentCategoryName, currentUserData);
                });
            } else {
                pageTitle.innerHTML = `
                    <span id="bc-home" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">Категории</span> 
                    <span style="color: var(--text-muted); margin: 0 6px;">/</span> 
                    <span id="bc-cat" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">${currentCategoryName}</span>
                    <span style="color: var(--text-muted); margin: 0 6px;">/</span>
                    <span style="color: var(--text-main); font-weight: 400;">${material.title}</span>
                `;
            }

            document.getElementById("bc-home").addEventListener("click", () => {
                const categoriesContainer = document.getElementById("categories-container");
                const addCategoryBtn = document.getElementById("add-category-btn");
                if (categoriesContainer) categoriesContainer.classList.remove("hidden");
                if (addCategoryBtn && (currentUserData.role === 'admin' || currentUserData.role === 'superuser')) addCategoryBtn.style.display = "inline-flex";
                if (pageTitle) pageTitle.innerText = "Категории";
                detailContainer.innerHTML = "";
            });

            document.getElementById("bc-cat").addEventListener("click", () => {
                openCategoryDetails(currentCategoryId, currentCategoryName, currentUserData);
            });
        }

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

        // Кнопка отметки прогресса (если пользователь внутри курса)
        const trackButtonHTML = courseContext ? `
                <div style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 20px; display: flex; justify-content: center; width: 100%;">
                <button id="btn-mark-completed" class="btn-action-blue" style="padding: 12px 32px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 4px;">
                    Отметить как пройдено
                </button>
            </div>` : '';

        // Отрисовка контента в вашем исходном стиле
        detailContainer.innerHTML = `
            <div class="material-detail-wrapper">
                <button id="btn-back-to-materials-list" class="btn-back">← Назад к списку</button>
                
                <div class="material-banner">
                    <img src="${coverSrc}" alt="Обложка">
                </div>

                <div class="material-meta-header">
                    <div class="material-meta-header-top">
                        <h2 class="material-title" style="color: var(--text-main);">${material.title}</h2>
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
                        <span class="material-size-info">Размер файла: ${((material.file_size || 0) / (1024 * 1024)).toFixed(2)} МБ</span>
                        <a href="${fileSrc}" id="btn-trigger-download" target="_blank" class="btn-action-blue" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; height: 38px; padding: 0 20px;">
                            ${material.type === 'book' ? 'Скачать и читать книгу' : 'Открыть видео в новом окне'}
                        </a>
                    </div>
                </div>
                ${trackButtonHTML}
            </div>
        `;

        document.getElementById("btn-back-to-materials-list").addEventListener("click", () => {
            if (courseContext) {
                openCourseStructure(courseContext.courseId, currentCategoryId, currentCategoryName, currentUserData);
            } else {
                openCategoryDetails(currentCategoryId, currentCategoryName, currentUserData);
            }
        });

        // Инициализация плеера или скрытие блока
        const mediaPlace = document.getElementById("media-content-place");
        if (material.type === 'video') {
            mediaPlace.innerHTML = `
                <video controls style="width:100%; max-height:450px; background:#000; border-radius:6px;">
                    <source src="${fileSrc}" type="video/mp4">
                    Ваш браузер не поддерживает встроенные видео
                </video>
            `;
        }

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
                            if (courseContext) {
                                openCourseStructure(courseContext.courseId, currentCategoryId, currentCategoryName, currentUserData);
                            } else {
                                openCategoryDetails(currentCategoryId, currentCategoryName, currentUserData);
                            }
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
                        openMaterialDetails(materialId, currentCategoryId, currentCategoryName, currentUserData, courseContext);
                    });
                });
            });
        }

        // Кнопка отметки прохождения
        if (courseContext) {
            document.getElementById("btn-mark-completed")?.addEventListener("click", async () => {
                const btn = document.getElementById("btn-mark-completed");
                btn.disabled = true;
                btn.innerText = "Сохранение...";

                try {
                    const trackRes = await fetch(`${API_BASE_URL}/courses/track`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${currentUserData.token}`
                        },
                        body: JSON.stringify({
                            course_id: Number(courseContext.courseId),
                            module_id: Number(courseContext.moduleId),
                            material_id: Number(materialId)
                        })
                    });

                    if (trackRes.ok) {
                        openCourseStructure(courseContext.courseId, currentCategoryId, currentCategoryName, currentUserData);
                    } else {
                        const err = await trackRes.json();
                        alert(err.message || "Ошибка при сохранении прогресса.");
                        btn.disabled = false;
                        btn.innerText = "Отметить как пройдено";
                    }
                } catch (e) {
                    alert("Сетевая ошибка при отправке прогресса.");
                    btn.disabled = false;
                    btn.innerText = "Отметить как пройдено";
                }
            });
        }

    } catch (err) {
        detailContainer.innerHTML = `<p style='color: red; padding: 20px;'>Ошибка: ${err.message}</p>`;
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
            <div class="modal-footer" style="justify-content: center; gap: 12px; padding: 0; border: none; display:flex;">
                <button type="button" id="btn-cancel-delete-modal" class="btn-outline" style="padding: 8px 20px;">Отмена</button>
                <button type="button" id="btn-confirm-delete-modal" class="btn-action-blue" style="background-color: #d93025; padding: 8px 20px; color:#fff; width: 100%; max-width: 260px; border-radius: 4px; border: none; display: flex; align-items: center; justify-content: center; text-align: center;">Удалить</button>
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