import { openCourseStructure } from './course-detail.js';
// Загрузка раздела "мое обучение"
export async function loadMyLearning(currentUser) {
    if (!currentUser) {
        const sessionData = localStorage.getItem("currentUser");
        if (!sessionData) {
            window.location.replace("./authWindow.html");
            return;
        }
        currentUser = JSON.parse(sessionData);
    }

    const container = document.getElementById("my-learning-container");
    if (!container) return;

    // Сбрасываем контент и ставим лоад-бара
    container.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>Загрузка вашего прогресса...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/courses/my-learning`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${currentUser.token}` }
        });

        if (!response.ok) throw new Error("Не удалось загрузить прогресс обучения");

        const courses = await response.json();
        container.innerHTML = "";

        const inProgress = [];
        const completed = [];

        courses.forEach(course => {
            const progressPercent = course.total_materials > 0
                ? Math.round((course.completed_materials / course.total_materials) * 100)
                : 0;

            if (progressPercent === 100 && course.total_materials > 0) {
                completed.push({ ...course, progressPercent });
            } else if (progressPercent > 0) {
                inProgress.push({ ...course, progressPercent });
            }
        });

        // Блок "В процессе обучения"
        if (inProgress.length > 0) {
            const inProgressTitle = document.createElement("h2");
            inProgressTitle.className = "my-learning-section-title";
            inProgressTitle.innerText = "В процессе обучения";
            container.appendChild(inProgressTitle);

            const inProgressGrid = document.createElement("div");
            inProgressGrid.className = "courses-grid";
            inProgressGrid.innerHTML = inProgress.map(course => createCourseCard(course, false)).join('');
            container.appendChild(inProgressGrid);
        } else {
            const emptyTitle = document.createElement("h2");
            emptyTitle.className = "my-learning-section-title";
            emptyTitle.innerText = "В процессе обучения";
            container.appendChild(emptyTitle);

            const emptyGrid = document.createElement("div");
            emptyGrid.className = "courses-grid";
            emptyGrid.innerHTML = "<p style='color: var(--text-muted); grid-column: 1/-1;'>У вас пока нет курсов в процессе обучения</p>";
            container.appendChild(emptyGrid);
        }

        // Блок "Пройденные курсы"
        if (completed.length > 0) {
            const completedTitle = document.createElement("h2");
            completedTitle.className = "my-learning-section-title";
            completedTitle.innerText = "Пройденные курсы";
            container.appendChild(completedTitle);

            const completedGrid = document.createElement("div");
            completedGrid.className = "courses-grid";
            completedGrid.innerHTML = completed.map(course => createCourseCard(course, true)).join('');
            container.appendChild(completedGrid);
        } else {
            const emptyTitle = document.createElement("h2");
            emptyTitle.className = "my-learning-section-title";
            emptyTitle.innerText = "Пройденные курсы";
            container.appendChild(emptyTitle);

            const emptyGrid = document.createElement("div");
            emptyGrid.className = "courses-grid";
            emptyGrid.innerHTML = "<p style='color: var(--text-muted); grid-column: 1/-1;'>Вы ещё не завершили ни один курс</p>";
            container.appendChild(emptyGrid);
        }

        // События клика
        container.querySelectorAll(".category-card").forEach(card => {
            card.addEventListener("click", () => {
                const courseId = card.dataset.id;
                const catId = card.dataset.catId;
                const catName = card.dataset.catName;

                // Скрытие my-learning-container
                container.classList.add("hidden");

                // Скрытие categories-container
                const categoriesContainer = document.getElementById("categories-container");
                if (categoriesContainer) {
                    categoriesContainer.classList.add("hidden");
                }

                let categoryDetailContainer = document.getElementById("category-detail-container");
                if (!categoryDetailContainer) {
                    console.log("Создаем новый category-detail-container");
                    categoryDetailContainer = document.createElement("div");
                    categoryDetailContainer.id = "category-detail-container";
                    const contentBody = document.querySelector(".content-body");
                    if (contentBody) {
                        contentBody.appendChild(categoryDetailContainer);
                    }
                } else {
                    categoryDetailContainer.classList.remove("hidden");
                }

                // Вызываем openCourseStructure
                openCourseStructure(courseId, catId, catName, currentUser);
            });
        });

    } catch (error) {
        console.error("Ошибка в loadMyLearning:", error);
        container.innerHTML = `<p style="color: red; padding: 20px;">Не удалось загрузить прогресс: ${error.message}</p>`;
    }
}
// Создание карточки пройденного курса (выглядит тусклее, чем основа)
function createCourseCard(course, isCompleted) {
    const description = course.description || "Описание курса отсутствует.";
    const shortDescription = description.length > 100 ? description.substring(0, 100) + '...' : description;

    const completedClass = isCompleted ? ' course-completed' : '';
    const progressInfo = isCompleted
        ? `Пройдено: ${course.completed_materials}/${course.total_materials}`
        : `Пройдено: ${course.completed_materials}/${course.total_materials} (${course.progressPercent}%)`;

    return `
        <div class="category-card${completedClass}" data-id="${course.id}" data-cat-id="${course.category_id}" data-cat-name="${course.category_name}">
            <div class="category-header">
                <div class="category-title">${course.title}</div>
                <div class="category-description">${shortDescription}</div>
                <div class="course-progress-info" style="margin-top: 12px; font-size: 12px; color: #dfe7ec;">
                    ${progressInfo}
                </div>
            </div>
            <div class="category-footer">
                <span>${isCompleted ? 'Курс завершён' : 'Открыть программу курса'}</span>
            </div>
        </div>
    `;
}