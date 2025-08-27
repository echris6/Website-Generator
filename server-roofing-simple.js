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
    
    // Set viewport for TRUE 1080p video recording
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Load the HTML content directly (avoids file:// URL issues)
    console.log(`📄 Loading HTML content directly (${html_content.length} characters)`);
    await page.setContent(html_content, {
      waitUntil: 'networkidle0',
      timeout: 120000
    });
    console.log(`✅ HTML content loaded successfully`);
    
    // Create videos directory
    const videosDir = path.join(__dirname, 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir);
    }
    
    // Start recording
    console.log('🎥 Starting TRUE 60 FPS 1080p video recording...');
    
    const videoPath = path.join(videosDir, filename);
    // TRUE 60 FPS SETTINGS: 18 seconds with 2-second homepage pause
    const totalDuration = 18000; // 18 seconds total
    const fps = 60; // TRUE 60 FPS for smooth cinema quality
    const totalFrames = 1080; // 18 seconds * 60 FPS = 1080 frames
    const pauseFrames = 120; // 2 seconds * 60 FPS = 120 frames for homepage
    const scrollFrames = 960; // 16 seconds * 60 FPS = 960 frames for scrolling
    const frameInterval = 1000 / 60; // Exactly 16.67ms per frame for TRUE 60 FPS
    
    console.log(`🎬 Recording ${totalFrames} frames at TRUE ${fps} FPS (1080p Cinema Quality)`);
    console.log(`⏱️ Total Duration: ${totalDuration/1000} seconds`);
    console.log(`⏸️ Homepage Pause: 2 seconds (${pauseFrames} frames)`);
    console.log(`📜 Scroll Duration: 16 seconds (${scrollFrames} frames)`);
    
    // Get page height for scrolling
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 1080; // Match the 1080p viewport
    const maxScroll = Math.max(0, pageHeight - viewportHeight);
    
    console.log(`📏 Page height: ${pageHeight}px, Max scroll: ${maxScroll}px`);
    console.log(`🎬 Starting frame capture: ${totalFrames} frames at ${fps} FPS`);
    console.log(`⏱️ Estimated capture time: ${totalFrames/fps} seconds`);
    const captureStartTime = Date.now();
    
    // Calculate scroll increment for smooth motion AFTER the pause
    const scrollIncrement = maxScroll / scrollFrames; // Divide by scroll frames only
    console.log(`📐 Scroll increment: ${scrollIncrement.toFixed(3)}px per frame (after pause)`);
    
    // Capture frames with 2-second homepage pause then smooth scrolling
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = frame / totalFrames;
      let scrollY = 0;
      
      if (frame < pauseFrames) {
        // HOMEPAGE PAUSE: First 120 frames (2 seconds) stay at top
        scrollY = 0;
        await page.evaluate(() => {
          window.scrollTo({
            top: 0,
            behavior: 'instant'
          });
        });
      } else {
        // SMOOTH SCROLLING: Frames 120-1079 (16 seconds) scroll smoothly
        const scrollFrame = frame - pauseFrames; // 0-959
        scrollY = Math.min(scrollFrame * scrollIncrement, maxScroll);
        await page.evaluate(scrollY => {
          window.scrollTo({
            top: scrollY,
            behavior: 'instant' // Use instant for precise frame-by-frame control
          });
        }, scrollY);
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
      
      // Wait for remaining frame time to maintain perfect 60fps
      const frameEnd = Date.now();
      const elapsed = frameEnd - frameStart;
      const waitTime = Math.max(0, frameInterval - elapsed);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Log progress every 30 frames (0.5 seconds) for better visibility and to prevent timeout
      if (frame % 30 === 0 && frame > 0) {
        const elapsedSeconds = (Date.now() - captureStartTime) / 1000;
        const progressPercent = (progress * 100).toFixed(1);
        const currentScrollPercent = ((scrollY / maxScroll) * 100).toFixed(1);
        const fps_actual = (frame / elapsedSeconds).toFixed(1);
        const status = frame < pauseFrames ? '⏸️ PAUSE' : '📜 SCROLL';
        console.log(`📹 Frame ${frame}/${totalFrames} (${progressPercent}%) - ${elapsedSeconds.toFixed(1)}s - ${status} - Scroll: ${currentScrollPercent}% - FPS: ${fps_actual}`);
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
          '-framerate', '60',  // Explicit 60 FPS input
          '-pattern_type', 'sequence'
        ])
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt', 'yuv420p',
          '-crf', '17',  // High quality for 1080p60
          '-preset', 'slower',  // Better quality for TRUE 60 FPS
          '-movflags', '+faststart',
          '-r', '60',  // Force exact 60 FPS output
          '-g', '120',  // GOP size: keyframe every 2 seconds (120 frames)
          '-keyint_min', '60',  // Minimum keyframe interval (1 second)
          '-bf', '2',  // B-frames for better compression
          '-profile:v', 'high',  // High profile for 1080p60
          '-level', '4.2',  // Level 4.2 supports 1080p60
          '-tune', 'film',  // Optimize for high-motion content
          '-x264-params', 'ref=4:bframes=3:b-adapt=2'  // Advanced x264 settings for quality
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
        message: 'Professional TRUE 60 FPS video generated successfully',
        file_name: filename,
        file_size: stats.size,
        file_size_readable: `${fileSizeMB} MB`,
        duration: '18 seconds',
        fps: 'TRUE 60 FPS',
        quality: 'Full HD 1080p60',
        homepage_pause: '2 seconds',
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
