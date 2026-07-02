import { openCategoryDetails } from './category-detail.js';

export async function openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser) {
    const detailContainer = document.getElementById("category-detail-container");
    if (!detailContainer) return;

    detailContainer.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>Загрузка программы курса...</p>";

    try {
        // Обновление под токен
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/structure`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${currentUser.token}`
            }
        });

        if (!response.ok) throw new Error("Ошибка при загрузке структуры курса");
        const courseData = await response.json();

        detailContainer.innerHTML = `
            <div class="course-structure-wrapper" style="display: flex; flex-direction: column; gap: 20px; width: 100%;">
                <button id="btn-back-to-category-items" class="btn-back">← Назад к материалам категории</button>
                
                <div class="course-info-block" style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 22px;">${courseData.title}</h2>
                    <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">${courseData.description || "Без описания"}</p>
                </div>

                <div class="course-progress-panel" style="background: var(--warm-blue-bg); padding: 16px; border-radius: 8px; border: 1px solid #e1e8ed;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 14px; color: var(--text-main); margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                        <span>Прогресс обучения:</span>
                        <span style="color: var(--primary-blue);">${courseData.progress.percent}% (${courseData.progress.completed_lessons} / ${courseData.progress.total_lessons})</span>
                    </div>
                    <div style="width: 100%; background: #e1e8ed; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${courseData.progress.percent}%; background: var(--primary-blue); height: 100%; transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <div id="course-modules-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
            </div>
        `;

        document.getElementById("btn-back-to-category-items").addEventListener("click", () => {
            openCategoryDetails(currentCategoryId, currentCategoryName, currentUser);
        });

        const modulesListContainer = document.getElementById("course-modules-list");

        courseData.modules.forEach(module => {
            const moduleBlock = document.createElement("div");
            moduleBlock.className = "module-accordion-item";
            moduleBlock.style.cssText = "background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;";

            moduleBlock.innerHTML = `
                <div class="module-title" style="background: var(--warm-blue-bg); padding: 14px 20px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color);">
                    ${module.title}
                </div>
                <div class="module-lessons-list" style="padding: 8px 20px;"></div>
            `;

            const lessonsContainer = moduleBlock.querySelector(".module-lessons-list");

            if (module.materials.length === 0) {
                lessonsContainer.innerHTML = "<p style='color: var(--text-muted); font-size: 13px; padding: 8px 0;'>В этом модуле еще нет учебных материалов.</p>";
            }
            // Отображение строк с уроками-материалами внутри модуля
            module.materials.forEach(material => {
                const lessonRow = document.createElement("div");
                lessonRow.className = "lesson-row";
                lessonRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;";

                const statusText = material.is_completed ? "Изучено" : "Ожидает";
                const statusColor = material.is_completed ? "#1b5e20" : "var(--text-muted)";
                const typeLabel = material.type === "book" ? "Книга" : "Видео";

                lessonRow.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span style="font-size: 12px; font-weight: 600; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.5px;">[${statusText}]</span>
                        <span style="font-weight: 500; color: var(--text-main);">${material.title}</span>
                        <span style="font-size: 11px; color: var(--primary-blue); background: #e3f2fd; padding: 2px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase;">${typeLabel}</span>
                    </div>
                    <button class="btn-outline" style="padding: 6px 14px; font-size: 13px; min-width: 90px;">Изучить</button>
                `;

                // Логика изучения курса (сырая)
                lessonRow.querySelector("button").addEventListener("click", async () => {
                    try {
                        // Особенность от бека - проверить оба случая
                        const exactMaterialId = material.id || material.material_id || 0;

                        console.log("ID материала:", exactMaterialId); // Отладка

                        const trackResponse = await fetch(`${API_BASE_URL}/history/track`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${currentUser.token}`
                            },
                            body: JSON.stringify({ material_id: exactMaterialId })
                        });

                        if (trackResponse.ok) {
                            alert(`Урок "${material.title}" успешно пройден! Прогресс обновлен`);
                            openCourseStructure(courseId, currentCategoryId, currentCategoryName, currentUser);
                        } else {
                            const errData = await trackResponse.json();
                            alert(errData.message || "Не удалось зафиксировать изучение");
                        }
                    } catch (error) {
                        alert("Ошибка сети при отправке данных о прогрессе");
                    }
                });

                lessonsContainer.appendChild(lessonRow);
            });

            modulesListContainer.appendChild(moduleBlock);
        });

    } catch (err) {
        detailContainer.innerHTML = `<p style='color: red; padding: 20px;'>${err.message}</p>`;
    }
}