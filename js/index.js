import { openCategoryDetails } from './modules/category-detail.js';

document.addEventListener("DOMContentLoaded", () => {
    const sessionData = localStorage.getItem("currentUser");
    if (!sessionData) {
        window.location.replace("./authWindow.html");
        return;
    }

    const currentUser = JSON.parse(sessionData);

    // Переменные для хранения ID перед удалением/редактированием
    let categoryIdToDelete = null;

    // Ссылки на элементы модальных окон
    const categoryModal = document.getElementById("category-modal");
    const categoryForm = document.getElementById("category-form");

    const editCategoryModal = document.getElementById("edit-category-modal");
    const editCategoryForm = document.getElementById("edit-category-form");

    const deleteConfirmModal = document.getElementById("delete-confirm-modal");

    // Новые элементы для окна подтверждения выхода
    const logoutBtn = document.getElementById("logout-btn");
    const logoutConfirmModal = document.getElementById("logout-confirm-modal");
    const confirmLogoutNo = document.getElementById("confirm-logout-no");
    const confirmLogoutYes = document.getElementById("confirm-logout-yes");

    // Ссылки на контейнеры контента управления отображением страниц
    const categoriesContainer = document.getElementById("categories-container");
    const usersManagementContainer = document.getElementById("users-management-container");
    const pageTitle = document.getElementById("page-title");
    const navLinks = document.querySelectorAll(".sidebar-nav a");

    if (document.getElementById("user-email")) {
        const displayEmail = currentUser.email || currentUser.login || "Email не указан";
        const displayName = currentUser.name || "Пользователь";
        document.getElementById("user-email").innerText = `${displayName} (${displayEmail})`;
    }
    const roleBadge = document.getElementById("user-role-badge");
    if (roleBadge) {
        if (currentUser.role === "employee") roleBadge.innerText = "Роль: Сотрудник";
        if (currentUser.role === "admin") roleBadge.innerText = "Роль: Администратор (HR)";
        if (currentUser.role === "superuser") roleBadge.innerText = "Роль: Суперюзер";
    }

    // Управление блоков в боковом меню
    const adminBlock = document.getElementById("admin-block");
    const superuserBlock = document.getElementById("superuser-block");
    // Для юзера все закрыто
    if (currentUser.role === "employee") {
        if (adminBlock) adminBlock.style.display = "none";
        if (superuserBlock) superuserBlock.style.display = "none";
    }
    // Для админа открыт добавление материала и категорий
    else if (currentUser.role === "admin") {
        if (adminBlock) adminBlock.style.display = "block";
        if (superuserBlock) superuserBlock.style.display = "none";
    }
    // Для суперюзера админ + назначение админов
    else if (currentUser.role === "superuser") {
        if (adminBlock) adminBlock.style.display = "block";
        if (superuserBlock) superuserBlock.style.display = "block";
    }
    // Логика модального окна для создания категорий
    const addCategoryBtn = document.getElementById("add-category-btn");
    if (currentUser.role === "admin" || currentUser.role === "superuser") {
        if (addCategoryBtn) addCategoryBtn.style.display = "inline-flex";
    }

    // Переключение вкладок сбоку
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (href && !href.startsWith("#")) return;

            e.preventDefault();
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            const linkText = link.innerText.trim();
            if (pageTitle) pageTitle.innerText = linkText;

            categoriesContainer?.classList.add("hidden");
            usersManagementContainer?.classList.add("hidden");

            // Скрытие лишних окон при переключении
            document.getElementById("category-detail-container")?.classList.add("hidden");
            if (addCategoryBtn) addCategoryBtn.style.display = "none";

            // Логика отображения в зависимости от выбранного пункта меню
            if (linkText === "Список категорий" || linkText === "Категории") {
                categoriesContainer?.classList.remove("hidden");
                if ((currentUser.role === "admin" || currentUser.role === "superuser") && addCategoryBtn) {
                    addCategoryBtn.style.display = "inline-flex";
                }
                loadCategories(); // Метод загрузки списка категорий
            }
            else if (linkText === "Назначить админов") {
                usersManagementContainer?.classList.remove("hidden");
                loadAllUsers(); // Метод загрузки списка пользователей
            }
        });
    });

    // Функции закрытия модалок
    const closeCategoryModal = () => { categoryModal?.classList.add("hidden"); categoryForm?.reset(); };
    const closeEditModal = () => { editCategoryModal?.classList.add("hidden"); editCategoryForm?.reset(); };
    const closeDeleteModal = () => { deleteConfirmModal?.classList.add("hidden"); categoryIdToDelete = null; };
    const closeLogoutModal = () => { logoutConfirmModal?.classList.add("hidden"); };

    // Привязка закрытия окон
    addCategoryBtn?.addEventListener("click", () => categoryModal?.classList.remove("hidden"));
    document.getElementById("close-modal-icon")?.addEventListener("click", closeCategoryModal);
    document.getElementById("cancel-category-btn")?.addEventListener("click", closeCategoryModal);

    document.getElementById("close-edit-modal-icon")?.addEventListener("click", closeEditModal);
    document.getElementById("cancel-edit-category-btn")?.addEventListener("click", closeEditModal);

    document.getElementById("confirm-delete-no")?.addEventListener("click", closeDeleteModal);

    // Логика подтверждения выхода из системы
    logoutBtn?.addEventListener("click", () => logoutConfirmModal?.classList.remove("hidden"));
    confirmLogoutNo?.addEventListener("click", closeLogoutModal);
    confirmLogoutYes?.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        window.location.replace("./authWindow.html");
    });

    // Закрытие выпадающего меню-троеточия при клике по любому другому месту экрана
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".category-menu-container")) {
            document.querySelectorAll(".category-dropdown").forEach(menu => menu.classList.add("hidden"));
        }
    });

    // Загрузка категорий
    async function loadCategories() {
        try {
            // Формируем чистый эндпоинт GET
            const response = await fetch(`${API_BASE_URL}/admin/categories`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${currentUser.token}` // Обновление под токен
                }
            });

            if (!response.ok) return;
            const data = await response.json();

            // Парсим массив ответа от бекенда
            let categoriesArray = [];
            if (Array.isArray(data)) {
                categoriesArray = data;
            } else if (data && Array.isArray(data.categories)) {
                categoriesArray = data.categories;
            } else if (data && data.category) {
                categoriesArray = [data.category];
            }

            renderCategories(categoriesArray);
        } catch (err) {
            console.error("Ошибка загрузки:", err);
        }
    }

    // Отображение категорий
    function renderCategories(categories) {
        const container = document.getElementById("categories-container");
        if (!container) return;
        container.innerHTML = "";

        if (categories.length === 0) {
            container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--text-muted);'>Категорий пока нет.</p>";
            return;
        }

        categories.forEach(category => {
            const card = document.createElement("div");
            card.className = "category-card";
            // Троеточие рендерится только для админ-суперюзер
            const hasAccess = currentUser.role === "admin" || currentUser.role === "superuser";

            card.innerHTML = `
            <div class="category-header">
                <div class="category-title">${category.name}</div>
                <div class="category-description">
                    ${category.description ? category.description : "Описание отсутствует"}
                </div>
            </div>
            <div class="category-footer">
                <span>Открыть</span>
                
                ${hasAccess ? `
                <div class="category-menu-container" style="position: relative;">
                    <button class="category-menu-btn" data-id="${category.id}">&#8942;</button>
                    <div class="category-dropdown hidden" id="dropdown-${category.id}">
                        <div class="category-dropdown-item edit-item" 
                             data-id="${category.id}" 
                             data-name="${category.name}" 
                             data-desc="${category.description || ''}">Редактировать</div>
                        <div class="category-dropdown-item delete-item" 
                             data-id="${category.id}" 
                             data-name="${category.name}">Удалить</div>
                    </div>
                </div>
                ` : ""}
            </div>
        `;
            // Переход внутрь категории
            card.addEventListener("click", (e) => {
                // Если троеточие-выпадающие окна - возврат
                if (e.target.closest(".category-menu-container")) return;
                // Вызов функции детализации (курсы-материалы)
                openCategoryDetails(category.id, category.name, currentUser);
            });

            container.appendChild(card);
        });

        initCardMenuEvents();
    }

    // Кнопки меню
    function initCardMenuEvents() {
        document.querySelectorAll(".category-menu-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const currentDropdown = document.getElementById(`dropdown-${id}`);

                document.querySelectorAll(".category-dropdown").forEach(menu => {
                    if (menu !== currentDropdown) menu.classList.add("hidden");
                });

                currentDropdown?.classList.toggle("hidden");
            });
        });

        document.querySelectorAll(".category-dropdown-item.delete-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                categoryIdToDelete = item.dataset.id;
                const catName = item.dataset.name;

                document.getElementById("delete-confirm-text").innerText = `Вы действительно хотите удалить категорию '${catName}'?`;
                deleteConfirmModal?.classList.remove("hidden");
                item.parentElement.classList.add("hidden");
            });
        });

        document.querySelectorAll(".category-dropdown-item.edit-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();

                document.getElementById("edit-category-id").value = item.dataset.id;
                document.getElementById("edit-category-name").value = item.dataset.name;
                document.getElementById("edit-category-description").value = item.dataset.desc;

                editCategoryModal?.classList.remove("hidden");
                item.parentElement.classList.add("hidden");
            });
        });
    }

    // Отправка создания
    if (categoryForm) {
        categoryForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById("category-name").value.trim();
            const descInput = document.getElementById("category-description").value.trim();

            try {
                const response = await fetch(`${API_BASE_URL}/admin/categories`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify({ name: nameInput, description: descInput })
                });

                if (response.status === 201 || response.ok) {
                    alert("Категория успешно добавлена.");
                    closeCategoryModal();
                    loadCategories();
                } else if (response.status === 400) {
                    const errorData = await response.json();
                    alert(errorData.message || "Категория с таким названием уже существует.");
                } else {
                    alert(`Ошибка сервера: ${response.status}`);
                }
            } catch (error) {
                alert("Ошибка сети при отправке.");
            }
        });
    }

    // Отправка редактирования
    if (editCategoryForm) {
        editCategoryForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("edit-category-id").value;
            const updatedName = document.getElementById("edit-category-name").value.trim();
            const updatedDesc = document.getElementById("edit-category-description").value.trim();

            try {
                const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify({ name: updatedName, description: updatedDesc })
                });

                if (response.ok) {
                    alert("Категория успешно обновлена.");
                    closeEditModal();
                    loadCategories();
                } else if (response.status === 400) {
                    const errorData = await response.json();
                    alert(errorData.message || "Это название уже используется другой категорией.");
                } else {
                    alert(`Не удалось сохранить изменения. Статус: ${response.status}`);
                }
            } catch (error) {
                console.error(error);
                alert("Ошибка сети при обновлении категории.");
            }
        });
    }

    document.getElementById("confirm-delete-yes")?.addEventListener("click", async () => {
        if (!categoryIdToDelete) return;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryIdToDelete}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${currentUser.token}`
                }
            });

            if (response.ok) {
                closeDeleteModal();
                loadCategories();
            } else {
                const err = await response.json();
                alert(err.message || "Не удалось удалить категорию.");
            }
        } catch (error) {
            alert("Ошибка сети при удалении.");
        }
    });

    // Загрузка списка пользователей (для суперюзера)
    async function loadAllUsers() {
        const listBody = document.getElementById("users-list-body");
        if (!listBody) return;
        listBody.innerHTML = "<div style='padding: 20px; text-align: center;'>Загрузка списка пользователей...</div>";

        try {
            // Обновление под токен
            const response = await fetch(`${API_BASE_URL}/admin/users`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${currentUser.token}`
                }
            });

            if (!response.ok) {
                listBody.innerHTML = "<div style='padding: 20px; text-align: center; color: red;'>Не удалось загрузить пользователей.</div>";
                return;
            }

            const data = await response.json();
            listBody.innerHTML = "";

            let usersArray = [];
            if (Array.isArray(data)) {
                usersArray = data;
            } else if (data && Array.isArray(data.users)) {
                usersArray = data.users;
            } else if (data && data.all_users && Array.isArray(data.all_users)) {
                usersArray = data.all_users;
            }

            const filteredUsers = usersArray.filter(user => user.role !== "superuser");

            if (filteredUsers.length === 0) {
                listBody.innerHTML = "<div style='padding: 20px; text-align: center;'>Других пользователей в системе не найдено.</div>";
                return;
            }

            filteredUsers.forEach(user => {
                const row = document.createElement("div");
                row.style.display = "grid";
                row.style.gridTemplateColumns = "2fr 2fr 1fr 40px";
                row.style.padding = "12px 16px";
                row.style.alignItems = "center";
                row.style.borderBottom = "1px solid var(--border-color)";

                const roleText = user.role === "admin" ? "Администратор" : "Сотрудник";
                const actionText = user.role === "admin" ? "Снять роль администратора" : "Назначить администратором";
                const targetRole = user.role === "admin" ? "employee" : "admin";

                row.innerHTML = `
                    <div style="font-weight: 500; color: var(--text-main);">${user.full_name || "ФИО не указано"}</div>
                    <div style="color: var(--text-muted);">${user.login || "Email не указан"}</div>
                    <div><span class="badge">${roleText}</span></div>
                    <div class="category-menu-container" style="position: relative; text-align: right;">
                        <button class="user-menu-btn" data-id="${user.id}" style="background:none; border:none; font-size: 20px; color: var(--text-muted); cursor:pointer;">&#8942;</button>
                        <div class="category-dropdown hidden" id="user-dropdown-${user.id}" style="right: 0; bottom: auto; top: 30px;">
                            <div class="category-dropdown-item change-role-btn" data-id="${user.id}" data-role="${targetRole}">${actionText}</div>
                        </div>
                    </div>
                `;
                listBody.appendChild(row);
            });

            initUserActions();

        } catch (error) {
            console.error("Ошибка при получении пользователей:", error);
            listBody.innerHTML = "<div style='padding: 20px; text-align: center; color: red;'>Ошибка обработки данных сервера.</div>";
        }
    }

    function initUserActions() {
        document.querySelectorAll(".user-menu-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const userId = btn.dataset.id;
                const targetMenu = document.getElementById(`user-dropdown-${userId}`);

                document.querySelectorAll(".category-dropdown").forEach(menu => {
                    if (menu !== targetMenu) menu.classList.add("hidden");
                });

                targetMenu?.classList.toggle("hidden");
            });
        });

        document.querySelectorAll(".change-role-btn").forEach(item => {
            item.addEventListener("click", async (e) => {
                e.stopPropagation();
                const targetUserId = item.dataset.id;
                const newRole = item.dataset.role;

                try {
                    const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}/role`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${currentUser.token}` // Обновление под токен
                        },
                        body: JSON.stringify({ role: newRole })
                    });

                    if (response.ok) {
                        alert("Роль пользователя успешно изменена.");
                        loadAllUsers();
                    } else {
                        const err = await response.json();
                        alert(err.message || "Не удалось изменить роль.");
                    }
                } catch (error) {
                    alert("Ошибка сети при обновлении роли.");
                }
            });
        });
    }

    loadCategories();
});