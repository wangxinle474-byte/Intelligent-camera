import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Mic, Image as ImageIcon, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AudioRecorder } from '@/lib/audio-recorder';

const API_BASE = '/api';

function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingStep('Uploading image...');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      setOriginalImage(res.data.url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const startRecording = async () => {
    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      audioRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = async () => {
    if (audioRecorderRef.current && isRecording) {
      try {
        const audioBlob = await audioRecorderRef.current.stop();
        setIsRecording(false);
        await processAudio(audioBlob);
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    setLoadingStep('Recognizing voice...');
    
    const formData = new FormData();
    // Determine extension based on blob type
    const ext = audioBlob.type.includes('wav') ? 'wav' : 'webm';
    formData.append('file', audioBlob, `recording.${ext}`);

    try {
      const res = await axios.post(`${API_BASE}/recognize`, formData);
      setTranscript(res.data.text);
    } catch (err) {
      console.error(err);
      alert('Failed to recognize voice');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleGenerate = async () => {
    if (!originalImage || !transcript) return;

    setIsLoading(true);
    setLoadingStep('Generating new image...');

    try {
      const res = await axios.post(`${API_BASE}/edit`, {
        imageUrl: originalImage,
        prompt: transcript
      });
      setResultImage(res.data.url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate image');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Intelligent Camera</span>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
          
          {/* Left: Original Image */}
          <div className="relative group rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-white/20">
            {originalImage ? (
              <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
            ) : (
              <div 
                className="text-center cursor-pointer p-12 w-full h-full flex flex-col items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-300">Upload Image</p>
                <p className="text-sm text-gray-500 mt-2">Click or drag and drop</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            {originalImage && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur rounded-full hover:bg-black/70 transition-colors"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right: Result Image */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col items-center justify-center">
            {isLoading && loadingStep === 'Generating new image...' ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-gray-400 animate-pulse">Generating...</p>
              </div>
            ) : resultImage ? (
              <img src={resultImage} alt="Result" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Control Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
          
          {/* Voice Button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
              isRecording 
                ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110" 
                : "bg-blue-600 hover:bg-blue-500"
            )}
          >
            <Mic className="w-6 h-6 text-white" />
          </button>

          {/* Transcript Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={isRecording ? "Listening..." : "Hold mic to speak or type command..."}
              className="w-full bg-transparent border-none outline-none text-lg placeholder:text-gray-500 text-white"
              disabled={isRecording}
            />
            {isLoading && loadingStep !== 'Generating new image...' && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!originalImage || !transcript || isLoading}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
