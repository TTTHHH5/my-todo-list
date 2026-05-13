from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine
from . import models
from .routers import auth, scores

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tetris API")

app.include_router(auth.router)
app.include_router(scores.router)

_BASE = Path(__file__).parent.parent
app.mount("/css", StaticFiles(directory=str(_BASE / "css")), name="css")
app.mount("/js",  StaticFiles(directory=str(_BASE / "js")),  name="js")


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
def read_index():
    return FileResponse(str(_BASE / "index.html"))


@app.get("/game", include_in_schema=False)
@app.get("/game.html", include_in_schema=False)
def read_game():
    return FileResponse(str(_BASE / "game.html"))
