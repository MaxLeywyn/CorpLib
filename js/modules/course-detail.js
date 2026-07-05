import { openCategoryDetails } from './category-detail.js';

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

        // Удобная навигация по кутагориям-курсам и тд
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) {
            pageTitle.innerHTML = `
                <span id="bc-home" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">Категории</span> 
                <span style="color: var(--text-muted); margin: 0 6px;">/</span> 
                <span id="bc-cat" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">${currentCategoryName}</span>
                <span style="color: var(--text-muted); margin: 0 6px;">/</span> 
                <span style="color: var(--text-main);">${courseData.title}</span>
            `;
            document.getElementById("bc-home").addEventListener("click", () => {
                document.getElementById("category-detail-container").classList.add("hidden");
                document.getElementById("categories-container").classList.remove("hidden");
                const addBtn = document.getElementById("add-category-btn");
                if(addBtn) addBtn.style.display = "block";
                pageTitle.innerText = "Категории";
            });
            document.getElementById("bc-cat").addEventListener("click", () => {
                openCategoryDetails(currentCategoryId, currentCategoryName, currentUser);
            });
        }

        // Отрисовка структуры
        detailContainer.innerHTML = `
            <div class="course-structure-wrapper" style="display: flex; flex-direction: column; gap: 20px; width: 100%;">
                <div class="course-info-block" style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 22px;">${courseData.title}</h2>
                    <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">${courseData.description || "Без описания"}</p>
                </div>
                <div id="course-modules-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
            </div>
        `;

        const modulesListContainer = document.getElementById("course-modules-list");
        const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin'; // Проверка роли

        courseData.modules.forEach(module => {
            const moduleBlock = document.createElement("div");
            moduleBlock.className = "module-accordion-item";
            moduleBlock.style.cssText = "background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;";

            moduleBlock.innerHTML = `
                <div class="module-title" style="background: var(--warm-blue-bg); padding: 14px 20px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color);">
                    ${module.title}
                </div>
                <div class="module-lessons-list" style="padding: 8px 20px;"></div>
            `;

            const lessonsContainer = moduleBlock.querySelector(".module-lessons-list");

            module.materials.forEach(material => {
                const lessonRow = document.createElement("div");
                lessonRow.className = "lesson-row";
                lessonRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px; cursor: pointer; transition: background-color 0.2s ease;";

                lessonRow.addEventListener("mouseenter", () => lessonRow.style.backgroundColor = "#f8f9fa");
                lessonRow.addEventListener("mouseleave", () => lessonRow.style.backgroundColor = "transparent");

                const isCompleted = material.is_completed;
                const typeLabel = material.type === "book" ? "Книга" : "Видео";

                // Блок с кнопками администратора
                let adminControls = "";
                if (isAdmin) {
                    adminControls = `
                        <div class="admin-controls" style="display: flex; gap: 12px; margin-left: 12px; border-left: 1px solid var(--border-color); padding-left: 12px;">
                            <button class="btn-edit-mat" data-id="${material.id}" style="background:none; border:none; color: var(--primary-blue); cursor:pointer; font-size:13px; font-weight:600; padding: 4px;">Изменить</button>
                            <button class="btn-delete-mat" data-id="${material.id}" style="background:none; border:none; color: #d93025; cursor:pointer; font-size:13px; font-weight:600; padding: 4px;">Удалить</button>
                        </div>
                    `;
                }

                lessonRow.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 15px; font-weight: 500; ${isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-main);'}">
                                ${material.title}
                            </span>
                            <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase; background: #e1e8ed; color: var(--text-main);">
                                ${typeLabel}
                            </span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            ${isCompleted ? '<span style="color: #1b5e20; font-weight: 600; font-size: 13px;">[Изучено]</span>' : ''}
                            ${adminControls}
                        </div>
                    </div>
                `;

                // Обработчик клика по строке (открытие урока)
                lessonRow.addEventListener("click", (e) => {
                    // Если кликнули по кнопкам админа, не открываем урок
                    if (e.target.closest('.admin-controls')) return;

                    // Передаем полные названия для хлебных крошек
                    openCourseLesson(courseId, module.id, material.id, currentCategoryId, currentCategoryName, currentUser, courseData.title, module.title);
                });

                // Логика Админа (Удаление)
                if (isAdmin) {
                    const btnDelete = lessonRow.querySelector('.btn-delete-mat');
                    btnDelete.addEventListener('click', async () => {
                        if (confirm(`Вы уверены, что хотите удалить материал "${material.title}"?`)) {
                            try {
                                const res = await fetch(`${API_BASE_URL}/materials/${material.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${currentUser.token}` }
                                });
                                if (res.ok) {
                                    openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser); // Обновляем список
                                } else alert("Ошибка при удалении.");
                            } catch(err) { alert("Ошибка сети"); }
                        }
                    });

                    // Логика Админа (Редактирование) - простое переименование через prompt (или подключи свою форму)
                    const btnEdit = lessonRow.querySelector('.btn-edit-mat');
                    btnEdit.addEventListener('click', async () => {
                        const newTitle = prompt("Введите новое название материала:", material.title);
                        if (newTitle && newTitle.trim() !== "" && newTitle !== material.title) {
                            try {
                                const res = await fetch(`${API_BASE_URL}/materials/${material.id}`, {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${currentUser.token}`
                                    },
                                    body: JSON.stringify({ title: newTitle.trim() })
                                });
                                if (res.ok) {
                                    openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser);
                                } else alert("Ошибка при обновлении названия.");
                            } catch(err) { alert("Ошибка сети"); }
                        }
                    });
                }

                lessonsContainer.appendChild(lessonRow);
            });

            modulesListContainer.appendChild(moduleBlock);
        });

    } catch (err) {
        detailContainer.innerHTML = `<p style='color: red; padding: 20px;'>${err.message}</p>`;
    }
}

// Функция открытия конкретного урока внутри курса
async function openCourseLesson(courseId, moduleId, materialId, currentCategoryId, currentCategoryName, currentUser, courseTitle, moduleTitle) {
    const detailContainer = document.getElementById("category-detail-container");
    if (!detailContainer) return;

    detailContainer.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>Загрузка урока...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/materials/${materialId}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${currentUser.token}` }
        });

        if (!response.ok) throw new Error("Не удалось загрузить данные урока");
        const material = await response.json();

        // Логика возврата на прошлые категории
        const pageTitle = document.getElementById("page-title");
        if (pageTitle) {
            pageTitle.innerHTML = `
                <span id="bc-home" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">Категории</span> 
                <span style="color: var(--text-muted); margin: 0 4px;">/</span> 
                <span id="bc-cat" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">${currentCategoryName}</span>
                <span style="color: var(--text-muted); margin: 0 4px;">/</span> 
                <span id="bc-course" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">${courseTitle}</span>
                <span style="color: var(--text-muted); margin: 0 4px;">/</span> 
                <span style="color: var(--text-muted);">${moduleTitle}</span>
                <span style="color: var(--text-muted); margin: 0 4px;">/</span> 
                <span style="color: var(--text-main);">${material.title}</span>
            `;

            document.getElementById("bc-home").addEventListener("click", () => {
                document.getElementById("category-detail-container").classList.add("hidden");
                document.getElementById("categories-container").classList.remove("hidden");
                const addBtn = document.getElementById("add-category-btn");
                if(addBtn) addBtn.style.display = "block";
                pageTitle.innerText = "Категории";
            });
            document.getElementById("bc-cat").addEventListener("click", () => openCategoryDetails(currentCategoryId, currentCategoryName, currentUser));
            document.getElementById("bc-course").addEventListener("click", () => openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser));
        }

        const fileSrc = material.file_url || '#';
        let mediaContent = material.type === "video"
            ? `<video controls style="width: 100%; max-height: 500px; border-radius: 8px; background: #000;"><source src="${fileSrc}" type="video/mp4"></video>`
            : `<div style="padding: 40px; text-align: center; background: #f8f9fa; border-radius: 8px; border: 1px dashed var(--border-color);"><a href="${fileSrc}" target="_blank" class="btn-outline" style="text-decoration: none; padding: 10px 20px;">Открыть документ</a></div>`;

        detailContainer.innerHTML = `
            <div class="lesson-detail-wrapper" style="display: flex; flex-direction: column; gap: 24px; max-width: 800px; margin: 0 auto; padding-bottom: 40px;">
                <div>
                    <h2 style="font-size: 24px; color: var(--text-main); margin-bottom: 8px;">${material.title}</h2>
                    <p style="color: var(--text-muted); font-size: 15px;">${material.description || ''}</p>
                </div>
                <div class="media-container" style="width: 100%;">${mediaContent}</div>
                <div style="margin-top: 20px; text-align: center; border-top: 1px solid var(--border-color); padding-top: 30px;">
                    <button id="btn-mark-completed" class="btn-action-blue" style="padding: 14px 32px; font-size: 16px; font-weight: 600;">Отметить как пройдено</button>
                </div>
            </div>
        `;
        // Логика прохождения курса
        document.getElementById("btn-mark-completed").addEventListener("click", async (e) => {
            const btn = e.target;
            btn.disabled = true; btn.innerText = "Сохранение...";
            try {
                const trackRes = await fetch(`${API_BASE_URL}/courses/track`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentUser.token}` },
                    body: JSON.stringify({ course_id: Number(courseId), module_id: Number(moduleId), material_id: Number(materialId) })
                });
                if (trackRes.ok) openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser);
                else { alert("Ошибка при сохранении."); btn.disabled = false; btn.innerText = "Отметить как пройдено"; }
            } catch (err) { alert("Сетевая ошибка"); btn.disabled = false; btn.innerText = "Отметить как пройдено"; }
        });

    } catch (error) {
        detailContainer.innerHTML = `<p style='color: red; padding: 20px;'>Ошибка: ${error.message}</p>`;
    }
}