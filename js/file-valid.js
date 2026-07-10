// Валидация подгружаеммых данных
export function validateFileByType(file, contentType) {
    if (!file) {
        return { valid: false, message: "Файл не выбран" };
    }

    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (contentType === 'book') {
        // Разрешён только PDF
        const isPdfByExtension = fileName.endsWith('.pdf');
        const isPdfByMime = mimeType === 'application/pdf';

        if (isPdfByExtension || isPdfByMime) {
            return { valid: true, message: "" };
        }
        return {
            valid: false,
            message: `Для типа "Книга" допустим только формат PDF. Выбран файл: ${file.name}`
        };
    }

    if (contentType === 'video') {
        // Разрешён только MP4
        const isMp4ByExtension = fileName.endsWith('.mp4');
        const isMp4ByMime = mimeType === 'video/mp4';

        if (isMp4ByExtension || isMp4ByMime) {
            return { valid: true, message: "" };
        }
        return {
            valid: false,
            message: `Для типа "Видеоурок" допустим только формат MP4. Выбран файл: ${file.name}`
        };
    }

    return { valid: false, message: "Неизвестный тип контента" };
}

// Проверка кириллицы в имени файла
export function hasCyrillicInFilename(file) {
    return file && /[А-Яа-яЁё]/.test(file.name);
}