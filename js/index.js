document.addEventListener("DOMContentLoaded", () => {
    const sessionData = localStorage.getItem("currentUser");
    if (!sessionData) {
        window.location.replace("./authWindow.html");
        return;
    }

    const currentUser = JSON.parse(sessionData);

    // Вывод ФИО и роль в интерфейс
    if (document.getElementById("user-email")) {
        document.getElementById("user-email").innerText = `${currentUser.name} (${currentUser.email})`;
    }

    const roleBadge = document.getElementById("user-role-badge");

    // Роль в футер
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
    const categoryModal = document.getElementById("category-modal");
    const closeModalIcon = document.getElementById("close-modal-icon");
    const cancelCategoryBtn = document.getElementById("cancel-category-btn");
    const categoryForm = document.getElementById("category-form");

    // Отображение кнопки только для нужных ролей
    if (currentUser.role === "admin" || currentUser.role === "superuser") {
        if (addCategoryBtn) {
            addCategoryBtn.style.display = "inline-flex";
        }
    }

    // Закрытие модального окна
    const closeCategoryModal = () => {
        if (categoryModal) categoryModal.classList.add("hidden");
        if (categoryForm) categoryForm.reset(); // Очищаем поля формы
    };

    // Открытие модального окна по клику
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener("click", () => {
            if (categoryModal) {
                categoryModal.classList.remove("hidden");
            }
        });
    }

    if (closeModalIcon) closeModalIcon.addEventListener("click", closeCategoryModal);
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener("click", closeCategoryModal);

    // Отправка POST-запроса на бэкенд
    if (categoryForm) {
        categoryForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nameInput = document.getElementById("category-name").value.trim();
            const descInput = document.getElementById("category-description").value.trim();

            const requestBody = {
                name: nameInput,
                description: descInput
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/categories`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-Id": currentUser.id // Идентификатор пользователя (с бека)
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.status === 201 || response.ok) {
                    alert("Категория успешно добавлена.");
                    closeCategoryModal();
                } else if (response.status === 400) {
                    const errorData = await response.json();
                    alert(errorData.message || "Ошибка: Категория с таким названием уже существует.");
                } else if (response.status === 401) {
                    alert("Ошибка 401: Недостаточно прав или не передан ID пользователя.");
                } else {
                    alert(`Непредвиденная ошибка. Статус: ${response.status}`);
                }
            } catch (error) {
                console.error("Сбой сети:", error);
                alert("Ошибка подключения к серверу. Убедитесь, что бэкенд запущен.");
            }
        });
    }
});