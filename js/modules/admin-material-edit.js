/* Функционал редактирования материалов */
export function openEditMaterialModal(material, currentUser, onSuccessCallback) {
    const existingModal = document.getElementById("admin-edit-material-modal");
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement("div");
    modalOverlay.id = "admin-edit-material-modal";
    modalOverlay.className = "modal-backdrop";

    // Редактирование материала (с привязкой к атрибуту)
    const fileAcceptFormat = material.type === 'book' ? '.pdf' : '.mp4,video/mp4';
    const typeLabel = material.type === 'book' ? 'Книга (PDF)' : 'Видеоурок (MP4)';

    modalOverlay.innerHTML = `
        <div class="modal-window" style="max-width: 550px; width: 100%;">
            <div class="modal-header" style="padding-bottom: 16px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px;">
                <h2 style="margin: 0; font-size: 20px;">Редактирование материала</h2>
                <button id="btn-close-edit-modal" class="btn-close" style="font-size: 24px;">&times;</button>
            </div>
            
            <form id="edit-material-form" style="display: flex; flex-direction: column; gap: 14px;">
                
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Тип контента (Нельзя изменить)</label>
                    <input type="text" disabled value="${typeLabel}" style="padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: #f8f9fa; color: var(--text-muted); cursor: not-allowed;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Название материала</label>
                    <input type="text" id="edit-mat-title" value="${material.title}" required style="padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Автор</label>
                    <input type="text" id="edit-mat-author" value="${material.author || ''}" style="padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Описание</label>
                    <textarea id="edit-mat-desc" rows="4" style="padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); resize: vertical;">${material.description || ''}</textarea>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Теги (через запятую)</label>
                    <input type="text" id="edit-mat-tags" value="${material.tags ? material.tags.join(', ') : ''}" style="padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Заменить файл контента</label>
                    <span style="font-size: 11px; color: var(--text-muted);">Допустимый формат: ${fileAcceptFormat}. Оставьте пустым, если файл менять не нужно.</span>
                    <input type="file" id="edit-mat-file" accept="${fileAcceptFormat}" style="font-size: 13px; margin-top: 4px;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Заменить обложку</label>
                    <input type="file" id="edit-mat-cover" accept="image/*" style="font-size: 13px; margin-top: 4px;">
                </div>

                <div class="modal-footer" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); justify-content: flex-end; gap: 12px;">
                    <button type="button" id="btn-cancel-edit" class="btn-outline">Отмена</button>
                    <button type="submit" id="btn-save-edit" class="btn-action-blue">Сохранить изменения</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    modalOverlay.classList.remove("hidden");

    const closeModal = () => modalOverlay.remove();
    document.getElementById("btn-close-edit-modal").addEventListener("click", closeModal);
    document.getElementById("btn-cancel-edit").addEventListener("click", closeModal);

    // Строгая валидация имен файлов
    const validateFilename = (inputElement) => {
        if (inputElement.files.length > 0) {
            const fileName = inputElement.files[0].name;
            const cyrillicPattern = /[А-Яа-яЁё]/;
            if (cyrillicPattern.test(fileName)) {
                alert("Использование кириллицы в названиях файлов запрещено. Используйте латинские буквы");
                inputElement.value = "";
            }
        }
    };

    document.getElementById("edit-mat-file").addEventListener("change", (e) => validateFilename(e.target));
    document.getElementById("edit-mat-cover").addEventListener("change", (e) => validateFilename(e.target));

    document.getElementById("edit-material-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const btnSave = document.getElementById("btn-save-edit");
        btnSave.disabled = true;
        btnSave.innerText = "Сохранение...";

        const formData = new FormData();
        formData.append("title", document.getElementById("edit-mat-title").value.trim());
        formData.append("author", document.getElementById("edit-mat-author").value.trim());
        formData.append("description", document.getElementById("edit-mat-desc").value.trim());

        const tagsString = document.getElementById("edit-mat-tags").value;
        if (tagsString) {
            const tagsArray = tagsString.split(',').map(t => t.trim()).filter(t => t);
            tagsArray.forEach(tag => formData.append("tags[]", tag));
        }

        const fileInput = document.getElementById("edit-mat-file").files[0];
        if (fileInput) formData.append("file", fileInput);

        const coverInput = document.getElementById("edit-mat-cover").files[0];
        if (coverInput) formData.append("cover", coverInput);

        try {
            const response = await fetch(`${API_BASE_URL}/admin/materials/${material.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${currentUser.token}`
                },
                body: formData
            });

            if (response.ok) {
                closeModal();
                if (onSuccessCallback) onSuccessCallback();
            } else {
                const errData = await response.json();
                alert(errData.message || "Ошибка при обновлении материала");
                btnSave.disabled = false;
                btnSave.innerText = "Сохранить изменения";
            }
        } catch (error) {
            alert("Сетевая ошибка при обновлении");
            btnSave.disabled = false;
            btnSave.innerText = "Сохранить изменения";
        }
    });
}