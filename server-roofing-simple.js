const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { createClient } = require('@supabase/supabase-js');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized');
  console.log('📦 Supabase URL:', supabaseUrl);
} else {
  console.warn('⚠️  Supabase not configured - videos will not be uploaded to cloud storage');
  console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables to enable uploads');
}

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3030;

// Check FFmpeg availability on startup
console.log('🔧 FFmpeg path:', ffmpegInstaller.path);
console.log('🔧 FFmpeg version:', ffmpegInstaller.version);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Business Video Generator',
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
  console.log('🎬 Starting video generation...');

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
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-background-networking',
        '--enable-features=NetworkService,NetworkServiceInProcess'
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
      waitUntil: 'networkidle2',
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
    // EXTENDED DURATION: 25 seconds with 2-second homepage pause
    const totalDuration = 25000; // 25 seconds total
    const fps = 60; // TRUE 60 FPS for smooth cinema quality
    const totalFrames = 1500; // 25 seconds * 60 FPS = 1500 frames
    const pauseFrames = 120; // 2 seconds * 60 FPS = 120 frames for homepage
    const scrollFrames = 1380; // 23 seconds * 60 FPS = 1380 frames for scrolling
    const frameInterval = 1000 / 60; // Exactly 16.67ms per frame for TRUE 60 FPS

    console.log(`🎬 Recording ${totalFrames} frames at TRUE ${fps} FPS (1080p Cinema Quality)`);
    console.log(`⏱️ Total Duration: ${totalDuration/1000} seconds`);
    console.log(`⏸️ Homepage Pause: 2 seconds (${pauseFrames} frames)`);
    console.log(`📜 Scroll Duration: 23 seconds (${scrollFrames} frames)`);

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
    console.log(`📐 Scroll increment: ${scrollIncrement.toFixed(3)}px per frame`);

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
        // SMOOTH SCROLLING: Frames 120-1319 (20 seconds) scroll smoothly
        const scrollFrame = frame - pauseFrames; // 0-1199
        scrollY = Math.min(scrollFrame * scrollIncrement, maxScroll);
        await page.evaluate(scrollY => {
          window.scrollTo({
            top: scrollY,
            behavior: 'instant'
          });
        }, scrollY);
      }

      // Take screenshot and save to disk
      const framePath = path.join(tempDir, `frame_${String(frame).padStart(5, '0')}.jpg`);
      await page.screenshot({
        type: 'jpeg',
        quality: 95,
        path: framePath,
        fullPage: false
      });

      // Log progress every 60 frames (1 second)
      if (frame % 60 === 0 && frame > 0) {
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
      const framePattern = path.join(tempDir, 'frame_%05d.jpg');

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
          '-preset', 'fast',
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

      let videoUrl = null;
      let uploadSuccess = false;

      // Upload to Supabase Storage if configured
      if (supabase) {
        try {
          console.log('📤 Uploading video to Supabase Storage...');
          const videoBuffer = fs.readFileSync(videoPath);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('business-videos')
            .upload(filename, videoBuffer, {
              contentType: 'video/mp4',
              upsert: true
            });

          if (uploadError) {
            console.error('❌ Supabase upload failed:', uploadError);
          } else {
            console.log('✅ Video uploaded to Supabase:', filename);

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('business-videos')
              .getPublicUrl(filename);

            videoUrl = urlData.publicUrl;
            uploadSuccess = true;
            console.log('🔗 Public URL:', videoUrl);

            // Update database if html_filename is provided
            const htmlFilename = req.body.html_filename;
            if (htmlFilename) {
              console.log(`🔍 Looking up record by html_filename: ${htmlFilename}`);

              const { error: dbError } = await supabase
                .from('websites')
                .update({
                  video_url: videoUrl,
                  video_status: 'completed',
                  updated_at: new Date().toISOString()
                })
                .eq('html_filename', htmlFilename);

              if (dbError) {
                console.error('❌ Database update failed:', dbError);
              } else {
                console.log('✅ Database updated with video URL');
              }
            } else {
              console.log('ℹ️  No html_filename provided - skipping database update');
            }
          }
        } catch (uploadErr) {
          console.error('❌ Error during Supabase upload:', uploadErr);
        }
      }

      res.json({
        success: true,
        message: 'Professional TRUE 60 FPS video generated successfully',
        file_name: filename,
        file_size: stats.size,
        file_size_readable: `${fileSizeMB} MB`,
        duration: '25 seconds',
        fps: 'TRUE 60 FPS',
        quality: 'Full HD 1080p60',
        homepage_pause: '2 seconds',
        scroll_duration: '23 seconds',
        business_name: business_name,
        video_url: videoUrl,
        uploaded_to_supabase: uploadSuccess
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
  console.log('🎬 Business Video Server running on port', PORT);
  console.log('📍 Health check: http://localhost:3030/health');
  console.log('🎬 Video generation: POST http://localhost:3030/generate-video');
  console.log('📜 25 seconds total (2s pause + 23s scroll) - Extended for full page!');
});
