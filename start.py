import uvicorn
from main import app
if __name__ == "__main__":
    uvicorn.run(app,port=8002,host="127.0.0.1")