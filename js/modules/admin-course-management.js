// Модальное окно создания нового курса
export function openCreateCourseModal(categoryId, currentUser, onSuccessCallback) {
    const existingModal = document.getElementById("admin-create-course-modal");
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement("div");
    modalOverlay.id = "admin-create-course-modal";
    modalOverlay.className = "modal-backdrop";

    modalOverlay.innerHTML = `
        <div class="modal-window" style="max-width: 500px; width: 100%; padding: 24px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <div class="modal-header" style="padding-bottom: 12px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 18px; color: var(--text-main); font-weight: 600;">Создание нового курса</h3>
                <button id="btn-close-course-modal" class="btn-close" style="font-size: 24px; background: none; border: none; cursor: pointer; color: var(--text-muted);">&times;</button>
            </div>
            
            <form id="create-course-form" style="display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Название курса</label>
                    <input type="text" id="course-title-input" required placeholder="Например, Архитектура распределенных систем" style="height: 38px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;">
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Описание курса</label>
                    <textarea id="course-desc-input" rows="4" placeholder="Введите краткую аннотацию курса..." style="padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; resize: vertical; font-family: inherit;"></textarea>
                </div>

                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 12px; padding: 0; margin-top: 8px;">
                    <button type="button" id="btn-cancel-course" class="btn-outline" style="height: 38px; padding: 0 16px; font-size: 14px; border-radius: 6px;">Отмена</button>
                    <button type="submit" id="btn-submit-course" class="btn-action-blue" style="height: 38px; padding: 0 20px; font-size: 14px; border-radius: 6px;">Создать курс</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    modalOverlay.classList.remove("hidden");

    const closeModal = () => modalOverlay.remove();
    document.getElementById("btn-close-course-modal").addEventListener("click", closeModal);
    document.getElementById("btn-cancel-course").addEventListener("click", closeModal);

    document.getElementById("create-course-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("btn-submit-course");
        submitBtn.disabled = true;
        submitBtn.innerText = "Сохранение...";

        const payload = {
            title: document.getElementById("course-title-input").value.trim(),
            description: document.getElementById("course-desc-input").value.trim(),
            category_id: Number(categoryId)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/courses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentUser.token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                closeModal();
                if (onSuccessCallback) onSuccessCallback(data.id || data.course_id);
            } else {
                const errData = await response.json();
                alert(errData.message || "Ошибка при создании курса");
                submitBtn.disabled = false;
                submitBtn.innerText = "Создать курс";
            }
        } catch (error) {
            alert("Сетевая ошибка при создании курса");
            submitBtn.disabled = false;
            submitBtn.innerText = "Создать курс";
        }
    });
}

// Модальное окно создания модуля внутри курса
export function openCreateModuleModal(courseId, currentUser, onSuccessCallback) {
    const existingModal = document.getElementById("admin-create-module-modal");
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement("div");
    modalOverlay.id = "admin-create-module-modal";
    modalOverlay.className = "modal-backdrop";

    modalOverlay.innerHTML = `
        <div class="modal-window" style="max-width: 460px; width: 100%; padding: 24px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <div class="modal-header" style="padding-bottom: 12px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 18px; color: var(--text-main); font-weight: 600;">Добавление учебного модуля</h3>
                <button id="btn-close-module-modal" class="btn-close" style="font-size: 24px; background: none; border: none; cursor: pointer; color: var(--text-muted);">&times;</button>
            </div>
            
            <form id="create-module-form" style="display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Название модуля</label>
                    <input type="text" id="module-title-input" required placeholder="Например, Модуль 1. Протоколы транспортного уровня" style="height: 38px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;">
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Порядок сортировки (Index)</label>
                    <input type="number" id="module-sort-input" value="1" min="1" required style="height: 38px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;">
                </div>

                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 12px; padding: 0; margin-top: 8px;">
                    <button type="button" id="btn-cancel-module" class="btn-outline" style="height: 38px; padding: 0 16px; font-size: 14px; border-radius: 6px;">Отмена</button>
                    <button type="submit" id="btn-submit-module" class="btn-action-blue" style="height: 38px; padding: 0 20px; font-size: 14px; border-radius: 6px;">Добавить модуль</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    modalOverlay.classList.remove("hidden");

    const closeModal = () => modalOverlay.remove();
    document.getElementById("btn-close-module-modal").addEventListener("click", closeModal);
    document.getElementById("btn-cancel-module").addEventListener("click", closeModal);

    document.getElementById("create-module-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("btn-submit-module");
        submitBtn.disabled = true;
        submitBtn.innerText = "Добавление...";

        const payload = {
            title: document.getElementById("module-title-input").value.trim(),
            sort_order: Number(document.getElementById("module-sort-input").value)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/courses/${courseId}/modules`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentUser.token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                closeModal();
                if (onSuccessCallback) onSuccessCallback();
            } else {
                const errData = await response.json();
                alert(errData.message || "Ошибка при добавлении модуля");
                submitBtn.disabled = false;
                submitBtn.innerText = "Добавить модуль";
            }
        } catch (error) {
            alert("Сетевая ошибка при добавлении модуля");
            submitBtn.disabled = false;
            submitBtn.innerText = "Добавить модуль";
        }
    });
}

// автоматическая привязка к модулю курса
export function openUploadMaterialToModuleModal(moduleId, categoryId, currentUser, onSuccessCallback) {
    const existingModal = document.getElementById("admin-upload-to-module-modal");
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement("div");
    modalOverlay.id = "admin-upload-to-module-modal";
    modalOverlay.className = "modal-backdrop";

    modalOverlay.innerHTML = `
        <div class="modal-window" style="max-width: 550px; width: 100%; padding: 24px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <div class="modal-header" style="padding-bottom: 12px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 18px; color: var(--text-main); font-weight: 600;">Загрузка материала в урок</h3>
                <button id="btn-close-upload-modal" class="btn-close" style="font-size: 24px; background: none; border: none; cursor: pointer; color: var(--text-muted); line-height: 1;">&times;</button>
            </div>
            
            <form id="upload-to-module-form" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Тип учебного контента</label>
                    <select id="upload-mod-type" required style="height: 38px; padding: 0 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background-color: #fff;">
                        <option value="book">Книга (PDF)</option>
                        <option value="videos">Видеоурок (MP4)</option>
                    </select>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Название материала (урока)</label>
                    <input type="text" id="upload-mod-title" required placeholder="Введите название темы" style="height: 38px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;">
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Автор / Преподаватель</label>
                        <input type="text" id="upload-mod-author" placeholder="Имя автора или кафедры" style="height: 38px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Порядок (Индекс)</label>
                        <input type="number" id="upload-mod-sort" value="1" min="0" required style="height: 38px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;">
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Теги (через запятую)</label>
                    <input type="text" id="upload-mod-tags" placeholder="sockets, tcp, ip" style="height: 38px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Краткое описание урока</label>
                    <textarea id="upload-mod-desc" rows="3" placeholder="Укажите рассматриваемые вопросы..." style="padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; resize: vertical; font-family: inherit;"></textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px;">
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Основной файл контента</label>
                        <input type="file" id="upload-mod-file" required accept=".pdf" style="font-size: 13px;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Обложка (необязательно)</label>
                        <input type="file" id="upload-mod-cover" accept=".png,.jpg,.jpeg" style="font-size: 13px;">
                    </div>
                </div>

                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 12px; padding: 0; margin-top: 14px; border-top: 1px solid var(--border-color); padding-top: 14px;">
                    <button type="button" id="btn-cancel-upload" class="btn-outline" style="height: 38px; padding: 0 16px; font-size: 14px; border-radius: 6px;">Отмена</button>
                    <button type="submit" id="btn-submit-upload" class="btn-action-blue" style="height: 38px; padding: 0 20px; font-size: 14px; border-radius: 6px;">Загрузить контент</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    modalOverlay.classList.remove("hidden");

    const closeModal = () => modalOverlay.remove();
    document.getElementById("btn-close-upload-modal").addEventListener("click", closeModal);
    document.getElementById("btn-cancel-upload").addEventListener("click", closeModal);

    const typeSelect = document.getElementById("upload-mod-type");
    const fileInput = document.getElementById("upload-mod-file");

    typeSelect.addEventListener("change", () => {
        if (typeSelect.value === 'book') {
            fileInput.setAttribute("accept", ".pdf");
        } else {
            fileInput.setAttribute("accept", ".mp4");
        }
    });

    const checkCyrillicFilename = (inputElement) => {
        inputElement.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file && /[а-яё]/i.test(file.name)) {
                alert("Имя выбранного файла содержит кириллические символы. Переименуйте файл на латиницу перед отправкой");
            }
        });
    };
    checkCyrillicFilename(fileInput);
    checkCyrillicFilename(document.getElementById("upload-mod-cover"));

    document.getElementById("upload-to-module-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("btn-submit-upload");
        submitBtn.disabled = true;
        submitBtn.innerText = "Загрузка на сервер...";

        const formData = new FormData();
        formData.append("type", typeSelect.value);
        formData.append("title", document.getElementById("upload-mod-title").value.trim());
        formData.append("author", document.getElementById("upload-mod-author").value.trim());
        formData.append("description", document.getElementById("upload-mod-desc").value.trim());
        formData.append("category_id", String(categoryId));
        formData.append("module_id", String(moduleId));
        formData.append("sort_order", document.getElementById("upload-mod-sort").value);

        const tagsRaw = document.getElementById("upload-mod-tags").value.trim();
        if (tagsRaw) formData.append("tags", tagsRaw);

        const mainFile = fileInput.files[0];
        if (mainFile) formData.append("file", mainFile);

        const coverFile = document.getElementById("upload-mod-cover").files[0];
        if (coverFile) formData.append("cover", coverFile);

        try {
            const response = await fetch(`${API_BASE_URL}/materials`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${currentUser.token}` },
                body: formData
            });

            if (response.ok) {
                closeModal();
                if (onSuccessCallback) onSuccessCallback();
            } else {
                const errData = await response.json();
                alert(errData.message || "Ошибка при загрузке материала");
                submitBtn.disabled = false;
                submitBtn.innerText = "Загрузить контент";
            }
        } catch (error) {
            alert("Сетевая ошибка загрузки контента.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Загрузить контент";
        }
    });
}