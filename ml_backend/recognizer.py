import cv2
import face_recognition
import os
import csv
from datetime import datetime
import numpy as np

class FaceAttendanceSystem:
    """
    A class to manage the facial recognition and attendance logging.
    """
    def __init__(self, registered_faces_dir='registered_faces', log_file='../attendance.csv'):
        self.registered_faces_dir = registered_faces_dir
        self.log_file = log_file
        self.known_face_encodings = []
        self.known_face_names = []
        
        self.load_registered_faces()
        self.init_log_file()
        
    def init_log_file(self):
        if not os.path.exists(self.log_file):
            with open(self.log_file, mode='w', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(['Name', 'Date', 'Time'])

    def load_registered_faces(self):
        if not os.path.exists(self.registered_faces_dir):
            os.makedirs(self.registered_faces_dir)
            print(f"Created {self.registered_faces_dir} directory.")
            return

        for filename in os.listdir(self.registered_faces_dir):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                filepath = os.path.join(self.registered_faces_dir, filename)
                name = os.path.splitext(filename)[0]
                
                try:
                    img = face_recognition.load_image_file(filepath)
                    encodings = face_recognition.face_encodings(img)
                    if encodings:
                        self.known_face_encodings.append(encodings[0])
                        self.known_face_names.append(name.replace('_', ' '))
                        print(f"Loaded face for {name}")
                except Exception as e:
                    print(f"Error loading {filename}: {e}")

    def mark_attendance(self, name):
        now = datetime.now()
        date_str = now.strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M:%S')

        already_marked = False
        try:
            with open(self.log_file, mode='r') as file:
                reader = csv.reader(file)
                for row in reader:
                    if len(row) >= 3 and row[0] == name and row[1] == date_str:
                        already_marked = True
                        break
        except FileNotFoundError:
            pass

        if not already_marked:
            with open(self.log_file, mode='a', newline='') as file:
                writer = csv.writer(file)
                writer.writerow([name, date_str, time_str])
            print(f"Attendance marked for {name} at {time_str}")

    def process_frame(self, frame):
        """
        Takes a single BGR frame, finds faces, recognizes them,
        draws bounding boxes, marks attendance, and returns the frame & names.
        """
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        face_names = []
        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
            name = "Unknown"

            if self.known_face_encodings:
                face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = self.known_face_names[best_match_index]
            
            face_names.append(name)
            
            if name != "Unknown":
                self.mark_attendance(name)

        for (top, right, bottom, left), name in zip(face_locations, face_names):
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.6, (255, 255, 255), 1)

        return frame, face_names

    def run_webcam(self):
        video_capture = cv2.VideoCapture(0)
        if not video_capture.isOpened():
            print("Error: Could not open webcam.")
            return

        print("Starting webcam... Press 'q' to quit.")
        while True:
            ret, frame = video_capture.read()
            if not ret:
                break

            frame, _ = self.process_frame(frame)
            cv2.imshow('Smart Campus - ML Backend', frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        video_capture.release()
        cv2.destroyAllWindows()

if __name__ == '__main__':
    base_dir = os.path.dirname(__file__)
    system = FaceAttendanceSystem(
        registered_faces_dir=os.path.join(base_dir, 'registered_faces'), 
        log_file=os.path.join(base_dir, '..', 'attendance.csv')
    )
    system.run_webcam()
