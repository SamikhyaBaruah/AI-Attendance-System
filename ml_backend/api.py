from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import csv
import os
import numpy as np
from datetime import datetime

try:
    from .recognizer import FaceAttendanceSystem
except ImportError:
    from recognizer import FaceAttendanceSystem

app = FastAPI(title="Smart Campus Attendance API")

# Update CORS to allow Vercel domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For strict security in prod, swap "*" with ["https://your-vercel.vercel.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

attendance_system = FaceAttendanceSystem(
    registered_faces_dir=os.path.join(os.path.dirname(__file__), 'registered_faces'),
    log_file=os.path.join(os.path.dirname(__file__), '..', 'attendance.csv')
)

@app.post("/api/process_frame")
async def process_frame(file: UploadFile = File(...)):
    """
    Receives an image frame from the frontend, decodes it,
    recognizes faces, dynamically marks attendance, and returns the result.
    """
    try:
        # Read the image file as bytes
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        
        # Decode the image with OpenCV
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Invalid image received"}

        # Process the frame to get attendance logged
        processed_frame, detected_names = attendance_system.process_frame(frame)

        # Filter out "Unknown" faces
        recognized = [name for name in detected_names if name != "Unknown"]

        return {"status": "success", "recognized": recognized}

    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/attendance")
def get_attendance():
    """
    Endpoint to fetch today's attendance logs.
    Reads the CSV and returns a JSON list of the people recognized today.
    """
    log_file = attendance_system.log_file
    
    if not os.path.exists(log_file):
        return {"records": []}
        
    today_str = datetime.now().strftime('%Y-%m-%d')
    records = []
    
    try:
        with open(log_file, mode='r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if row.get('Date') == today_str:
                    records.append(row)
                    
        records.sort(key=lambda x: x.get('Time', ''), reverse=True)
        
    except Exception as e:
        print(f"Error reading attendance file: {e}")
        
    return {"records": records}
