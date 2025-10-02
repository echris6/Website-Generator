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
    service: 'Dynamic Video Generator',
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
  console.log('🎬 Starting DYNAMIC video generation...');

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

    // Load the HTML content directly
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

    // ============================================
    // DYNAMIC SCROLL CALCULATION
    // ============================================
    console.log('📐 Calculating dynamic scroll duration...');

    // Get page height for scrolling
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 1080; // Match the 1080p viewport
    const maxScroll = Math.max(0, pageHeight - viewportHeight);

    // Dynamic settings
    const fps = 60; // TRUE 60 FPS for smooth cinema quality
    const pauseDuration = 2; // 2 seconds pause at homepage
    const scrollSpeed = 800; // pixels per second (smooth, readable scroll speed)

    // Calculate scroll duration based on actual page height
    const scrollDuration = Math.max(3, maxScroll / scrollSpeed); // minimum 3 seconds
    const totalDuration = pauseDuration + scrollDuration;

    // Calculate frames
    const pauseFrames = pauseDuration * fps; // 120 frames for 2-second pause
    const scrollFrames = Math.ceil(scrollDuration * fps);
    const totalFrames = pauseFrames + scrollFrames;
    const frameInterval = 1000 / fps; // 16.67ms per frame for TRUE 60 FPS

    console.log(`📏 Page height: ${pageHeight}px, Max scroll: ${maxScroll}px`);
    console.log(`⏱️ DYNAMIC Duration: ${totalDuration.toFixed(1)}s (${pauseDuration}s pause + ${scrollDuration.toFixed(1)}s scroll)`);
    console.log(`🎬 Total frames: ${totalFrames} (${pauseFrames} pause + ${scrollFrames} scroll)`);
    console.log(`📜 Scroll speed: ${scrollSpeed}px/s`);
    console.log(`🎞️ FPS: ${fps} (Cinema Quality)`);

    // Start recording
    console.log('🎥 Starting TRUE 60 FPS 1080p DYNAMIC video recording...');

    const videoPath = path.join(videosDir, filename);
    const captureStartTime = Date.now();

    // Calculate scroll increment for smooth motion
    const scrollIncrement = maxScroll / scrollFrames;
    console.log(`📐 Scroll increment: ${scrollIncrement.toFixed(3)}px per frame`);

    // Capture frames with dynamic duration
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = frame / totalFrames;
      let scrollY = 0;

      if (frame < pauseFrames) {
        // HOMEPAGE PAUSE: Stay at top for pause duration
        scrollY = 0;
        await page.evaluate(() => {
          window.scrollTo({
            top: 0,
            behavior: 'instant'
          });
        });
      } else {
        // SMOOTH SCROLLING: Scroll through entire page
        const scrollFrame = frame - pauseFrames;
        scrollY = Math.min(scrollFrame * scrollIncrement, maxScroll);
        await page.evaluate(scrollY => {
          window.scrollTo({
            top: scrollY,
            behavior: 'instant'
          });
        }, scrollY);
      }

      // Precise timing for 60fps
      const frameStart = Date.now();

      // Take screenshot
      const framePath = path.join(tempDir, `frame_${String(frame).padStart(5, '0')}.png`);
      await page.screenshot({
        type: 'png',
        path: framePath,
        fullPage: false
      });

      // Wait for remaining frame time
      const frameEnd = Date.now();
      const elapsed = frameEnd - frameStart;
      const waitTime = Math.max(0, frameInterval - elapsed);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Log progress every 30 frames
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
          '-framerate', '60',
          '-pattern_type', 'sequence'
        ])
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt', 'yuv420p',
          '-crf', '17',
          '-preset', 'slower',
          '-movflags', '+faststart',
          '-r', '60',
          '-g', '120',
          '-keyint_min', '60',
          '-bf', '2',
          '-profile:v', 'high',
          '-level', '4.2',
          '-tune', 'film',
          '-x264-params', 'ref=4:bframes=3:b-adapt=2'
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
        message: 'Professional DYNAMIC 60 FPS video generated successfully',
        file_name: filename,
        file_size: stats.size,
        file_size_readable: `${fileSizeMB} MB`,
        duration: `${totalDuration.toFixed(1)} seconds`,
        duration_pause: `${pauseDuration} seconds`,
        duration_scroll: `${scrollDuration.toFixed(1)} seconds`,
        fps: 'TRUE 60 FPS',
        quality: 'Full HD 1080p60',
        page_height: `${pageHeight}px`,
        scroll_distance: `${maxScroll}px`,
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
      message: 'Failed to generate video'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🎬 Dynamic Video Server running on port', PORT);
  console.log('📍 Health check: http://localhost:3030/health');
  console.log('🎬 Video generation: POST http://localhost:3030/generate-video');
  console.log('⚡ DYNAMIC scroll - adapts to any page length!');
});
