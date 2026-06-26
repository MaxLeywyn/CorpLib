// Тест (без БД)
const TEST_USERS = [
    { email: "user@company.com", password: "user123", role: "employee", name: "Иван Сотрудник" },
    { email: "hr@company.com", password: "hr123", role: "admin", name: "Ольга HR" },
    { email: "root@company.com", password: "root123", role: "superuser", name: "Алексей Суперюзер" }
];

function initDatabase() {
    if (!localStorage.getItem("users_db")) {
        localStorage.setItem("users_db", JSON.stringify(TEST_USERS));
    }
}

initDatabase();

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
//ТЕСТ СВЯЗИ С БД
if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // сбор email-pass
        const loginInput = document.getElementById("login-email").value.trim();
        const passwordInput = document.getElementById("login-password").value;

        const requestBody = {
            login: loginInput,
            password: passwordInput
        };

        try {
            // Отправка POST-запроса на бэкенд
            const response = await fetch(`${window.API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            // Чтение ответа сервера
            const data = await response.json();

            // Проверка статуса ответа
            if (response.ok && data.status === "success") {

                // Сохраняем реальные данные с сервера в сессию
                localStorage.setItem("currentUser", JSON.stringify({
                    id: data.user.id,
                    email: data.user.login,
                    role: data.user.role,
                    name: data.user.name
                }));

                // перенаправляем на главную страницу
                window.location.replace("main.html");

            } else {
                // Если сервер ответил ошибкой
                alert("Ошибка авторизации. Проверьте логин и пароль.");
            }

        } catch (error) {
            // Если сервер вообще не ответил (или блок запроса)
            console.error("Сетевая ошибка:", error);
            alert("Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.");
        }
    });
}

// Регистрация (сырой вариант)
const registerForm = document.getElementById("register-form");

if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const nameInput = document.getElementById("register-name").value.trim();
        const emailInput = document.getElementById("register-email").value.trim();
        const passwordInput = document.getElementById("register-password").value;

        let users = JSON.parse(localStorage.getItem("users_db"));

        const userExists = users.some(u => u.email === emailInput);

        if (userExists) {
            alert("Пользователь с таким email уже существует.");
            return;
        }

        // создание нового пользователя (базовая роль)
        const newUser = {
            email: emailInput,
            password: passwordInput,
            role: "employee",
            name: nameInput
        };

        // добавляем в базу и сохраняем
        users.push(newUser);
        localStorage.setItem("users_db", JSON.stringify(users));

        // автоматически логиним пользователя после успешной регистрации
        localStorage.setItem("currentUser", JSON.stringify({
            email: newUser.email,
            role: newUser.role,
            name: newUser.name
        }));

        alert("Регистрация прошла успешно!");
        window.location.replace("main.html");
    });
}