#!/usr/bin/env node

const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3030;

app.use(express.json());
app.use(express.static('.'));

// Ensure videos directory exists
const videosDir = path.join(__dirname, 'videos');
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
}

// Utility function to sanitize filename
function sanitizeFilename(filename) {
    return filename
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
        .replace(/_+/g, '_')
        .trim();
}

// Main video generation endpoint
app.post('/generate-video', async (req, res) => {
    console.log('🎬 Starting Dutch roofing video generation...');
    
    const { businessName = 'roofing_company' } = req.body;
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(businessName);
    const outputPath = path.join(videosDir, `roofing_${sanitizedName}_${timestamp}.mp4`);
    
    let browser;
    
    try {
        // Launch Puppeteer browser
        console.log('🚀 Launching browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport for 1920x1080 video
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1
        });

        // Set Dutch locale
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8'
        });

        // Load the website HTML file
        const websiteUrl = `file://${path.join(__dirname, 'website.html')}`;
        console.log('📄 Loading website:', websiteUrl);
        
        await page.goto(websiteUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for page to fully load
        await page.waitForTimeout(2000);

        // Get page dimensions for scrolling calculations
        const pageHeight = await page.evaluate(() => {
            return Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            );
        });

        const viewportHeight = 1080;
        const scrollableHeight = Math.max(0, pageHeight - viewportHeight);
        
        console.log(`📏 Page height: ${pageHeight}px, Scrollable: ${scrollableHeight}px`);

        // Start screen recording
        console.log('🎥 Starting screen recording...');
        await page.screenshot({ path: 'debug-start.png', fullPage: false });
        
        // Begin video recording (60fps, 16 seconds total)
        const totalFrames = 16 * 60; // 16 seconds at 60fps = 960 frames
        const frameDir = path.join(__dirname, 'frames');
        
        // Create frames directory
        if (fs.existsSync(frameDir)) {
            fs.rmSync(frameDir, { recursive: true });
        }
        fs.mkdirSync(frameDir);

        console.log(`🎞️ Generating ${totalFrames} frames...`);

        // Video timeline:
        // 0-1s: Stay at hero section (60 frames)
        // 1-16s: Smooth scroll down (900 frames)
        
        const heroFrames = 60; // 1 second at hero
        const scrollFrames = totalFrames - heroFrames; // 15 seconds scrolling
        
        let currentFrame = 0;
        
        // Phase 1: Hero section pause (1 second)
        console.log('📍 Phase 1: Hero section pause...');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(100);
        
        for (let i = 0; i < heroFrames; i++) {
            await page.screenshot({
                path: path.join(frameDir, `frame_${String(currentFrame).padStart(4, '0')}.png`),
                fullPage: false
            });
            currentFrame++;
            
            if (i % 20 === 0) {
                console.log(`📸 Hero frames: ${i}/${heroFrames}`);
            }
        }

        // Phase 2: Smooth scrolling (15 seconds)
        console.log('📜 Phase 2: Smooth scrolling...');
        
        if (scrollableHeight > 0) {
            for (let i = 0; i < scrollFrames; i++) {
                // Calculate smooth scroll position (easing function)
                const progress = i / (scrollFrames - 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
                const scrollY = Math.round(easeProgress * scrollableHeight);
                
                await page.evaluate((y) => window.scrollTo(0, y), scrollY);
                await page.waitForTimeout(16); // ~60fps timing
                
                await page.screenshot({
                    path: path.join(frameDir, `frame_${String(currentFrame).padStart(4, '0')}.png`),
                    fullPage: false
                });
                currentFrame++;
                
                if (i % 60 === 0) {
                    console.log(`📸 Scroll progress: ${Math.round(progress * 100)}% (${i}/${scrollFrames})`);
                }
            }
        } else {
            // If no scrolling needed, just hold at current position
            for (let i = 0; i < scrollFrames; i++) {
                await page.screenshot({
                    path: path.join(frameDir, `frame_${String(currentFrame).padStart(4, '0')}.png`),
                    fullPage: false
                });
                currentFrame++;
                
                if (i % 60 === 0) {
                    console.log(`📸 Static frames: ${i}/${scrollFrames}`);
                }
            }
        }

        console.log(`✅ Generated ${currentFrame} frames total`);
        
        // Convert frames to MP4 using FFmpeg
        console.log('🎬 Converting frames to video...');
        
        const { spawn } = require('child_process');
        
        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y', // Overwrite output
                '-framerate', '60', // Input framerate
                '-i', path.join(frameDir, 'frame_%04d.png'), // Input pattern
                '-c:v', 'libx264', // Video codec
                '-pix_fmt', 'yuv420p', // Pixel format for compatibility
                '-crf', '23', // Quality (lower = better quality)
                '-preset', 'medium', // Encoding speed vs compression
                '-movflags', '+faststart', // Web optimization
                outputPath
            ]);

            ffmpeg.stdout.on('data', (data) => {
                console.log(`FFmpeg stdout: ${data}`);
            });

            ffmpeg.stderr.on('data', (data) => {
                console.log(`FFmpeg: ${data}`);
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Video conversion completed');
                    resolve();
                } else {
                    console.error(`❌ FFmpeg exited with code ${code}`);
                    reject(new Error(`FFmpeg failed with code ${code}`));
                }
            });

            ffmpeg.on('error', (error) => {
                console.error('❌ FFmpeg error:', error);
                reject(error);
            });
        });

        // Clean up frames directory
        if (fs.existsSync(frameDir)) {
            fs.rmSync(frameDir, { recursive: true });
            console.log('🧹 Cleaned up frames directory');
        }

        // Verify video file exists and get info
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`🎉 Video generated successfully:`);
            console.log(`   File: ${path.basename(outputPath)}`);
            console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Duration: 16 seconds @ 60fps`);
            
            res.json({
                success: true,
                message: 'Dutch roofing video generated successfully',
                filename: path.basename(outputPath),
                size: stats.size,
                duration: '16 seconds',
                resolution: '1920x1080',
                framerate: '60fps'
            });
        } else {
            throw new Error('Video file was not created');
        }

    } catch (error) {
        console.error('❌ Error generating video:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to generate Dutch roofing video'
        });
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser closed');
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Dutch Roofing Video Generator',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌷 Dutch Roofing Video Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🎬 Video generation: POST http://localhost:${PORT}/generate-video`);
    console.log('🏠 Ready to generate videos for Dutch dakdekker businesses!');
}); 