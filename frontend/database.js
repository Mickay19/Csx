// database.js - Сервис для работы с базой данных
class DatabaseService {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    // Обертка для fetch с обработкой ошибок
    async fetchWithAuth(url, options = {}) {
        // Проверяем авторизацию
        if (!authSystem.checkAuth()) {
            throw new Error('Требуется авторизация');
        }

        // Добавляем заголовки авторизации
        const headers = {
            ...authSystem.getAuthHeaders(),
            ...options.headers
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}${url}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // Неавторизован - разлогиниваем
                authSystem.logout();
                throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка сервера');
            }

            return await response.json();

        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Сохранение сборки
    async saveBuild(buildData) {
        return await this.fetchWithAuth('/builds/save', {
            method: 'POST',
            body: JSON.stringify(buildData)
        });
    }

    // Получение сохраненных сборок пользователя
    async getSavedBuilds() {
        return await this.fetchWithAuth('/builds/user');
    }

    // Удаление сборки
    async deleteBuild(buildId) {
        return await this.fetchWithAuth(`/builds/${buildId}`, {
            method: 'DELETE'
        });
    }

    // Сохранение сравнения
    async saveComparison(comparisonData) {
        return await this.fetchWithAuth('/comparisons/save', {
            method: 'POST',
            body: JSON.stringify(comparisonData)
        });
    }

    // Получение сохраненных сравнений
    async getSavedComparisons() {
        return await this.fetchWithAuth('/comparisons/user');
    }

    // Удаление сравнения
    async deleteComparison(comparisonId) {
        return await this.fetchWithAuth(`/comparisons/${comparisonId}`, {
            method: 'DELETE'
        });
    }

    // Получение статистики пользователя
    async getUserStats() {
        return await this.fetchWithAuth('/users/stats');
    }

    // Поиск сборок по названию
    async searchBuilds(query) {
        const builds = await this.getSavedBuilds();
        return builds.filter(build => 
            build.build_name.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Получение сборки по ID
    async getBuildById(buildId) {
        const builds = await this.getSavedBuilds();
        return builds.find(build => build.id === parseInt(buildId));
    }

    // Обновление сборки
    async updateBuild(buildId, buildData) {
        // Сначала удаляем старую версию
        await this.deleteBuild(buildId);
        // Затем сохраняем новую
        return await this.saveBuild(buildData);
    }

    // Экспорт сборок в JSON
    async exportBuilds() {
        const builds = await this.getSavedBuilds();
        const data = {
            exportDate: new Date().toISOString(),
            user: authSystem.getUserInfo(),
            builds: builds
        };
        return JSON.stringify(data, null, 2);
    }

    // Импорт сборок из JSON
    async importBuilds(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            let importedCount = 0;

            for (const build of data.builds) {
                try {
                    await this.saveBuild({
                        build_name: build.build_name,
                        weapon_data: build.weapon_data,
                        settings_data: build.settings_data
                    });
                    importedCount++;
                } catch (error) {
                    console.warn(`Failed to import build: ${build.build_name}`, error);
                }
            }

            return {
                success: true,
                imported: importedCount,
                total: data.builds.length
            };
        } catch (error) {
            throw new Error('Неверный формат файла');
        }
    }

    // Создание резервной копии данных пользователя
    async createBackup() {
        const [builds, comparisons, stats] = await Promise.all([
            this.getSavedBuilds(),
            this.getSavedComparisons(),
            this.getUserStats()
        ]);

        const backup = {
            version: '1.0',
            backupDate: new Date().toISOString(),
            user: authSystem.getUserInfo(),
            data: {
                builds,
                comparisons,
                stats
            }
        };

        return backup;
    }

    // Восстановление из резервной копии
    async restoreFromBackup(backupData) {
        try {
            const backup = typeof backupData === 'string' ? 
                JSON.parse(backupData) : backupData;

            // Валидация backup
            if (!backup.data || !backup.data.builds) {
                throw new Error('Неверный формат резервной копии');
            }

            let restoredCount = 0;

            // Восстанавливаем сборки
            for (const build of backup.data.builds) {
                try {
                    await this.saveBuild({
                        build_name: build.build_name,
                        weapon_data: build.weapon_data,
                        settings_data: build.settings_data
                    });
                    restoredCount++;
                } catch (error) {
                    console.warn(`Failed to restore build: ${build.build_name}`, error);
                }
            }

            return {
                success: true,
                restored: restoredCount,
                total: backup.data.builds.length
            };

        } catch (error) {
            throw new Error('Ошибка восстановления: ' + error.message);
        }
    }

    // Очистка всех данных пользователя
    async clearAllData() {
        try {
            const [builds, comparisons] = await Promise.all([
                this.getSavedBuilds(),
                this.getSavedComparisons()
            ]);

            // Удаляем все сборки
            for (const build of builds) {
                await this.deleteBuild(build.id);
            }

            // Удаляем все сравнения
            for (const comparison of comparisons) {
                await this.deleteComparison(comparison.id);
            }

            return {
                success: true,
                deletedBuilds: builds.length,
                deletedComparisons: comparisons.length
            };

        } catch (error) {
            throw new Error('Ошибка очистки данных: ' + error.message);
        }
    }

    // Получение истории действий (заглушка для будущей реализации)
    async getActivityHistory(limit = 50) {
        // В будущем можно добавить трекинг действий
        return [];
    }

    // Проверка лимитов использования
    async checkUsageLimits() {
        try {
            const [builds, comparisons, stats] = await Promise.all([
                this.getSavedBuilds(),
                this.getSavedComparisons(),
                this.getUserStats()
            ]);

            return {
                builds: {
                    count: builds.length,
                    limit: 1000, // Пример лимита
                    percentage: (builds.length / 1000) * 100
                },
                comparisons: {
                    count: comparisons.length,
                    limit: 500,
                    percentage: (comparisons.length / 500) * 100
                }
            };
        } catch (error) {
            throw new Error('Ошибка проверки лимитов: ' + error.message);
        }
    }
}

// Создаем глобальный экземпляр сервиса базы данных
const databaseService = new DatabaseService();

// Вспомогательные функции для работы с данными
const DataUtils = {
    // Форматирование даты
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Сокращение длинного текста
    truncateText(text, maxLength = 50) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // Форматирование чисел
    formatNumber(number) {
        return new Intl.NumberFormat('ru-RU').format(number);
    },

    // Валидация email
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // Генерация уникального ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Глубокая копия объекта
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // Слияние объектов
    mergeObjects(target, source) {
        return { ...target, ...source };
    },

    // Проверка на пустой объект
    isEmpty(obj) {
        return Object.keys(obj).length === 0;
    },

    // Фильтрация null/undefined значений
    filterFalsy(arr) {
        return arr.filter(item => item != null);
    },

    // Группировка по ключу
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }
};