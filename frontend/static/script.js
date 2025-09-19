class NeuroChat {
    constructor() {
        this.messagesContainer = document.getElementById('messages-container');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.clearChatBtn = document.getElementById('clear-chat');
        this.welcomeMessage = document.getElementById('welcome-message');
        this.isLoading = false;

        this.initEventListeners();
    }

    initEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        
        // Обработчики для предложенных вопросов
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.dataset.question;
                this.messageInput.value = question;
                this.sendMessage();
            });
        });

        // Автоматическое изменение высоты textarea
        this.messageInput.addEventListener('input', this.autoResizeTextarea.bind(this));
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isLoading) return;

        // Скрываем приветственное сообщение после первого сообщения
        if (this.welcomeMessage.style.display !== 'none') {
            this.welcomeMessage.style.display = 'none';
        }

        // Добавляем сообщение пользователя
        this.addMessage(message, 'user');

        // Очищаем input
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Блокируем интерфейс во время запроса
        this.setLoading(true);

        try {
            // Отправляем запрос к нейросети
            const response = await this.sendToAI(message);
            
            // Добавляем ответ нейросети
            this.addMessage(response, 'ai');
            
        } catch (error) {
            console.error('Ошибка:', error);
            this.addMessage('Извините, произошла ошибка. Попробуйте еще раз.', 'ai');
        } finally {
            this.setLoading(false);
        }
    }

    async sendToAI(question) {
        const API_URL = '/ai-question';

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: question })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.answer;
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (sender === 'user') {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(text)}</div>
                    <div class="message-time">${this.getCurrentTime()}</div>
                </div>
            `;
            messageDiv.appendChild(avatar);
        } else {
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
            messageDiv.appendChild(avatar);
            messageDiv.innerHTML += `
                <div class="message-content">
                    <div class="message-text">${this.formatAIResponse(text)}</div>
                    <div class="message-time">${this.getCurrentTime()}</div>
                </div>
            `;
        }

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatAIResponse(text) {
        // Форматирование ответа AI (замена переносов на <br>)
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.sendButton.disabled = loading;
        this.messageInput.disabled = loading;
        
        if (loading) {
            this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    clearChat() {
        this.messagesContainer.innerHTML = '';
        this.welcomeMessage.style.display = 'block';
    }
}

// Инициализация чата когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    new NeuroChat();
});
// Функция для переключения темы
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    // Переключаем тему
    if (body.classList.contains('dark-theme')) {
        // Переключаем на светлую тему
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    } else {
        // Переключаем на темную тему
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    }
}
// Функция для загрузки сохраненной темы
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        body.classList.add('light-theme');
    }
}

// Функция для определения системных предпочтений
function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

// Инициализация темы при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем сохраненную тему или определяем системную
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = detectSystemTheme();
    
    if (!savedTheme) {
        // Если тема не сохранена, используем системную
        localStorage.setItem('theme', systemTheme);
    }
    
    loadSavedTheme();
    
    // Добавляем обработчик события для кнопки
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
});

// Слушаем изменения системной темы
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            // Если пользователь не выбирал тему вручную, следуем системным настройкам
            const newTheme = e.matches ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            loadSavedTheme();
        }
    });
}