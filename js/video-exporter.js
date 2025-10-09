class VideoExporter {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.chunks = [];
        this.ffmpeg = null;
        this.ffmpegLoaded = false;
    }
    
    async loadFFmpeg() {
        if (this.ffmpegLoaded) return true;
        
        try {
            const { FFmpeg } = FFmpegWASM;
            const { fetchFile, toBlobURL } = FFmpegUtil;
            
            this.ffmpeg = new FFmpeg();
            this.fetchFile = fetchFile;
            
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            this.ffmpegLoaded = true;
            return true;
        } catch (error) {
            console.error('Error loading FFmpeg:', error);
            return false;
        }
    }
    
    async startRecording(canvas) {
        try {
            const stream = canvas.captureStream(30);
            
            const options = {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 8000000
            };
            
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8';
            }
            
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
            
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.chunks = [];
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.chunks.push(e.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                await this.convertToMP4();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            return false;
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }
    
    async convertToMP4() {
        const webmBlob = new Blob(this.chunks, { type: 'video/webm' });
        
        const ffmpegAvailable = await this.loadFFmpeg();
        
        if (ffmpegAvailable && this.ffmpeg) {
            try {
                await this.ffmpeg.writeFile('input.webm', await this.fetchFile(webmBlob));
                
                await this.ffmpeg.exec([
                    '-i', 'input.webm',
                    '-c:v', 'libx264',
                    '-preset', 'medium',
                    '-crf', '23',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    'output.mp4'
                ]);
                
                const data = await this.ffmpeg.readFile('output.mp4');
                const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
                
                const url = URL.createObjectURL(mp4Blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gpx-flyover-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                await this.ffmpeg.deleteFile('input.webm');
                await this.ffmpeg.deleteFile('output.mp4');
                
                return;
            } catch (error) {
                console.error('FFmpeg conversion error:', error);
            }
        }
        
        const url = URL.createObjectURL(webmBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gpx-flyover-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
