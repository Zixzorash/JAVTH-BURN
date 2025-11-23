'use client';

import { useState, useRef, useEffect } from 'react';
// ลบ import FFmpeg บรรทัดบนออก เพื่อไม่ให้ Server โหลด
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Upload, Film, Download, Settings, Play, Loader2 } from 'lucide-react';

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('กำลังโหลดระบบ...');
  
  const [videoFile, setVideoFile] = useState(null);
  const [subFile, setSubFile] = useState(null);
  const [fps, setFps] = useState(30);
  const [outputVideo, setOutputVideo] = useState(null);
  
  // เปลี่ยนจาก new FFmpeg() เป็น null ก่อน เพื่อไม่ให้ Error ตอน Build
  const ffmpegRef = useRef(null);
  const messageRef = useRef(null);

  const load = async () => {
    // Import FFmpeg ตรงนี้แทน (Dynamic Import) เพื่อให้โหลดเฉพาะตอนอยู่บน Browser เท่านั้น
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    // สร้าง instance ตรงนี้
    ffmpegRef.current = new FFmpeg();
    const ffmpeg = ffmpegRef.current;

    ffmpeg.on('log', ({ message }) => {
      console.log(message);
      if (messageRef.current) messageRef.current.innerHTML = message;
    });

    try {
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setLoaded(true);
        setStatusMessage('ระบบพร้อมใช้งาน');
    } catch (error) {
        console.error(error);
        setStatusMessage('โหลดไม่สำเร็จ (กรุณาใช้ Chrome/Edge บน PC)');
    }
  };

  useEffect(() => {
    // เช็คว่ารันบน Browser จริงๆ ถึงค่อยโหลด
    if (typeof window !== 'undefined') {
        load();
    }
  }, []);

  const processVideo = async () => {
    if (!videoFile || !subFile || !ffmpegRef.current) return;
    setIsLoading(true);
    setOutputVideo(null);
    setStatusMessage('กำลังอ่านไฟล์...');

    const ffmpeg = ffmpegRef.current;

    try {
        await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
        await ffmpeg.writeFile('subs.srt', await fetchFile(subFile));

        // Font ภาษาไทย
        const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';
        await ffmpeg.writeFile('/tmp/Sarabun-Regular.ttf', await fetchFile(fontUrl));

        setStatusMessage('กำลังฝังซับไตเติล... (ห้ามปิดหน้านี้)');
        
        await ffmpeg.exec([
            '-i', 'input.mp4',
            '-vf', `subtitles=subs.srt:fontsdir=/tmp:force_style='FontName=Sarabun,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1'`,
            '-r', fps.toString(),
            '-c:a', 'copy',
            'output.mp4'
        ]);

        setStatusMessage('เสร็จสิ้น! สร้างไฟล์ดาวน์โหลด...');

        const data = await ffmpeg.readFile('output.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        setOutputVideo(url);
        setStatusMessage('เรียบร้อย');

    } catch (error) {
        console.error(error);
        setStatusMessage('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-400">Video Subtitle Burner</h1>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className={`text-center text-sm font-mono p-2 rounded ${loaded ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                STATUS: {statusMessage}
            </div>

            <div className="grid gap-4">
                <div className="bg-slate-800 p-4 rounded-lg">
                    <label className="flex items-center gap-2 mb-2 font-medium"><Film size={18}/> 1. เลือกวิดีโอ (MP4)</label>
                    <input type="file" accept="video/mp4" onChange={(e) => setVideoFile(e.target.files[0])} className="w-full text-sm text-slate-400 file:bg-blue-600 file:text-white file:border-0 file:rounded-full file:px-4 file:py-1 cursor-pointer"/>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg">
                    <label className="flex items-center gap-2 mb-2 font-medium"><Settings size={18}/> 2. เลือกซับไตเติล (SRT)</label>
                    <input type="file" accept=".srt" onChange={(e) => setSubFile(e.target.files[0])} className="w-full text-sm text-slate-400 file:bg-purple-600 file:text-white file:border-0 file:rounded-full file:px-4 file:py-1 cursor-pointer"/>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg">
                     <label className="flex items-center gap-2 mb-2 font-medium"><Settings size={18}/> 3. Frame Rate (FPS)</label>
                     <div className="flex gap-2">
                        {[24, 30, 60].map(r => (
                            <button key={r} onClick={() => setFps(r)} className={`px-4 py-1 rounded ${fps === r ? 'bg-blue-500' : 'bg-slate-700'}`}>{r}</button>
                        ))}
                     </div>
                </div>
            </div>

            <button onClick={processVideo} disabled={!loaded || isLoading || !videoFile || !subFile} 
                className={`w-full py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 ${isLoading ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500'}`}>
                {isLoading ? <Loader2 className="animate-spin"/> : <Play/>} {isLoading ? 'กำลังประมวลผล...' : 'เริ่ม Burn Subtitles'}
            </button>
            
            <div className="h-24 bg-black/40 rounded p-2 text-xs font-mono text-green-400 overflow-y-auto" ref={messageRef}></div>

            {outputVideo && (
                <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg text-center">
                    <video controls src={outputVideo} className="w-full max-h-64 bg-black mb-4 rounded"></video>
                    <a href={outputVideo} download="burned_video.mp4" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-full font-bold hover:bg-green-500">
                        <Download size={20}/> ดาวน์โหลดไฟล์
                    </a>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
