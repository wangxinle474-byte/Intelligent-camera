import os
import shutil
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from services.voice_service import recognize_audio
from services.tos_service import tos_service
from services.image_service import image_service

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp directory
TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

class EditRequest(BaseModel):
    imageUrl: str
    prompt: str

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Save to temp file
        file_ext = os.path.splitext(file.filename)[1]
        temp_filename = f"{uuid.uuid4()}{file_ext}"
        temp_path = os.path.join(TEMP_DIR, temp_filename)
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Upload to TOS
        object_key = f"uploads/{temp_filename}"
        url = tos_service.upload_file(temp_path, object_key)
        
        # Cleanup
        os.remove(temp_path)
        
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recognize")
async def recognize_voice(file: UploadFile = File(...)):
    import logging
    import traceback
    logger = logging.getLogger(__name__)
    
    try:
        # Save to temp file
        file_ext = os.path.splitext(file.filename)[1]
        if not file_ext:
            file_ext = ".wav" # Default to wav if no extension
        temp_filename = f"{uuid.uuid4()}{file_ext}"
        temp_path = os.path.join(TEMP_DIR, temp_filename)
        
        logger.info(f"Saving audio file to: {temp_path}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Audio file saved, size: {os.path.getsize(temp_path)} bytes")
            
        # Process audio
        logger.info("Starting voice recognition...")
        text = await recognize_audio(temp_path)
        logger.info(f"Recognition result: {text}")
        
        # Cleanup
        os.remove(temp_path)
        
        return {"text": text}
    except Exception as e:
        logger.error(f"Voice recognition error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/edit")
async def edit_image(request: EditRequest):
    try:
        new_image_url = image_service.generate_image(request.prompt, request.imageUrl)
        return {"url": new_image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
