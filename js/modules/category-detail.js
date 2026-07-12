import { openCourseStructure } from './course-detail.js';
import { openMaterialDetails } from './material-detail.js';
import { openCreateCourseModal } from './admin-course-management.js';
import { validateFileByType, hasCyrillicInFilename } from '../file-valid.js';

let currentCategoryId = null;
let currentCategoryName = "";
let currentUserData = null; // сохранение данных пользователя

// Открытие категории - для просмотра курсов-материалов
export async function openCategoryDetails(categoryId, categoryName, currentUser) {
    currentCategoryId = categoryId;
    currentCategoryName = categoryName;
    currentUserData = currentUser; // Сохранение переданного пользователя

    // Скрытие "Моё обучение", если раздел был открыт
    const myLearningContainer = document.getElementById("my-learning-container");
    if (myLearningContainer) {
        myLearningContainer.classList.add("hidden");
    }

    const categoriesContainer = document.getElementById("categories-container");
    const addCategoryBtn = document.getElementById("add-category-btn");
    const pageTitle = document.getElementById("page-title");

    if (!categoriesContainer) return;

    categoriesContainer.classList.add("hidden");
    if (addCategoryBtn) addCategoryBtn.style.display = "none";

    // Меняем заголовок страницы для навигации
    if (pageTitle) {
        pageTitle.innerHTML = `
            <span id="bc-home" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">Категории</span> 
            <span style="color: var(--text-muted); margin: 0 6px;">/</span> 
            <span style="color: var(--text-main);">${categoryName}</span>
        `;

        // Обработчик возврата в корень каталога
        document.getElementById("bc-home").addEventListener("click", () => {
            document.getElementById("category-detail-container").classList.add("hidden");
            document.getElementById("categories-container").classList.remove("hidden");
            if (addCategoryBtn) addCategoryBtn.style.display = "block";
            pageTitle.innerText = "Категории"; // Возвращаем стандартный заголовок
        });
    }

    // Создаем или очищаем динамический контейнер для содержимого категории
    let detailContainer = document.getElementById("category-detail-container");
    if (!detailContainer) {
        detailContainer = document.createElement("div");
        detailContainer.id = "category-detail-container";
        categoriesContainer.parentNode.insertBefore(detailContainer, categoriesContainer.nextSibling);
    }
    detailContainer.innerHTML = "";
    detailContainer.classList.remove("hidden");

    // Загрузка базовой структуры (кнопка "Назад" + контейнеры контента)
    detailContainer.innerHTML = `
        <div class="category-detail-wrapper">
            <button id="btn-back-to-categories" class="btn-back">← Назад к категориям</button>
            
            <div id="category-admin-actions" class="admin-actions-panel hidden">
                <button id="btn-create-course" class="btn-action-blue">Добавить курс</button>
                <button id="btn-create-material" class="btn-action-blue" style="background-color: #fff; color: var(--primary-blue); border: 1px solid var(--primary-blue);">Загрузить материал (PDF/MP4)</button>
            </div>

            <div class="category-courses-section">
                <h3 class="content-section-title">Обучающие курсы</h3>
                <div id="inner-courses-grid" class="courses-grid"></div>
            </div>

            <div class="category-materials-section">
                <h3 class="content-section-title">Самостоятельные материалы (Книги и видеоуроки)</h3>
                <div id="inner-materials-list" class="materials-list"></div>
            </div>
        </div>
    `;

    // Обработчик кнопки "возврата назад"
    document.getElementById("btn-back-to-categories").addEventListener("click", () => {
        detailContainer.classList.add("hidden");
        categoriesContainer.classList.remove("hidden");
        if (pageTitle) pageTitle.innerText = "Категории";
        if ((currentUserData.role === "admin" || currentUserData.role === "superuser") && addCategoryBtn) {
            addCategoryBtn.style.display = "inline-flex";
        }
    });

    // Проверка прав доступа
    if (currentUserData.role === "admin" || currentUserData.role === "superuser") {
        document.getElementById("category-admin-actions").classList.remove("hidden");
        initAdminActionEvents();
    }

    // Загрузка данных с бэка
    await Promise.all([
        loadCategoryCourses(),
        loadCategoryStandaloneMaterials()
    ]);
}

// Загрузка курсов в данной категории
async function loadCategoryCourses() {
    const grid = document.getElementById("inner-courses-grid");
    if (!grid) return;
    grid.innerHTML = "<p style='color: var(--text-muted);'>Загрузка курсов...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/admin/categories/${currentCategoryId}/courses`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${currentUserData.token}`
            }
        });

        if (!response.ok) throw new Error("Ошибка сервера");
        const courses = await response.json();

        grid.innerHTML = "";
        if (courses.length === 0) {
            grid.innerHTML = "<p style='color: var(--text-muted);'>В этой категории еще нет комплексных курсов.</p>";
            return;
        }

        courses.forEach(course => {
            const card = document.createElement("div");
            card.className = "category-card";
            card.style.cssText = "background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); cursor: pointer; transition: .2s; display: flex; flex-direction: column; height: 100%;";

            // Ограничение описания до 2 строк
            const description = course.description || "Описание курса отсутствует.";
            const shortDescription = description.length > 100 ? description.substring(0, 100) + '...' : description;
            // исправлено - единый стиль курсов с ограничением описания (по символам)
            card.innerHTML = `
        <div class="category-header" style="background: #607d8b; color: white; padding: 24px; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-end; flex-grow: 1;">
            <div class="category-title" style="font-size: 22px; font-weight: 500; margin-bottom: 8px;">${course.title}</div>
            <div class="category-description" style="color: #dfe7ec; font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${shortDescription}</div>
        </div>
        <div class="category-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #ffffff; border-top: 1px solid var(--border-color);">
            <span style="color: var(--primary-blue); font-weight: 500;">Открыть программу курса</span>
        </div>
    `;
            // Вызов отрисовки структуры курса
            card.addEventListener("click", () => {
                openCourseStructure(course.id, currentCategoryId, currentCategoryName, currentUserData);
            });
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = "<p style='color: red;'>Не удалось загрузить список курсов.</p>";
    }
}

// Загрузка самостоятельных материалов (без курсов)
async function loadCategoryStandaloneMaterials() {
    const list = document.getElementById("inner-materials-list");
    if (!list) return;
    list.innerHTML = "<p style='color: var(--text-muted);'>Загрузка материалов...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/admin/categories/${currentCategoryId}/materials`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${currentUserData.token}`
            }
        });

        if (!response.ok) throw new Error("Ошибка сервера");
        const materials = await response.json();

        list.innerHTML = "";
        if (materials.length === 0) {
            list.innerHTML = "<p style='color: var(--text-muted);'>Прямые учебные материалы в эту категорию еще не добавлены.</p>";
            return;
        }
        // Тест - поиск данных обложки-видео с сервера
        let backendOrigin = "";
        try {
            backendOrigin = new URL(API_BASE_URL).origin;
        } catch (e) {
            console.error("Не удалось разобрать API_BASE_URL", e);
        }
        // нормализация ссылки для ТОЧНОЙ загрузки обложки
        const normalizeUrl = (url) => {
            if (!url || url === '#' || url === '') return null;
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            if (url.startsWith('/')) {
                return `${backendOrigin}${url}`;
            }
            return `${backendOrigin}/${url}`;
        };
        // Облажка сбоку
        list.style.cssText = "display: flex; flex-direction: column; gap: 16px; width: 100%;";

        materials.forEach(material => {
            const card = document.createElement("div");
            card.className = "material-row-card";
            card.style.cssText = "display: flex; gap: 16px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";

            const typeLabel = material.type === "book" ? "Книга" : "Видео";
            const typeClass = material.type === "book" ? "type-book" : "type-video";
            const metaInfo = material.type === "book" ? `Автор: ${material.author || "Не указан"}` : "Доступно для воспроизведения";

            // Если обложки нет - иконка сайта
            const coverUrl = normalizeUrl(material.cover_url) || '../icon/readIcon.png';

            card.innerHTML = `
                <div class="material-card-cover-left" style="width: 70px; height: 90px; min-width: 70px; background: #f0f4f8; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center;">
                    <img src="${coverUrl}" alt="Cover" onerror="this.onerror=null; this.src='../icon/readIcon.png';" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="material-info" style="flex-grow: 1; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <span class="material-row-title" style="font-weight: 600; color: var(--text-main); font-size: 16px;">${material.title}</span>
                        <span class="material-type-tag ${typeClass}" style="font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${typeLabel}</span>
                    </div>
                    <div class="material-row-meta" style="font-size: 13px; color: var(--text-muted);">
                        ${metaInfo} | Размер: ${(material.file_size / (1024 * 1024)).toFixed(2)} МБ
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #5f6368; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">
                        ${material.description || 'Без описания'}
                    </p>
                </div>
                <span class="material-open-arrow" style="color: var(--text-muted); font-size: 18px; margin-left: 8px;">›</span>
            `;

            card.addEventListener("click", () => {
                openMaterialDetails(material.id, currentCategoryId, currentCategoryName, currentUserData);
            });

            list.appendChild(card);
        });
    } catch (err) {
        list.innerHTML = "<p style='color: red;'>Не удалось загрузить список материалов.</p>";
    }
}

let isUploadModalInitialized = false;

// Действия админа (обработка создания курса и загрузки материалов)
function initAdminActionEvents() {
    // Кнопка добавления курса
    document.getElementById("btn-create-course").addEventListener("click", () => {
        openCreateCourseModal(currentCategoryId, currentUserData, () => {
            loadCategoryCourses();
        });
    });
    // Кнопка "Загрузить материал" — открытие модального окна
    document.getElementById("btn-create-material").addEventListener("click", () => {
        const modal = document.getElementById("material-upload-modal");
        const typeSelect = document.getElementById("upload-material-type");
        const fileInput = document.getElementById("upload-material-file");
        const coverInput = document.getElementById("upload-material-cover");
        const closeBtn = document.getElementById("btn-close-upload-modal");
        const closeIcon = document.getElementById("close-upload-modal-icon");

        // Создаём элементы для ошибок, если их нет
        let fileErrorSpan = document.getElementById("upload-file-error");
        if (!fileErrorSpan) {
            fileErrorSpan = document.createElement("span");
            fileErrorSpan.id = "upload-file-error";
            fileErrorSpan.style.cssText = "font-size: 12px; color: #d93025; margin-top: 4px; display: none;";
            fileInput.parentNode.appendChild(fileErrorSpan);
        }

        let coverErrorSpan = document.getElementById("upload-cover-error");
        if (!coverErrorSpan) {
            coverErrorSpan = document.createElement("span");
            coverErrorSpan.id = "upload-cover-error";
            coverErrorSpan.style.cssText = "font-size: 12px; color: #d93025; margin-top: 4px; display: none;";
            coverInput.parentNode.appendChild(coverErrorSpan);
        }

        // Сброс ошибок при открытии модалки
        fileErrorSpan.style.display = "none";
        coverErrorSpan.style.display = "none";

        if (typeSelect && fileInput) {
            typeSelect.addEventListener("change", (e) => {
                const selectedType = e.target.value;
                if (selectedType === "book") {
                    fileInput.accept = ".pdf,application/pdf";
                } else if (selectedType === "video") {
                    fileInput.accept = ".mp4,video/mp4";
                }
                // Сбрасываем файл при смене типа
                fileInput.value = "";
                fileErrorSpan.style.display = "none";
            });
            // Установить начальное значение
            if (typeSelect.value === "book") {
                fileInput.accept = ".pdf,application/pdf";
            } else {
                fileInput.accept = ".mp4,video/mp4";
            }

            // Обновленная валидация
            fileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) {
                    fileErrorSpan.style.display = "none";
                    return;
                }

                const validation = validateFileByType(file, typeSelect.value);
                if (!validation.valid) {
                    fileErrorSpan.textContent = validation.message;
                    fileErrorSpan.style.display = "block";
                    fileInput.value = "";
                    return;
                }
                fileErrorSpan.style.display = "none";

                if (hasCyrillicInFilename(file)) {
                    fileErrorSpan.textContent = "Кириллица в названии файла запрещена. Переименуйте латиницей";
                    fileErrorSpan.style.display = "block";
                    fileInput.value = "";
                    return;
                }
            });
        }

        // Валидация обложки (добавлено)
        coverInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) {
                coverErrorSpan.style.display = "none";
                return;
            }

            const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
            if (!isImage) {
                coverErrorSpan.textContent = `Обложка должна быть изображением. Выбран: ${file.name}`;
                coverErrorSpan.style.display = "block";
                coverInput.value = "";
                return;
            }

            if (hasCyrillicInFilename(file)) {
                coverErrorSpan.textContent = "Кириллица в названии файла запрещена";
                coverErrorSpan.style.display = "block";
                coverInput.value = "";
                return;
            }

            coverErrorSpan.style.display = "none";
        });
        // Добавлено: закрытие модалки по "крестику" и кнопки "отмена"
        if (closeIcon && modal) {
            closeIcon.onclick = (e) => {
                e.preventDefault();
                modal.classList.add("hidden");
                const form = document.getElementById("material-upload-form");
                if (form) form.reset();
            };
        }

        if (closeBtn && modal) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                modal.classList.add("hidden");
                if (form) form.reset();
            };
        }

        if (modal) modal.classList.remove("hidden");
    });
    // Инициализация модального окна (1 раз)
    if (!isUploadModalInitialized) {
        const modal = document.getElementById("material-upload-modal");
        const form = document.getElementById("material-upload-form");
        const closeBtn = document.getElementById("btn-close-upload-modal");
        const closeIcon = document.getElementById("close-upload-modal-icon");

        // Закрытие окна по кнопке "Отмена"
        if (closeBtn && modal) {
            closeBtn.addEventListener("click", () => {
                modal.classList.add("hidden");
                form.reset();
            });
        }

        // Закрытие окна по "крестику"
        if (closeIcon && modal) {
            closeIcon.addEventListener("click", () => {
                modal.classList.add("hidden");
                form.reset();
            });
        }

        // Перехват отправки формы
        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();

                const type = document.getElementById("upload-material-type").value;
                const fileInput = document.getElementById("upload-material-file");
                if (fileInput.files.length > 0) {
                    const validation = validateFileByType(fileInput.files[0], type);
                    if (!validation.valid) {
                        alert(validation.message);
                        return; // Блокируем отправку
                    }
                }

                // Сбор текстовые данных из полей
                const title = document.getElementById("upload-material-title").value.trim();
                const author = document.getElementById("upload-material-author").value.trim();
                const description = document.getElementById("upload-material-description").value.trim();
                const tags = document.getElementById("upload-material-tags").value.trim();
                // Получение файлов из инпутов
                const coverInput = document.getElementById("upload-material-cover");
                // Формирование объекта FormData для данных
                const formData = new FormData();
                formData.append('type', type);
                formData.append('title', title);
                formData.append('author', author);
                formData.append('description', description);
                formData.append('category_id', currentCategoryId);
                formData.append('tags', tags);
                // Если файлы прикреплены, добавляем их в formData
                if (fileInput.files.length > 0) {
                    formData.append('file', fileInput.files[0]);
                }
                if (coverInput.files.length > 0) {
                    formData.append('cover', coverInput.files[0]);
                }

                try {
                    // Блокировка кнопки на время загрузки большого файла
                    const submitBtn = document.getElementById("btn-submit-material");
                    const originalText = submitBtn.innerText;
                    submitBtn.innerText = "Загрузка файла...";
                    submitBtn.disabled = true;

                    const response = await fetch(`${API_BASE_URL}/materials`, {
                        method: 'POST',
                        headers: {
                            // Передача токена текущего пользователя (админ-суперюзер)
                            'Authorization': `Bearer ${currentUserData.token}`
                        },
                        body: formData
                    });

                    // Возвращаем кнопку в исходное состояние
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;

                    if (response.ok) {
                        alert("Новый материал успешно загружен на сервер");
                        // Закрытие модального окна и очистка поля формы
                        modal.classList.add("hidden");
                        form.reset();
                        // обновляем список самостоятельных материалов на экране (чтобы увидеть сразу созданный)
                        loadCategoryStandaloneMaterials();
                    } else {
                        const errData = await response.json();
                        alert(errData.message || "Ошибка при сохранении материала на сервере");
                    }
                } catch (error) {
                    console.error("Ошибка сети при отправке FormData:", error);
                    alert("Сетевая ошибка. Возможно, размер файла слишком большой или сервер недоступен");
                }
            });
        }

        isUploadModalInitialized = true;
    }
}