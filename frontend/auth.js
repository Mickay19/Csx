// auth.js - версия для продакшена
class AuthSystem {
    constructor() {
        // Автоматическое определение URL для продакшена и разработки
        this.apiBaseUrl = window.location.hostname.includes('render.com') 
            ? 'https://csx-backend.onrender.com/api'
            : 'http://localhost:3000/api';
        
        this.currentUser = null;
        this.token = null;
        this.init();
        
        console.log('🔧 API URL:', this.apiBaseUrl);
    }

    // Инициализация системы
    init() {
        this.loadFromStorage();
        this.updateUI();
    }

    // Загрузка данных из localStorage
    loadFromStorage() {
        this.token = localStorage.getItem('csx_token');
        const userData = localStorage.getItem('csx_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    // Сохранение данных в localStorage
    saveToStorage() {
        if (this.token) {
            localStorage.setItem('csx_token', this.token);
        }
        if (this.currentUser) {
            localStorage.setItem('csx_user', JSON.stringify(this.currentUser));
        }
    }

    // Очистка данных
    clearStorage() {
        localStorage.removeItem('csx_token');
        localStorage.removeItem('csx_user');
        this.token = null;
        this.currentUser = null;
    }

    // Регистрация пользователя
    async register(userData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка регистрации');
            }

            const data = await response.json();
            this.setAuthData(data);
            return data;

        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // Вход пользователя
    async login(username, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка входа');
            }

            const data = await response.json();
            this.setAuthData(data);
            return data;

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Установка данных авторизации
    setAuthData(authData) {
        this.token = authData.token;
        this.currentUser = authData.user;
        this.saveToStorage();
        this.updateUI();
    }

    // Выход пользователя
    logout() {
        this.clearStorage();
        this.updateUI();
        window.location.reload();
    }

    // Проверка авторизации
    checkAuth() {
        const isAuthenticated = !!(this.token && this.currentUser);
        this.updateUI();
        return isAuthenticated;
    }

    // Обновление интерфейса
    updateUI() {
        const authElements = document.querySelectorAll('.auth-required');
        const unauthElements = document.querySelectorAll('.unauth-required');
        const userDisplay = document.getElementById('userDisplay');
        const authSection = document.getElementById('authSection');

        if (this.currentUser) {
            // Пользователь авторизован
            authElements.forEach(el => el.style.display = 'block');
            unauthElements.forEach(el => el.style.display = 'none');
            
            if (userDisplay) {
                userDisplay.textContent = this.currentUser.username;
            }
            
            if (authSection) {
                authSection.innerHTML = `
                    <span style="color: white; margin-right: 10px;">Привет, ${this.currentUser.username}</span>
                    <button onclick="authSystem.logout()" class="auth-button">Выйти</button>
                `;
            }
        } else {
            // Пользователь не авторизован
            authElements.forEach(el => el.style.display = 'none');
            unauthElements.forEach(el => el.style.display = 'block');
            
            if (userDisplay) {
                userDisplay.textContent = '';
            }
            
            if (authSection) {
                authSection.innerHTML = `
                    <button onclick="showAuthModal()" class="auth-button">Войти</button>
                `;
            }
        }
    }

    // Получение заголовков для авторизованных запросов
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = this.token;
        }
        
        return headers;
    }

    // Проверка токена
    isTokenValid() {
        return !!(this.token && this.currentUser);
    }

    // Получение информации о пользователе
    getUserInfo() {
        return this.currentUser;
    }

    // Проверка доступности сервера
    async checkServerHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (!response.ok) throw new Error('Server not responding');
            return await response.json();
        } catch (error) {
            throw new Error('Сервер не доступен');
        }
    }

    // Показать модальное окно авторизации
    showAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.style.display = 'block';
        }
    }
}

// Создаем глобальный экземпляр системы аутентификации
const authSystem = new AuthSystem();