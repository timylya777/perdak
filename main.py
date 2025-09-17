import os
import subprocess
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlparse
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime
import uvicorn
import ollama

app = FastAPI(title="NeuroChat API", version="1.0")

# Добавляем CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Настройка путей
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
DB_PATH = os.path.join(BASE_DIR, "links.db")

# Подключаем статические файлы
app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")

# Инициализация шаблонов
templates = Jinja2Templates(directory=os.path.join(FRONTEND_DIR, "templates"))

# Глобальные переменные
OLLAMA_MODEL = "llama3:8b-instruct-q4_0"
OLLAMA_HOST = "127.0.0.1:11434"

def setup_ollama_config():
    """Настройка конфигурации Ollama для GPU"""
    config_dir = os.path.expanduser("~/.ollama")
    config_file = os.path.join(config_dir, "config.json")
    
    # Создаем директорию если не существует
    os.makedirs(config_dir, exist_ok=True)
    
    # Конфигурация для GPU
    config = {
        "host": OLLAMA_HOST,
        "num_gpu": 1,           # Использовать GPU
        "num_thread": 8,        # Количество потоков
        "batch_size": 512,      # Размер батча
        "main_gpu": 0,          # Основная видеокарта
    }
    
    # Записываем конфигурацию
    with open(config_file, 'w') as f:
        import json
        json.dump(config, f, indent=2)
    
    print(f"Конфигурация Ollama создана: {config_file}")

def check_ollama_status():
    """Проверка статуса Ollama сервера"""
    try:
        # Простая проверка подключения
        ollama.list()
        print("✅ Ollama сервер запущен и доступен")
        return True
    except Exception as e:
        print(f"❌ Ollama сервер недоступен: {e}")
        return False

def start_ollama_server():
    """Запуск Ollama сервера если не запущен"""
    if check_ollama_status():
        return True
    
    print("🔄 Запускаем Ollama сервер...")
    try:
        # Запускаем Ollama в фоновом режиме
        subprocess.Popen(["ollama", "serve"], 
                        stdout=subprocess.DEVNULL, 
                        stderr=subprocess.DEVNULL)
        
        # Ждем запуска
        for _ in range(10):
            time.sleep(1)
            if check_ollama_status():
                print("✅ Ollama сервер успешно запущен")
                return True
        
        print("❌ Не удалось запустить Ollama сервер")
        return False
        
    except Exception as e:
        print(f"❌ Ошибка запуска Ollama: {e}")
        return False

def check_model_availability():
    """Проверка доступности модели"""
    try:
        models = ollama.list()
        model_names = [model['name'] for model in models['models']]
        
        if OLLAMA_MODEL in model_names:
            print(f"✅ Модель {OLLAMA_MODEL} доступна")
            return True
        else:
            print(f"⚠️  Модель {OLLAMA_MODEL} не найдена. Доступные модели: {model_names}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка проверки моделей: {e}")
        return False

def download_model_if_needed():
    """Скачивание модели если не установлена"""
    if check_model_availability():
        return True
    
    print(f"📥 Скачиваем модель {OLLAMA_MODEL}...")
    try:
        # Показываем прогресс загрузки
        stream = ollama.pull(OLLAMA_MODEL, stream=True)
        for progress in stream:
            if 'completed' in progress and 'total' in progress:
                percent = (progress['completed'] / progress['total']) * 100
                print(f"Прогресс загрузки: {percent:.1f}%")
        
        print(f"✅ Модель {OLLAMA_MODEL} успешно скачана")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка загрузки модели: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Запускается при старте приложения"""
    print("🚀 Запуск NeuroChat API...")
    
    # Настраиваем конфигурацию Ollama
    setup_ollama_config()
    
    # Запускаем Ollama сервер
    if not start_ollama_server():
        print("⚠️  Продолжаем без Ollama сервера")
        return
    
    # Проверяем и скачиваем модель если нужно
    if not check_model_availability():
        print("🔄 Попытка скачать модель...")
        download_model_if_needed()
    
    print("✅ Приложение готово к работе")

@app.get("/")
async def read_root(request: Request):
    """Главная страница"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/chat")
async def api_chat(request: Request):
    """Endpoint для совместимости с фронтендом"""
    try:
        data = await request.json()
        question = data.get("message", data.get("question", "")).strip()
        
        if not question:
            return JSONResponse({"error": "Сообщение не может быть пустым"}, status_code=400)
        
        print(f"💬 Запрос через /api/chat: {question[:50]}...")
        
        # Используем ту же логику что и в /ai-question
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": question}],
            options={
                "num_gpu": 1,
                "num_thread": 8,
                "num_predict": 384,
                "temperature": 0.7,
                "top_p": 0.9,
            }
        )
        
        ai_response = response['message']['content']
        
        return {
            "message": ai_response,
            "response": ai_response,  # для совместимости
            "question": question,
            "model": OLLAMA_MODEL
        }
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
@app.get("/health")
async def health_check():
    """Проверка здоровья приложения"""
    try:
        ollama_status = check_ollama_status()
        model_status = check_model_availability()
        
        return {
            "status": "healthy" if ollama_status and model_status else "degraded",
            "ollama": "running" if ollama_status else "not running",
            "model": "available" if model_status else "not available",
            "model_name": OLLAMA_MODEL,
            "gpu": "enabled"
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}, 500

@app.post("/ai-question")
async def get_ai_response(request: Request):
    """Обработка запросов к AI"""
    try:
        data = await request.json()
        question = data.get("question", "").strip()
        
        if not question:
            return JSONResponse({"error": "Вопрос не может быть пустым"}, status_code=400)
        
        if len(question) > 1000:
            return JSONResponse({"error": "Слишком длинный вопрос"}, status_code=400)
        
        # Проверяем доступность Ollama
        if not check_ollama_status():
            return JSONResponse({
                "error": "Ollama сервер не запущен. Запустите: ollama serve"
            }, status_code=503)
        
        print(f"🤖 Обработка запроса: {question[:50]}...")
        
        # Отправляем запрос к нейросети с оптимизацией для GPU
        start_time = time.time()
        
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": question}],
            options={
                "num_gpu": 1,
                "num_thread": 8,
                "num_predict": 512,  # Ограничение длины ответа
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
            }
        )
        
        processing_time = time.time() - start_time
        ai_response = response['message']['content']
        
        print(f"✅ Ответ получен за {processing_time:.2f} сек, длина: {len(ai_response)} символов")
        
        return {
            "question": question,
            "answer": ai_response,
            "processing_time": round(processing_time, 2),
            "model": OLLAMA_MODEL
        }
        
    except ConnectionError:
        return JSONResponse({
            "error": "Сервер AI недоступен. Проверьте запущен ли Ollama: ollama serve"
        }, status_code=503)
        
    except Exception as e:
        print(f"❌ Ошибка обработки запроса: {e}")
        return JSONResponse({
            "error": f"Внутренняя ошибка сервера: {str(e)}"
        }, status_code=500)

@app.get("/models")
async def get_available_models():
    """Получить список доступных моделей"""
    try:
        models = ollama.list()
        return {"models": models['models']}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/system-info")
async def get_system_info():
    """Информация о системе"""
    try:
        # Получаем информацию о модели
        model_info = ollama.show(OLLAMA_MODEL)
        
        return {
            "gpu_available": True,
            "model": OLLAMA_MODEL,
            "model_parameters": model_info.get('parameters', 'unknown'),
            "model_size": model_info.get('size', 'unknown'),
            "system": "Windows" if os.name == 'nt' else "Linux/Mac"
        }
    except Exception as e:
        return {"gpu_available": False, "error": str(e)}

# Контекстный менеджер для работы с БД
@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Инициализация БД
def init_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                model TEXT DEFAULT 'llama3'
            )
        ''')
        conn.commit()

# Инициализируем БД при старте
init_db()

if __name__ == "__main__":
    print("🌟 Запуск NeuroChat с ускорением на RTX 4060")
    print(f"📊 Используемая модель: {OLLAMA_MODEL}")
    print("🌐 Сервер доступен по адресу: http://127.0.0.1:25567")
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=25567,
        log_level="info",
        timeout_keep_alive=300  # Увеличиваем таймаут для долгих запросов
    )