import { useState, useEffect, useRef } from 'react';

function App() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRecognized, setLastRecognized] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Use the environment variable for production, or fallback to localhost
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/attendance`);
      const data = await response.json();
      setLogs(data.records || []);
    } catch (error) {
      console.error('Failed to fetch attendance logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // WebRTC Native Camera Feed
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    startCamera();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
         videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Frame Capture Loop
  useEffect(() => {
    const processFrame = async () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas image to a JPEG blob
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          
          const formData = new FormData();
          formData.append('file', blob, 'frame.jpg');

          try {
            const res = await fetch(`${API_URL}/api/process_frame`, {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            
            if (data.status === 'success' && data.recognized?.length > 0) {
              setLastRecognized(data.recognized.join(', '));
              fetchAttendance(); // Refresh logs to show new entry
              
              // Clear the pop-up notification after a 3 seconds
              setTimeout(() => setLastRecognized(''), 3000);
            }
          } catch (error) {
            console.error("Frame processing failed:", error);
          }
        }, 'image/jpeg', 0.8);
      }
    };

    // Post a frame every 2 seconds
    const interval = setInterval(processFrame, 2000);
    return () => clearInterval(interval);
  }, [API_URL]);

  return (
    <div className="min-h-screen bg-tokyo-bg text-tokyo-text p-6 lg:p-12 flex flex-col font-sans">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-tokyo-surface pb-6">
        <div>
          <h1 className="text-3xl font-bold text-tokyo-cyan tracking-tight">Smart Campus AI</h1>
          <p className="text-tokyo-text/70 mt-1">Facial Recognition Attendance System</p>
        </div>
        <div className="bg-tokyo-surface/80 backdrop-blur-md border border-tokyo-purple/30 px-4 py-2 rounded-2xl shadow-[0_0_15px_rgba(187,154,247,0.15)] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-tokyo-purple animate-pulse"></span>
          <span className="text-tokyo-purple font-semibold text-sm tracking-wide cursor-default">
            DevOps Pipeline Active
          </span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1 relative">
        
        {/* Floating Notification */}
        {lastRecognized && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-tokyo-purple text-tokyo-bg px-6 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(187,154,247,0.5)] z-50 animate-bounce">
            ✅ Recognized: {lastRecognized}
          </div>
        )}

        {/* Left Column: Video Feed (Spans 3 cols) */}
        <section className="lg:col-span-3 flex flex-col">
          <div className="bg-tokyo-surface/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-tokyo-cyan flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/20"></span>
              Client Camera Feed
            </h2>
            <div className="flex-1 rounded-2xl overflow-hidden bg-black/60 border border-tokyo-surface/70 relative">
              {/* Native Video Feed */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover rounded-2xl"
              ></video>
              
              {/* Hidden Canvas for extracting frames */}
              <canvas ref={canvasRef} className="hidden"></canvas>
              
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-xl border border-white/10 text-xs text-tokyo-cyan font-mono animate-pulse">
                SENDING FRAMES: 0.5 FPS
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Attendance Logs (Spans 2 cols) */}
        <section className="lg:col-span-2 flex flex-col h-full">
          <div className="bg-tokyo-surface/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col max-h-[75vh]">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-tokyo-cyan">Today's Logs</h2>
              <button 
                onClick={fetchAttendance}
                disabled={loading}
                className="bg-tokyo-purple/20 hover:bg-tokyo-purple/30 text-tokyo-purple border border-tokyo-purple/40 transition-all duration-300 px-4 py-2 rounded-2xl text-sm font-medium disabled:opacity-50 hover:shadow-[0_0_15px_rgba(187,154,247,0.3)] active:scale-95"
              >
                {loading ? 'Refreshing...' : 'Refresh Logs'}
              </button>
            </div>

            {/* Scrollable List */}
            <div className="overflow-y-auto pr-2 pb-2 space-y-3 flex-1 flex flex-col">
              {loading && logs.length === 0 ? (
                <div className="text-center text-tokyo-text/50 my-auto animate-pulse">Loading daily logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center text-tokyo-text/50 my-auto">No attendance marked today.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="bg-tokyo-bg/60 border border-tokyo-surface p-4 rounded-2xl flex justify-between items-center hover:border-tokyo-cyan/30 transition-all hover:translate-x-1 duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-tokyo-cyan to-tokyo-purple flex items-center justify-center text-tokyo-bg font-bold shadow-lg shadow-tokyo-cyan/20">
                        {log.Name ? log.Name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-100">{log.Name}</p>
                        <p className="text-xs text-tokyo-text/60">{log.Date}</p>
                      </div>
                    </div>
                    <div className="text-tokyo-cyan bg-tokyo-cyan/10 px-3 py-1.5 rounded-xl text-sm font-medium border border-tokyo-cyan/20">
                      {log.Time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Info Card / Footer */}
      <footer className="mt-8 flex justify-center lg:justify-end">
        <div className="bg-tokyo-surface/30 backdrop-blur-md border border-tokyo-surface px-6 py-3 rounded-3xl text-sm text-tokyo-text/80 shadow-md flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-tokyo-purple"></div>
          <p>
            <span className="font-semibold text-gray-200">Samikhya Baruah</span> | BTech CSE (AI-Driven DevOps) | <span className="text-tokyo-cyan/90">Jain University</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
