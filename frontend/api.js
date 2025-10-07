// api.js - ОБНОВЛЕННАЯ версия
class CSX_API {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('csx_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        console.log(`🔄 API Call: ${options.method || 'GET'} ${url}`);
        
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': this.token }),
                    ...options.headers
                },
                ...options
            };

            if (options.body) {
                config.body = JSON.stringify(options.body);
            }

            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP ${response.status}`;
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('✅ API Success:', data);
            return data;

        } catch (error) {
            console.error('❌ API Error:', error.message);
            
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Сервер не доступен. Запустите бэкенд: node server.js');
            }
            
            throw error;
        }
    }

    // Проверка здоровья сервера
    async health() {
        return await this.request('/health');
    }

    // Регистрация
    async register(userData) {
        const result = await this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
        
        if (result.token) {
            this.token = result.token;
            localStorage.setItem('csx_token', this.token);
            localStorage.setItem('csx_user', JSON.stringify(result.user));
        }
        
        return result;
    }

    // Вход
    async login(credentials) {
        const result = await this.request('/auth/login', {
            method: 'POST',
            body: credentials
        });
        
        if (result.token) {
            this.token = result.token;
            localStorage.setItem('csx_token', this.token);
            localStorage.setItem('csx_user', JSON.stringify(result.user));
        }
        
        return result;
    }

    // Сохранение сборки
    async saveBuild(buildData) {
        return await this.request('/builds/save', {
            method: 'POST',
            body: buildData
        });
    }

    // Получение сборок пользователя
    async getBuilds() {
        return await this.request('/builds/user');
    }

    // Сохранение сравнения
    async saveComparison(comparisonData) {
        return await this.request('/comparisons/save', {
            method: 'POST',
            body: comparisonData
        });
    }

    // Получение сравнений
    async getComparisons() {
        return await this.request('/comparisons/user');
    }

    // Получение статистики
    async getStats() {
        return await this.request('/stats');
    }

    // Выход
    logout() {
        this.token = null;
        localStorage.removeItem('csx_token');
        localStorage.removeItem('csx_user');
    }

    // Проверка авторизации
    isAuthenticated() {
        return !!this.token && !!localStorage.getItem('csx_user');
    }

    // Получение пользователя
    getUser() {
        const user = localStorage.getItem('csx_user');
        return user ? JSON.parse(user) : null;
    }

    // Получение заголовков авторизации
    getAuthHeaders() {
        return {
            'Authorization': this.token,
            'Content-Type': 'application/json'
        };
    }
}

// Глобальный экземпляр API
const csxAPI = new CSX_API();