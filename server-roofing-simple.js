const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = 3030;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Dutch Roofing Video Generator' });
});

// Video generation endpoint
app.post('/generate-video', async (req, res) => {
  console.log('🎬 Starting Dutch roofing video generation...');
  
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
    
    // Save HTML content to a temporary file
    const htmlPath = path.join(__dirname, 'website.html');
    fs.writeFileSync(htmlPath, html_content);
    console.log('📄 HTML content saved to temporary file');
    
    // Launch browser
    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch({
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
    const frames = [];
    const totalDuration = 16000; // 16 seconds
    const fps = 60;
    const totalFrames = Math.floor((totalDuration / 1000) * fps);
    const frameInterval = 1000 / fps; // ~16.67ms per frame
    
    console.log(`📊 Recording ${totalFrames} frames at ${fps} FPS`);
    
    // Get page height for scrolling
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 1080;
    const maxScroll = Math.max(0, pageHeight - viewportHeight);
    
    console.log(`📏 Page height: ${pageHeight}px, Max scroll: ${maxScroll}px`);
    
    // Record frames
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
      
      // FIXED: Use standard JavaScript setTimeout for Puppeteer compatibility
      await new Promise(resolve => setTimeout(resolve, frameInterval));
      
      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false
      });
      
      frames.push(screenshot);
      
      // Log progress every 60 frames (1 second)
      if (frame % 60 === 0) {
        console.log(`📸 Frame ${frame}/${totalFrames} (${Math.round(progress * 100)}%)`);
      }
    }
    
    console.log('✅ Screen recording completed');
    console.log(`📁 Converting ${frames.length} frames to MP4...`);
    
    // Convert frames to video using FFmpeg
    const { spawn } = require('child_process');
    
    const ffmpegArgs = [
      '-y', // Overwrite output file
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', fps.toString(),
      '-i', '-', // Input from stdin
      '-vcodec', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '23',
      '-preset', 'medium',
      videoPath
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    // Send frames to FFmpeg
    for (let i = 0; i < frames.length; i++) {
      ffmpeg.stdin.write(frames[i]);
      if (i % 120 === 0) { // Log every 2 seconds worth of frames
        console.log(`🎞️ Processing frame ${i}/${frames.length}`);
      }
    }
    ffmpeg.stdin.end();
    
    // Wait for FFmpeg to complete
    await new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Video conversion completed successfully');
          resolve();
        } else {
          console.log(`❌ FFmpeg failed with code ${code}`);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (err) => {
        console.log(`❌ FFmpeg error: ${err.message}`);
        reject(err);
      });
    });
    
    // Clean up
    await browser.close();
    fs.unlinkSync(htmlPath); // Remove temporary HTML file
    
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
    console.log(`❌ Error generating video: ${error.message}`);
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
