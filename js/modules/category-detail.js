let currentCategoryId = null;
let currentCategoryName = "";
// Открытие категории - для просмотра курсов-материалов
export async function openCategoryDetails(categoryId, categoryName, currentUser) {
    currentCategoryId = categoryId;
    currentCategoryName = categoryName;

    const categoriesContainer = document.getElementById("categories-container");
    const addCategoryBtn = document.getElementById("add-category-btn");
    const pageTitle = document.getElementById("page-title");

    if (!categoriesContainer) return;

    categoriesContainer.classList.add("hidden");
    if (addCategoryBtn) addCategoryBtn.style.display = "none";

    // Меняем заголовок страницы для навигации
    if (pageTitle) pageTitle.innerText = `Категории / ${categoryName}`;

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
        if ((currentUser.role === "admin" || currentUser.role === "superuser") && addCategoryBtn) {
            addCategoryBtn.style.display = "inline-flex";
        }
    });

    // Проверка прав доступа
    if (currentUser.role === "admin" || currentUser.role === "superuser") {
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
        const sessionData = JSON.parse(localStorage.getItem("currentUser"));
        const response = await fetch(`${API_BASE_URL}/admin/categories/${currentCategoryId}/courses`, {
            method: "GET",
            headers: { "X-User-Id": sessionData.id }
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
            card.className = "category-card"; // Стиль карточек - как у категорий
            card.innerHTML = `
                <div class="category-header">
                    <div class="category-title">${course.title}</div>
                    <div class="category-description">${course.description || "Описание курса отсутствует."}</div>
                </div>
                <div class="category-footer">
                    <span>Открыть программу курса</span>
                </div>
            `;
            card.addEventListener("click", () => {
                // Логика открытия структуры курса (на будущее)
                alert(`Открываем структуру курса: ${course.title}`);
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
        const sessionData = JSON.parse(localStorage.getItem("currentUser"));
        const response = await fetch(`${API_BASE_URL}/admin/categories/${currentCategoryId}/materials`, {
            method: "GET",
            headers: { "X-User-Id": sessionData.id }
        });

        if (!response.ok) throw new Error("Ошибка сервера");
        const materials = await response.json();

        list.innerHTML = "";
        if (materials.length === 0) {
            list.innerHTML = "<p style='color: var(--text-muted);'>Прямые учебные материалы в эту категорию еще не добавлены.</p>";
            return;
        }

        materials.forEach(material => {
            const row = document.createElement("div");
            row.className = "material-row-card";

            const typeLabel = material.type === "book" ? "Книга" : "Видео";
            const typeClass = material.type === "book" ? "type-book" : "type-video";
            const metaInfo = material.type === "book" ? `Автор: ${material.author || "Не указан"}` : "Доступно для воспроизведения"; // Для фильтра по автору

            row.innerHTML = `
                <div class="material-info">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-row-title">${material.title}</span>
                        <span class="material-type-tag ${typeClass}">${typeLabel}</span>
                    </div>
                    <div class="material-row-meta">${metaInfo} | Размер: ${(material.file_size / (1024 * 1024)).toFixed(2)} МБ</div>
                </div>
                <button class="btn-outline" style="padding: 6px 14px; font-size: 13px;">Открыть</button>
            `;

            row.querySelector("button").addEventListener("click", () => {
                alert(`Открываем материал: ${material.title}`);
            });

            list.appendChild(row);
        });
    } catch (err) {
        list.innerHTML = "<p style='color: red;'>Не удалось загрузить список материалов.</p>";
    }
}

// Действия админа (обработка создания курса)
function initAdminActionEvents() {
    document.getElementById("btn-create-course").addEventListener("click", () => {
        // Далее обработаем
        alert(`Тест создания курса для категории ID: ${currentCategoryId}`);
    });

    document.getElementById("btn-create-material").addEventListener("click", () => {
        // Далее обработаем
        alert(`Тест добавления материала для категории ID: ${currentCategoryId}`);
    });
}