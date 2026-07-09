import { openCategoryDetails } from './category-detail.js';
import { openCreateModuleModal, openUploadMaterialToModuleModal } from './admin-course-management.js';
import { openMaterialDetails } from './material-detail.js';

export async function openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser) {
    const detailContainer = document.getElementById("category-detail-container");
    if (!detailContainer) return;

    detailContainer.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>Загрузка программы курса...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/structure`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${currentUser.token}` }
        });

        if (!response.ok) throw new Error("Ошибка при загрузке структуры курса");
        const courseData = await response.json();

        // Синхронизируем глобальные хлебные крошки
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) {
            pageTitle.innerHTML = `
                <span id="bc-home" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">Список категорий</span> 
                <span style="color: var(--text-muted); margin: 0 6px;">/</span> 
                <span id="bc-cat" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">${currentCategoryName}</span>
                <span style="color: var(--text-muted); margin: 0 6px;">/</span> 
                <span style="color: var(--text-main); font-weight: 400;">${courseData.title}</span>
            `;

            document.getElementById("bc-home").addEventListener("click", () => {
                // Скрытие всех контейнеров
                detailContainer.classList.add("hidden");
                const categoriesContainer = document.getElementById("categories-container");
                if (categoriesContainer) {
                    categoriesContainer.classList.remove("hidden");
                }
                const myLearningContainer = document.getElementById("my-learning-container");
                if (myLearningContainer) {
                    myLearningContainer.classList.add("hidden");
                }
                pageTitle.innerText = "Список категорий";
                const addBtn = document.getElementById("add-category-btn");
                if (addBtn && (currentUser.role === 'admin' || currentUser.role === 'superuser')) addBtn.style.display = 'inline-flex';
            });

            // Обработчик возврата к категории
            document.getElementById("bc-cat").addEventListener("click", () => {
                openCategoryDetails(currentCategoryId, currentCategoryName, currentUser);
            });
        }

        const isAdmin = currentUser.role === "admin" || currentUser.role === "superuser";

        // кнопка удаления курса
        const adminActionsPanelHtml = isAdmin ? `
            <div id="course-admin-panel" style="background: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; gap: 12px; margin-bottom: 4px; flex-wrap: wrap;">
                <button id="btn-admin-add-module" class="btn-action-blue">Добавить учебный модуль</button>
                <button id="btn-admin-delete-course" class="btn-outline" style="color: #d93025; border-color: #d93025; height: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0 16px; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 4px;">Удалить курс</button>
            </div>
        ` : '';

        detailContainer.innerHTML = `
            <div class="course-structure-wrapper" style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
                
                <button id="btn-back-to-category-items" class="btn-back" style="align-self: flex-start; margin: 0;">&larr; Назад к материалам категории</button>
                
                ${adminActionsPanelHtml}

                <div class="course-info-block" style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h2 style="color: var(--text-main); margin: 0 0 8px 0; font-size: 20px; font-weight: 600;">${courseData.title}</h2>
                    <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin: 0;">${courseData.description || "Без описания"}</p>
                </div>

                <div class="course-progress-panel" style="background: var(--warm-blue-bg); padding: 16px; border-radius: 8px; border: 1px solid #e1e8ed;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 14px; color: var(--text-main); margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                        <span>Прогресс обучения:</span>
                        <span style="color: var(--primary-blue);">${courseData.progress.percent}% (${courseData.progress.completed_lessons} / ${courseData.progress.total_lessons})</span>
                    </div>
                    <div style="width: 100%; background: #e1e8ed; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${courseData.progress.percent}%; background: var(--primary-blue); height: 100%; transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <div id="course-modules-list" style="display: flex; flex-direction: column; gap: 14px;"></div>
            </div>
        `;

        document.getElementById("btn-back-to-category-items").addEventListener("click", () => {
            openCategoryDetails(currentCategoryId, currentCategoryName, currentUser);
        });

        if (isAdmin) {
            document.getElementById("btn-admin-add-module").addEventListener("click", () => {
                openCreateModuleModal(courseId, currentUser, () => {
                    openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser);
                });
            });

            // Обработчик удаления курса
            document.getElementById("btn-admin-delete-course").addEventListener("click", () => {
                showConfirmModal("Удаление курса", `Вы действительно хотите полностью удалить курс<br><strong>«${courseData.title}»</strong>?<br><span style="color: #d93025; font-size: 12px; display: block; margin-top: 6px;">Это действие удалит все связанные модули и прогресс!</span>`, async () => {
                    try {
                        const delRes = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${currentUser.token}` }
                        });
                        if (delRes.ok) {
                            openCategoryDetails(currentCategoryId, currentCategoryName, currentUser);
                        } else {
                            const err = await delRes.json();
                            alert(err.message || "Ошибка при удалении курса");
                        }
                    } catch (e) {
                        alert("Сетевая ошибка при удалении курса");
                    }
                });
            });
        }

        const modulesListContainer = document.getElementById("course-modules-list");

        courseData.modules.forEach(module => {
            const moduleBlock = document.createElement("div");
            moduleBlock.className = "module-accordion-item";
            moduleBlock.style.cssText = "background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;";

            const addLessonBtnHtml = isAdmin ? `
                <button class="btn-outline btn-add-lesson-trigger" style="height: 30px; font-size: 12px; padding: 0 12px; border-radius: 4px; align-self: flex-start; margin: 10px 20px; background: #fff; border: 1px dashed var(--primary-blue); color: var(--primary-blue); font-weight: 500; cursor: pointer;">
                    + Добавить урок в модуль
                </button>
            ` : '';

            // Кнопка удаления модуля
            const deleteModuleBtnHtml = isAdmin ? `
                <button class="btn-delete-module" data-id="${module.id}" data-title="${module.title}" style="background: transparent; border: 1px solid #d93025; color: #d93025; padding: 4px 10px; font-size: 12px; border-radius: 4px; cursor: pointer; font-weight: 500; transition: background 0.2s;">
                    Удалить модуль
                </button>
            ` : '';

            moduleBlock.innerHTML = `
                <div class="module-title" style="background: var(--warm-blue-bg); padding: 12px 20px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span>${module.title}</span>
                    ${deleteModuleBtnHtml}
                </div>
                <div class="module-lessons-list" style="padding: 0 20px;"></div>
                ${addLessonBtnHtml}
            `;

            if (isAdmin) {
                moduleBlock.querySelector(".btn-add-lesson-trigger").addEventListener("click", () => {
                    openUploadMaterialToModuleModal(module.id, currentCategoryId, currentUser, () => {
                        openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser);
                    });
                });

                // Обработчик удаления модуля
                moduleBlock.querySelector(".btn-delete-module").addEventListener("click", (e) => {
                    e.stopPropagation();
                    const moduleId = e.target.dataset.id;
                    const moduleTitle = e.target.dataset.title;

                    showConfirmModal("Удаление модуля", `Вы действительно хотите удалить модуль<br><strong>«${moduleTitle}»</strong>?<br><span style="color: var(--text-muted); font-size: 12px; display: block; margin-top: 6px;">Связи с материалами и прогресс будут очищены. Сами материалы останутся в каталоге.</span>`, async () => {
                        try {
                            const delModRes = await fetch(`${API_BASE_URL}/courses/modules/${moduleId}`, {
                                method: "DELETE",
                                headers: { "Authorization": `Bearer ${currentUser.token}` }
                            });
                            if (delModRes.ok) {
                                openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser);
                            } else {
                                const err = await delModRes.json();
                                alert(err.message || "Ошибка при удалении модуля");
                            }
                        } catch (err) {
                            alert("Сетевая ошибка при удалении модуля");
                        }
                    });
                });
            }

            const lessonsContainer = moduleBlock.querySelector(".module-lessons-list");

            if (!module.materials || module.materials.length === 0) {
                lessonsContainer.innerHTML = "<p style='color: var(--text-muted); font-size: 13px; padding: 14px 0; margin: 0;'>В этом модуле еще нет учебных материалов.</p>";
            } else {
                module.materials.forEach(material => {
                    const lessonRow = document.createElement("div");
                    lessonRow.className = "lesson-row";
                    lessonRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;";

                    const statusText = material.is_completed ? "Изучено" : "Ожидает";
                    const statusColor = material.is_completed ? "#1b5e20" : "var(--text-muted)";
                    const typeLabel = (material.type === "book" || material.type === "pdf") ? "Книга" : "Видео";
                    const exactMaterialId = material.id || material.material_id || 0;

                    lessonRow.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span style="font-size: 11px; font-weight: 600; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.5px;">[${statusText}]</span>
                            <span class="lesson-click-title" style="font-weight: 500; color: var(--text-main); cursor: pointer; text-decoration: none;">${material.title}</span>
                            <span style="font-size: 11px; color: var(--primary-blue); background: #e3f2fd; padding: 2px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase;">${typeLabel}</span>
                        </div>
                    `;

                    lessonRow.querySelector(".lesson-click-title").addEventListener("click", () => {
                        openMaterialDetails(exactMaterialId, currentCategoryId, currentCategoryName, currentUser, {
                            courseId: courseId,
                            courseName: courseData.title,
                            moduleId: module.id
                        })
                    });

                    lessonsContainer.appendChild(lessonRow);
                });
                if (lessonsContainer.lastChild) lessonsContainer.lastChild.style.borderBottom = "none";
            }
            modulesListContainer.appendChild(moduleBlock);
        });

    } catch (err) {
        detailContainer.innerHTML = `<p style='color: red; padding: 20px;'>${err.message}</p>`;
    }
}

// Окно подтверждения удаления
function showConfirmModal(title, messageHtml, onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop";

    overlay.innerHTML = `
        <div class="modal-window" style="max-width: 360px; width: 100%; text-align: center; padding: 24px; box-sizing: border-box;">
            <h3 style="margin-bottom: 12px; font-size: 18px; color: var(--text-main); font-weight: 600;">${title}</h3>
            <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.5; text-align: center;">
                ${messageHtml}
            </p>
            <div class="modal-footer" style="justify-content: center; gap: 12px; padding: 0; border: none; display: flex; flex-direction: column; align-items: center; width: 100%;">
                <button type="button" id="btn-modal-confirm" class="btn-action-blue" style="background-color: #d93025; padding: 10px 24px; color: #fff; width: 100%; max-width: 260px; border-radius: 4px; border: none; display: flex; align-items: center; justify-content: center; text-align: center;">Удалить</button>
                <button type="button" id="btn-modal-cancel" class="btn-outline" style="padding: 10px 24px; width: 100%; max-width: 260px; border-radius: 4px; background: #fff;">Отмена</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("btn-modal-cancel").addEventListener("click", () => overlay.remove());
    document.getElementById("btn-modal-confirm").addEventListener("click", () => {
        const btn = document.getElementById("btn-modal-confirm");
        btn.disabled = true;
        btn.innerText = "Удаление...";
        overlay.remove();
        onConfirm();
    });
}