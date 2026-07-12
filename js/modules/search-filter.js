import { openCourseStructure } from './course-detail.js';
import { openMaterialDetails } from './material-detail.js';

// Модуль фильтрации
export function initSearchFilter(currentUser, apiBaseUrl) {
    createFilterSidebarMarkup();
    setupEventListeners(currentUser, apiBaseUrl);
    loadFilterDependencies(currentUser, apiBaseUrl);
}

// Сборка панели фильтра
function createFilterSidebarMarkup() {
    if (document.getElementById("filter-sidebar")) return;

    const overlay = document.createElement("div");
    overlay.id = "filter-overlay";
    overlay.className = "filter-overlay";
    document.body.appendChild(overlay);

    const sidebar = document.createElement("div");
    sidebar.id = "filter-sidebar";
    sidebar.className = "filter-sidebar";
    sidebar.innerHTML = `
        <div class="filter-sidebar-header">
            <h3>Фильтры каталога</h3>
            <button id="filter-close-btn" class="filter-close-btn">×</button>
        </div>
        <div class="filter-sidebar-body">
            <div class="filter-group">
                <label>Категории обучения</label>
                <div id="filter-categories-input" class="filter-input-field">Выбрать категории...</div>
                <div id="filter-categories-dropdown" class="filter-dropdown-list"></div>
            </div>
            <div class="filter-group">
                <label>Тип контента</label>
                <div id="filter-types-input" class="filter-input-field">Выбрать типы...</div>
                <div id="filter-types-dropdown" class="filter-dropdown-list">
                    <label class="filter-dropdown-item"><input type="checkbox" value="course"> Курсы</label>
                    <label class="filter-dropdown-item"><input type="checkbox" value="video"> Видеоуроки (MP4)</label>
                    <label class="filter-dropdown-item"><input type="checkbox" value="book"> Книги и PDF</label>
                </div>
            </div>
            <div class="filter-group">
                <label>Список тегов</label>
                <div id="filter-tags-input" class="filter-input-field">Выбрать теги...</div>
                <div id="filter-tags-dropdown" class="filter-dropdown-list"></div>
            </div>
            <div class="filter-group">
                <label>Ключевые слова или описание</label>
                <input type="text" id="filter-search-query" class="filter-input-field" placeholder="Введите название или текст описания..." style="cursor: text;">
            </div>
        </div>
        <div class="filter-sidebar-footer">
            <button id="filter-apply-btn" class="filter-apply-btn">Применить фильтр</button>
        </div>
    `;
    document.body.appendChild(sidebar);
}

// Обработчики событий панели
function setupEventListeners(currentUser, apiBaseUrl) {
    const sidebar = document.getElementById("filter-sidebar");
    const overlay = document.getElementById("filter-overlay");
    const toggleBtn = document.getElementById("filter-toggle-btn");
    const closeBtn = document.getElementById("filter-close-btn");
    const applyBtn = document.getElementById("filter-apply-btn");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.add("active");
            overlay.classList.add("active");
        });
    }

    const closeSidebar = () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        document.querySelectorAll(".filter-dropdown-list").forEach(d => d.classList.remove("show"));
    };

    closeBtn.addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);

    setupDropdownToggle("filter-categories-input", "filter-categories-dropdown");
    setupDropdownToggle("filter-types-input", "filter-types-dropdown");
    setupDropdownToggle("filter-tags-input", "filter-tags-dropdown");

    applyBtn.addEventListener("click", () => {
        closeSidebar();
        executeCatalogSearch(currentUser, apiBaseUrl);
    });
}

function setupDropdownToggle(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    input.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".filter-dropdown-list").forEach(d => {
            if (d.id !== dropdownId) d.classList.remove("show");
        });
        dropdown.classList.toggle("show");
    });

    dropdown.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => dropdown.classList.remove("show"));
}

// Загрузка тегов и категорий
async function loadFilterDependencies(currentUser, apiBaseUrl) {
    try {
        // Загрузка категорий
        const catRes = await fetch(`${apiBaseUrl}/admin/categories`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${currentUser.token}` }
        });

        if (catRes.ok) {
            const data = await catRes.json();
            let categories = [];
            if (Array.isArray(data)) {
                categories = data;
            } else if (data && Array.isArray(data.categories)) {
                categories = data.categories;
            }

            const container = document.getElementById("filter-categories-dropdown");
            container.innerHTML = categories.map(cat => `
                <label class="filter-dropdown-item">
                    <input type="checkbox" class="cat-checkbox" value="${cat.id}" data-name="${cat.name}">
                    ${cat.name}
                </label>
            `).join('');

            container.querySelectorAll('.cat-checkbox').forEach(ch => {
                ch.addEventListener('change', () => updateInputText('filter-categories-input', '.cat-checkbox', 'Выбрать категории...'));
            });
        } else {
            console.error("Не удалось загрузить категории. Статус:", catRes.status);
        }

        // Загрузка тегов
        const tagsRes = await fetch(`${apiBaseUrl}/materials/tags`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${currentUser.token}` }
        });

        if (tagsRes.ok) {
            const tagsData = await tagsRes.json();

            const tagsArray = Array.isArray(tagsData) ? tagsData : [];

            const tagsContainer = document.getElementById("filter-tags-dropdown");
            tagsContainer.innerHTML = tagsArray.map(tag => `
                <label class="filter-dropdown-item">
                    <input type="checkbox" class="tag-checkbox" value="${tag.name}">
                    ${tag.name}
                </label>
            `).join('');

            tagsContainer.querySelectorAll('.tag-checkbox').forEach(ch => {
                ch.addEventListener('change', () => updateInputText('filter-tags-input', '.tag-checkbox', 'Выбрать теги...'));
            });
        } else {
            console.error("Не удалось загрузить теги. Статус:", tagsRes.status);
        }

        // Загрузка типов контента (курс, книга, видео)
        document.querySelectorAll('#filter-types-dropdown input').forEach(ch => {
            ch.addEventListener('change', () => updateInputText('filter-types-input', '#filter-types-dropdown input', 'Выбрать типы...'));
        });

    } catch (err) {
        console.error("Ошибка инициализации списков фильтра:", err);
    }
}

function updateInputText(inputId, checkboxSelector, defaultText) {
    const checked = Array.from(document.querySelectorAll(checkboxSelector)).filter(c => c.checked);
    const input = document.getElementById(inputId);
    if (checked.length === 0) {
        input.innerText = defaultText;
    } else if (checked.length <= 2) {
        input.innerText = checked.map(c => c.parentElement.textContent.trim()).join(', ');
    } else {
        input.innerText = `Выбрано: ${checked.length}`;
    }
}


async function executeCatalogSearch(currentUser, apiBaseUrl) {

    // Скрытие всех других разделов
    const categoriesContainer = document.getElementById("categories-container");
    if (categoriesContainer) categoriesContainer.classList.add("hidden");

    const myLearningContainer = document.getElementById("my-learning-container");
    if (myLearningContainer) myLearningContainer.classList.add("hidden");

    const usersManagementContainer = document.getElementById("users-management-container");
    if (usersManagementContainer) usersManagementContainer.classList.add("hidden");

    const addCategoryBtn = document.getElementById("add-category-btn");
    if (addCategoryBtn) addCategoryBtn.style.display = "none";

    // Контейнер результата поиска
    let detailContainer = document.getElementById("category-detail-container");
    if (!detailContainer) {
        detailContainer = document.createElement("div");
        detailContainer.id = "category-detail-container";
        const categoriesEl = document.getElementById("categories-container");
        if (categoriesEl) {
            categoriesEl.parentNode.insertBefore(detailContainer, categoriesEl.nextSibling);
        }
    }
    detailContainer.classList.remove("hidden");
    detailContainer.innerHTML = "<p style='padding:20px; color:var(--text-muted);'>Поиск подходящих материалов...</p>";

    // Обновление заголовка с навигацией
    const pageTitle = document.getElementById("page-title");
    if (pageTitle) {
        pageTitle.innerHTML = `
            <span id="bc-home-search" style="cursor:pointer; color: var(--primary-blue); font-weight: 500;">Категории</span>
            <span style="color: var(--text-muted); margin: 0 6px;">/</span>
            <span style="color: var(--text-main);">Результаты поиска</span>
        `;
        document.getElementById("bc-home-search").addEventListener("click", () => {
            detailContainer.classList.add("hidden");
            if (categoriesContainer) categoriesContainer.classList.remove("hidden");
            if (addCategoryBtn) addCategoryBtn.style.display = "inline-flex";
            if (pageTitle) pageTitle.innerText = "Категории";
        });
    }

    // Сбор выбранных данных
    const category_ids = Array.from(document.querySelectorAll('.cat-checkbox'))
        .filter(c => c.checked).map(c => Number(c.value));
    const types = Array.from(document.querySelectorAll('#filter-types-dropdown input'))
        .filter(c => c.checked).map(c => c.value);
    const tags = Array.from(document.querySelectorAll('.tag-checkbox'))
        .filter(c => c.checked).map(c => c.value);
    const search_query = document.getElementById("filter-search-query").value.trim();

    console.log("Параметры поиска:", { types, category_ids, tags, search_query });

    try {
        const searchUrl = `${apiBaseUrl}/materials/search`;
        console.log("Тест запроса:", searchUrl);

        const response = await fetch(searchUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ types, category_ids, tags, search_query })
        });

        console.log("Ответ:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Ошибка:", errorText);
            throw new Error(`Ошибка ${response.status}`);
        }

        const results = await response.json();
        console.log("Результаты поиска:", results);
        renderSearchResults(results, detailContainer, currentUser);
    } catch (error) {
        console.error("Ошибка поиска:", error);
        detailContainer.innerHTML = `<p style='padding:20px; color:red;'>Не удалось получить результаты поиска: ${error.message}</p>`;
    }
}

// Отрисовка контейнеров результата поиска
function renderSearchResults(items, container, currentUser) {
    if (!items || items.length === 0) {
        container.innerHTML = "<p style='padding:20px; color:var(--text-muted); text-align:center;'>По вашему запросу ничего не найдено.</p>";
        return;
    }

    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "courses-grid";
    grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 20px 0; width: 100%;";

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "category-card";
        card.style.cssText = "background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); cursor: pointer; transition: .2s; display: flex; flex-direction: column; height: 100%;";

        const isCourse = item.type === "course";
        const typeLabel = isCourse ? "Курс" : (item.type === "book" ? "PDF" : "MP4");
        const footerLabel = isCourse ? "Открыть программу курса" : "Открыть материал";

        // Описание до 2 строк
        const description = item.description || "Описание отсутствует.";
        const shortDescription = description.length > 100 ? description.substring(0, 100) + '...' : description;

        card.innerHTML = `
            <div class="category-header" style="background: #607d8b; color: white; padding: 24px; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-end; flex-grow: 1;">
                <div class="category-title" style="font-size: 22px; font-weight: 500; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <span>${item.title}</span>
                    <span style="font-size: 11px; background: rgba(255,255,255,0.2); color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 600; white-space: nowrap;">
                        ${typeLabel}
                    </span>
                </div>
                <div class="category-description" style="color: #dfe7ec; font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${shortDescription}
                </div>
            </div>
            <div class="category-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #ffffff; border-top: 1px solid var(--border-color);">
                <span style="color: var(--primary-blue); font-weight: 500;">${footerLabel}</span>
            </div>
        `;

        // Вызов модуля по клику
        card.addEventListener("click", () => {
            console.log("Клик:", item);

            // Показываем category-detail-container
            const detailContainer = document.getElementById("category-detail-container");
            if (detailContainer) detailContainer.classList.remove("hidden");

            if (isCourse) {
                openCourseStructure(item.id, item.category_id, "Поиск", currentUser);
            } else {
                openMaterialDetails(item.id, item.category_id, "Поиск", currentUser);
            }
        });

        grid.appendChild(card);
    });

    container.appendChild(grid);
}