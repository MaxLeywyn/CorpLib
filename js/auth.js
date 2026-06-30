// Переключение форм
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');

// Показ регистрации, сокрытие входа
if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    });
}

// Показ входа, скрытие регистрации
if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });
}

// ВХОД
const loginForm = document.getElementById("login-form");
// Работа с БД
if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault(); // Запрещаем перезагрузку страницы

        // Забираем данные из полей ввода формы
        const loginInput = document.getElementById("login-email").value.trim();
        const passwordInput = document.getElementById("login-password").value;

        // Упаковываем в объект
        const requestBody = {
            login: loginInput,
            password: passwordInput
        };

        try {
            // Отправка запроса на сервер
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            // Проверка ответа сервер
            if (response.ok && data.status === "success") {
                // Сохранение пользователя в localStorage
                localStorage.setItem("currentUser", JSON.stringify({
                    id: data.user.id,
                    email: data.user.login,
                    role: data.user.role,
                    name: data.user.name
                }));

                // переход на главное окно
                window.location.replace("./main.html");

            } else {
                // Ошибка с бека (пример - неверный пароль)
                alert(data.message || "Неверный логин или пароль.");
            }

        } catch (error) {
            // Ошибка сети
            console.error("Ошибка сети:", error);
            alert("Не удалось связаться с сервером.");
        }
    });
}

// Регистрация (лучше вариант)
const registerForm = document.getElementById("register-form");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Сбор данных из полей ввода
        const nameInput = document.getElementById("register-name").value.trim();
        const emailInput = document.getElementById("register-email").value.trim();
        const passwordInput = document.getElementById("register-password").value;

        // Формирование тела запроса бекенду
        const requestBody = {
            login: emailInput,
            password: passwordInput,
            full_name: nameInput
        };

        try {
            // Отправка на бэкенд
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            // Обработка ответа сервера
            if (response.ok && data.status === "success") {
                alert("Регистрация прошла успешно!");
                // Автоматически авторизуем пользователя, сохраняя сессию
                localStorage.setItem("currentUser", JSON.stringify({
                    id: data.user.id,
                    email: data.user.login,
                    role: data.user.role,
                    name: data.user.name
                }));

                // Перенаправляем в ЛК
                window.location.replace("./main.html");

            } else {
                // Если бэкенд вернул ошибку (повтор почты?)
                alert(data.message || "Ошибка при регистрации. Возможно, этот email уже занят.");
            }

        } catch (error) {
            console.error("Сетевая ошибка при регистрации:", error);
            alert("Не удалось связаться с сервером для регистрации.");
        }
    });
}
// Логика отображения пароля при нажатии на глазок
document.querySelectorAll('.toggle-password-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);

        if (passwordInput) {
            if (passwordInput.type === 'password') {
                // Переводим в тип "текст" и подсвечиваем синим "глазок"
                passwordInput.type = 'text';
                this.textContent = '👁';
                this.style.color = 'var(--primary-blue)';
            } else {
                // Обратно в тип "пароль"
                passwordInput.type = 'password';
                this.textContent = '👁';
                this.style.color = 'var(--text-muted)';
            }
        }
    });
});