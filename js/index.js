document.addEventListener("DOMContentLoaded", () => {
    // Проверка авторизации пользователя
    const sessionData = localStorage.getItem("currentUser");

    if (!sessionData) {
        // Отправляем на страницу входа если нет
        window.location.href = "authWindow.html";
        return;
    }

    // Тест без БД
    const currentUser = JSON.parse(sessionData);

    // Отображение данных пользователя в шапке
    document.getElementById("user-email").innerText = `${currentUser.name} (${currentUser.email})`;

    const roleBadge = document.getElementById("user-role-badge");
    const adminBlock = document.getElementById("admin-block");
    const superuserBlock = document.getElementById("superuser-block");

    // Управление интерфейсом на основе Роли
    if (currentUser.role === "employee") {
        roleBadge.innerText = "Роль: Сотрудник";
        adminBlock.style.style.setProperty('display', 'none', 'important');
        superuserBlock.style.style.setProperty('display', 'none', 'important');
        adminBlock.style.display = "none";
        superuserBlock.style.display = "none";
    }
    else if (currentUser.role === "admin") {
        roleBadge.innerText = "Роль: Администратор (HR)";
        adminBlock.style.display = "block";
        superuserBlock.style.display = "none";
    }
    else if (currentUser.role === "superuser") {
        roleBadge.innerText = "Роль: Суперюзер";
        adminBlock.style.display = "block";
        superuserBlock.style.display = "block";
    }

    // Кнопка Выйти
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // Удаляем данные сессии
            localStorage.removeItem("currentUser");
            // Перенаправляем на форму входа (тест)
            window.location.href = "authWindow.html";
        });
    }
});