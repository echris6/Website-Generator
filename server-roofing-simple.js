const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = 3030;

// Check FFmpeg availability on startup
console.log('🔧 FFmpeg path:', ffmpegInstaller.path);
console.log('🔧 FFmpeg version:', ffmpegInstaller.version);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Dutch Roofing Video Generator',
    ffmpeg: {
      path: ffmpegInstaller.path,
      version: ffmpegInstaller.version
    }
  });
});

// Video generation endpoint
app.post('/generate-video', async (req, res) => {
  console.log('🚀 RECEIVED POST REQUEST AT:', new Date().toISOString());
  console.log('📊 Request body keys:', Object.keys(req.body));
  console.log('📊 HTML size:', req.body.html_content?.length || 'undefined');
  console.log('🏢 Business name:', req.body.business_name);
  console.log('🎬 Starting Dutch roofing video generation...');
  
  let browser = null;
  let tempDir = null;
  
  try {
    const { business_name, html_content } = req.body;
    
    if (!business_name) {
      return res.status(400).json({
        success: false,
        error: 'business_name is required'
      });
    }
    
    if (!html_content) {
      return res.status(400).json({
        success: false,
        error: 'html_content is required'
      });
    }
    
    console.log(`🏢 Generating video for: ${business_name}`);
    console.log(`📊 HTML size: ${html_content.length} characters`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    // Create a safe filename
    const sanitizedName = business_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = Date.now();
    const filename = `roofing_${sanitizedName}_${timestamp}.mp4`;
    
    // Create temporary directory for frames
    tempDir = path.join(__dirname, `temp_${timestamp}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    // Note: We now use page.setContent() instead of saving to file
    // This avoids file:// URL issues in containerized environments
    
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport for video recording
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Load the HTML content directly (avoids file:// URL issues)
    console.log(`📄 Loading HTML content directly (${html_content.length} characters)`);
    await page.setContent(html_content, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log(`✅ HTML content loaded successfully`);
    
    // Create videos directory
    const videosDir = path.join(__dirname, 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir);
    }
    
    // Start recording
    console.log('🎥 Starting professional video recording...');
    
    const videoPath = path.join(videosDir, filename);
    // PROFESSIONAL SETTINGS: 16 seconds at 60 FPS for smooth cinematic quality
    const totalDuration = 16000; // 16 seconds for professional pacing
    const fps = 60; // 60 FPS for smooth cinema quality
    const totalFrames = Math.floor((totalDuration / 1000) * fps); // 960 frames
    const frameInterval = 1000 / fps; // 16.67ms per frame for perfect 60 FPS
    
    console.log(`🎬 Recording ${totalFrames} frames at ${fps} FPS (Cinema Quality)`);
    console.log(`⏱️ Duration: ${totalDuration/1000} seconds`);
    
    // Get page height for scrolling
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 1080;
    const maxScroll = Math.max(0, pageHeight - viewportHeight);
    
    console.log(`📏 Page height: ${pageHeight}px, Max scroll: ${maxScroll}px`);
    console.log(`🎬 Starting frame capture: ${totalFrames} frames at ${fps} FPS`);
    console.log(`⏱️ Estimated capture time: ${totalFrames/fps} seconds`);
    const captureStartTime = Date.now();
    
    // Calculate scroll increment for perfectly smooth linear motion
    const scrollIncrement = maxScroll / totalFrames;
    console.log(`📐 Scroll increment: ${scrollIncrement.toFixed(3)}px per frame`);
    
    // Capture frames with smooth linear scrolling
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = frame / totalFrames;
      
      // SMOOTH LINEAR SCROLLING: Continuous motion from top to bottom
      // No pauses, just buttery smooth progression
      const scrollY = Math.min(frame * scrollIncrement, maxScroll);
      await page.evaluate(scrollY => {
        window.scrollTo({
          top: scrollY,
          behavior: 'instant' // Use instant for precise frame-by-frame control
        });
      }, scrollY);
      
      // Precise timing for 60fps (account for screenshot time)
      const frameStart = Date.now();
      
      // Take screenshot and save to disk
      const framePath = path.join(tempDir, `frame_${String(frame).padStart(5, '0')}.png`);
      await page.screenshot({
        type: 'png',
        path: framePath,
        fullPage: false
      });
      
      // Wait for remaining frame time to maintain perfect 60fps
      const frameEnd = Date.now();
      const elapsed = frameEnd - frameStart;
      const waitTime = Math.max(0, frameInterval - elapsed);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Log progress every 60 frames (1 second) for clean output
      if (frame % 60 === 0 && frame > 0) {
        const elapsedSeconds = (Date.now() - captureStartTime) / 1000;
        const progressPercent = (progress * 100).toFixed(1);
        const currentScrollPercent = ((scrollY / maxScroll) * 100).toFixed(1);
        console.log(`📹 Frame ${frame}/${totalFrames} (${progressPercent}%) - ${elapsedSeconds.toFixed(1)}s elapsed - Scroll: ${currentScrollPercent}%`);
      }
    }
    
    console.log('✅ Screen recording completed');
    console.log(`📁 Converting ${totalFrames} frames to MP4...`);
    
    // Close browser early to free memory
    await browser.close();
    browser = null;
    
    // Convert frames to video using fluent-ffmpeg
    console.log(`🎞️ Starting FFmpeg conversion of ${totalFrames} frames`);
    console.log(`⏰ FFmpeg started at: ${new Date().toISOString()}`);
    await new Promise((resolve, reject) => {
      const framePattern = path.join(tempDir, 'frame_%05d.png');
      
      const command = ffmpeg()
        .input(framePattern)
        .inputOptions([
          '-framerate', fps.toString(),
          '-pattern_type', 'sequence'
        ])
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt', 'yuv420p',
          '-crf', '17',  // Ultra high quality for 60fps cinematic look
          '-preset', 'slower',  // Maximum quality encoding
          '-movflags', '+faststart',
          '-r', fps.toString(),  // Ensure output matches input FPS (60)
          '-g', '120',  // Keyframe interval (2 seconds at 60fps)
          '-bf', '2',  // B-frames for better compression
          '-profile:v', 'high',  // High profile for best quality
          '-level', '4.2'  // Support for 1080p60
        ])
        .output(videoPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`🎞️ Processing: ${Math.round(progress.percent)}% complete`);
          }
        })
        .on('end', () => {
          console.log('✅ Video conversion completed successfully');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error:', err.message);
          reject(err);
        });
      
      // Removed timeout as it causes issues with fluent-ffmpeg
      // command.timeout(30000);
      command.run();
    });
    
    // Clean up temporary files
    console.log('🧹 Cleaning up temporary files...');
    const tempFiles = fs.readdirSync(tempDir);
    for (const file of tempFiles) {
      fs.unlinkSync(path.join(tempDir, file));
    }
    fs.rmdirSync(tempDir);
    
    // Verify video file was created
    if (fs.existsSync(videoPath)) {
      const stats = fs.statSync(videoPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ Video generated successfully!`);
      console.log(`📁 File: ${filename}`);
      console.log(`📊 Size: ${fileSizeMB} MB`);
      
      res.json({
        success: true,
        message: 'Professional video generated successfully',
        file_name: filename,
        file_size: stats.size,
        file_size_readable: `${fileSizeMB} MB`,
        duration: '16 seconds',
        fps: '60 FPS',
        quality: 'Cinema Quality (1080p60)',
        business_name: business_name
      });
    } else {
      throw new Error('Video file was not created');
    }
    
  } catch (error) {
    console.error(`❌ Error generating video: ${error.message}`);
    console.error('Stack trace:', error.stack);
    
    // Clean up on error
    if (browser) {
      await browser.close();
    }
    
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        const tempFiles = fs.readdirSync(tempDir);
        for (const file of tempFiles) {
          fs.unlinkSync(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate Dutch roofing video'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🌷 Dutch Roofing Video Server running on port', PORT);
  console.log('📍 Health check: http://localhost:3030/health');
  console.log('🎬 Video generation: POST http://localhost:3030/generate-video');
  console.log('🏠 Ready to generate videos for Dutch dakdekker businesses!');
});