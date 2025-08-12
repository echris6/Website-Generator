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
    
    // Create a safe filename
    const sanitizedName = business_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = Date.now();
    const filename = `roofing_${sanitizedName}_${timestamp}.mp4`;
    
    // Create temporary directory for frames
    tempDir = path.join(__dirname, `temp_${timestamp}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    // Save HTML content to a temporary file
    const htmlPath = path.join(tempDir, 'website.html');
    fs.writeFileSync(htmlPath, html_content);
    console.log('📄 HTML content saved to temporary file');
    
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
    
    // Load the HTML content
    const fileUrl = `file://${htmlPath}`;
    console.log(`📄 Loading website: ${fileUrl}`);
    
    await page.goto(fileUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Create videos directory
    const videosDir = path.join(__dirname, 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir);
    }
    
    // Start recording
    console.log('🎥 Starting screen recording...');
    
    const videoPath = path.join(videosDir, filename);
    const totalDuration = 16000; // 16 seconds
    const fps = 60; // 60 FPS for smooth video
    const totalFrames = Math.floor((totalDuration / 1000) * fps);
    const frameInterval = 1000 / fps; // ~16.67ms per frame
    
    console.log(`📊 Recording ${totalFrames} frames at ${fps} FPS`);
    
    // Get page height for scrolling
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 1080;
    const maxScroll = Math.max(0, pageHeight - viewportHeight);
    
    console.log(`📏 Page height: ${pageHeight}px, Max scroll: ${maxScroll}px`);
    
    // Capture frames and save to disk immediately to reduce memory usage
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = frame / totalFrames;
      
      // First 1 second: stay at top
      if (progress < 0.0625) { // 1/16 = 0.0625
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {
        // Remaining 15 seconds: smooth scroll
        const scrollProgress = (progress - 0.0625) / 0.9375; // Normalize to 0-1
        const scrollY = Math.floor(scrollProgress * maxScroll);
        await page.evaluate(scrollY => window.scrollTo(0, scrollY), scrollY);
      }
      
      // Precise timing for 60fps (account for screenshot time)
      const frameStart = Date.now();
      
      // Take screenshot and save to disk
      const framePath = path.join(tempDir, `frame_${String(frame).padStart(5, '0')}.png`);
      await page.screenshot({
        type: 'png',
        path: framePath,
        fullPage: false
      });
      
      // Wait for remaining frame time to maintain 60fps
      const frameEnd = Date.now();
      const elapsed = frameEnd - frameStart;
      const waitTime = Math.max(0, frameInterval - elapsed);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Log progress every 60 frames (1 second)
      if (frame % 60 === 0) {
        console.log(`📸 Frame ${frame}/${totalFrames} (${Math.round(progress * 100)}%)`);
      }
    }
    
    console.log('✅ Screen recording completed');
    console.log(`📁 Converting ${totalFrames} frames to MP4...`);
    
    // Close browser early to free memory
    await browser.close();
    browser = null;
    
    // Convert frames to video using fluent-ffmpeg
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
          '-crf', '18',  // Lower CRF for better quality at 60fps
          '-preset', 'slow',  // Slower preset for better compression
          '-movflags', '+faststart',
          '-r', '60'  // Ensure output is 60fps
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
      
      // Set timeout for FFmpeg process (45 seconds for 960 frames)
      command.timeout(45000);
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
        message: 'Dutch roofing video generated successfully',
        file_name: filename,
        file_size: stats.size,
        file_size_readable: `${fileSizeMB} MB`,
        duration_estimate: '16 seconds',
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