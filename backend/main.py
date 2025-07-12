from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from rag_system import YoutubeRag
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/") 
def get_root(): 
    return {"message": "working"}

@app.get("/getTranscript/{video_id}")
def get_transcript(video_id: str): 
    youtube_rag = YoutubeRag()
    return youtube_rag.get_video_transcript(video_id)

@app.get("/getRetrievedDocs")
def getRetreivedDocs(video_id: str, question: str): 
    youtube_rag = YoutubeRag()
    results = youtube_rag.youtube_rag(video_id, question)

    return {
        "video_id": video_id,
        "question": question,
        "retrieved_docs": results
    }