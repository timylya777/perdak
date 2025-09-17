import os
os.system("pip install -r req.txt")
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from urllib.parse import urlparse
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime
import uvicorn
import ollama

app = FastAPI()

# Настройка путей
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
DB_PATH = os.path.join(BASE_DIR, "links.db")

# Подключаем статические файлы
app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")

# Инициализация шаблонов
templates = Jinja2Templates(directory=os.path.join(FRONTEND_DIR, "templates"))


@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/ai-question")
async def get_ai_response(request: Request):
    data = await request.json()
    question = data.get("question")
    response = ollama.chat(model="llama3", messages=str(question))
    ai_response = response['message']['content']

    return {
        "question" : str(question),
        "answer" : ai_response
    }


if __name__ == "__main__":
    uvicorn.run(app,port=25567,host="127.0.0.1")