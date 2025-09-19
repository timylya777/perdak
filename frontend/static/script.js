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
// добавление модального окна настроек
document.addEventListener('DOMContentLoaded', function() {
            // Элементы модального окна
            const settingsBtn = document.getElementById('settings-btn');
            const settingsModal = document.getElementById('settings-modal');
            const closeSettings = document.getElementById('close-settings');
            const saveSettings = document.getElementById('save-settings');
            const resetSettings = document.getElementById('reset-settings');
            
            // Элементы настроек
            const themeButtons = document.querySelectorAll('.theme-btn');
            const fontSizeSlider = document.getElementById('font-size');
            const fontSizeValue = document.getElementById('font-size-value');
            const notificationsCheckbox = document.getElementById('notifications');
            const soundCheckbox = document.getElementById('sound-effects');
            const historyCheckbox = document.getElementById('history-saving');
            const typingCheckbox = document.getElementById('typing-indicator');
            
            // Открытие модального окна
            settingsBtn.addEventListener('click', function() {
                settingsModal.classList.add('active');
                loadCurrentSettings();
            });
            
            // Закрытие модального окна
            closeSettings.addEventListener('click', closeModal);
            settingsModal.addEventListener('click', function(e) {
                if (e.target === settingsModal) closeModal();
            });
            
            // Обработка выбора темы
            themeButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    themeButtons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                });
            });
            
            // Обновление значения размера шрифта
            fontSizeSlider.addEventListener('input', function() {
                fontSizeValue.textContent = `${this.value}px`;
            });
            
            // Сохранение настроек
            saveSettings.addEventListener('click', function() {
                const selectedTheme = document.querySelector('.theme-btn.active').dataset.theme;
                const fontSize = fontSizeSlider.value;
                const notifications = notificationsCheckbox.checked;
                const sound = soundCheckbox.checked;
                const history = historyCheckbox.checked;
                const typing = typingCheckbox.checked;
                
                // Сохранение в localStorage (в реальном приложении)
                localStorage.setItem('chatTheme', selectedTheme);
                localStorage.setItem('chatFontSize', fontSize);
                localStorage.setItem('chatNotifications', notifications);
                localStorage.setItem('chatSound', sound);
                localStorage.setItem('chatHistory', history);
                localStorage.setItem('chatTyping', typing);
                
                // Применение настроек
                applySettings({
                    theme: selectedTheme,
                    fontSize: fontSize,
                    notifications: notifications,
                    sound: sound,
                    history: history,
                    typing: typing
                });
                
                closeModal();
            });
            
            // Сброс настроек
            resetSettings.addEventListener('click', function() {
                if (confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
                    // Установка значений по умолчанию
                    themeButtons.forEach(btn => btn.classList.remove('active'));
                    document.querySelector('[data-theme="light"]').classList.add('active');
                    
                    fontSizeSlider.value = 16;
                    fontSizeValue.textContent = '16px';
                    
                    notificationsCheckbox.checked = true;
                    soundCheckbox.checked = true;
                    historyCheckbox.checked = true;
                    typingCheckbox.checked = false;
                    
                }
            });
            
            // Функция загрузки текущих настроек
            function loadCurrentSettings() {
                // Загрузка из localStorage (в реальном приложении)
                const theme = localStorage.getItem('chatTheme') || 'light';
                const fontSize = localStorage.getItem('chatFontSize') || 16;
                const notifications = localStorage.getItem('chatNotifications') !== 'false';
                const sound = localStorage.getItem('chatSound') !== 'false';
                const history = localStorage.getItem('chatHistory') !== 'false';
                const typing = localStorage.getItem('chatTyping') === 'true';
                
                // Установка значений в форму
                themeButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
                
                fontSizeSlider.value = fontSize;
                fontSizeValue.textContent = `${fontSize}px`;
                
                notificationsCheckbox.checked = notifications;
                soundCheckbox.checked = sound;
                historyCheckbox.checked = history;
                typingCheckbox.checked = typing;
            }
            
            // Функция применения настроек
            function applySettings(settings) {
                // Применение темы
                if (settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.body.classList.add('dark-theme');
                } else {
                    document.body.classList.remove('dark-theme');
                }
                
                // Применение размера шрифта
                document.body.style.fontSize = `${settings.fontSize}px`;
                
                // Здесь можно применить остальные настройки
                console.log('Настройки применены:', settings);
            }
            
            // Функция закрытия модального окна
            function closeModal() {
                settingsModal.classList.remove('active');
            }
            
            // Функция показа уведомления
            function showNotification(message) {
                // В реальном приложении здесь можно использовать toast-уведомление
                alert(message);
            }
            
            // Инициализация настроек при загрузке страницы
            const initialSettings = {
                theme: localStorage.getItem('chatTheme') || 'light',
                fontSize: localStorage.getItem('chatFontSize') || 16,
                notifications: localStorage.getItem('chatNotifications') !== 'false',
                sound: localStorage.getItem('chatSound') !== 'false',
                history: localStorage.getItem('chatHistory') !== 'false',
                typing: localStorage.getItem('chatTyping') === 'true'
            };
            
            applySettings(initialSettings);
        });