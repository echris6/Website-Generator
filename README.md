# Dutch Roofing Video Generator 🇳🇱

**Automated video generation system for Dutch roofing companies (dakdekkers) with n8n integration**

This system generates professional 16-second marketing videos for Dutch roofing businesses, featuring smooth scrolling through business websites with Dutch locale support.

## 🎬 What It Does

- **Input**: Business data + HTML content via n8n workflow or GitHub Actions
- **Output**: Professional 1920x1080, 60fps, 16-second MP4 videos
- **Focus**: Dutch roofing companies (dakdekkers) with specialized content
- **Integration**: Seamless n8n workflow automation + GitHub Actions

## 📁 System Files

```
.
├── .github/workflows/roofing-video.yml  # GitHub Actions workflow
├── server-roofing-simple.js            # Video generation server
├── package.json                        # Node.js dependencies
├── website.html                        # Dutch roofing template
└── README.md                          # This documentation
```

## 🚀 Quick Start

### 1. Trigger from n8n

Send a repository dispatch to trigger video generation:

```bash
curl -X POST \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/dispatches \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{
    "event_type": "generate-roofing-video",
    "client_payload": {
      "business_name": "KVS Onderhoud",
      "business_city": "Amsterdam", 
      "business_phone": "+31 20 123 4567",
      "business_email": "info@kvsonderhoud.nl",
      "business_rating": "4.8",
      "business_reviews": "127",
      "business_address": "Hoofdstraat 123, 1011 AB Amsterdam",
      "business_image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      "website_url": "https://kvsonderhoud.nl",
      "website_html_base64": "BASE64_ENCODED_HTML_CONTENT",
      "html_transmission_ready": "true"
    }
  }'
```

### 2. Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start

# Generate a video
curl -X POST http://localhost:3030/generate-video \
  -H "Content-Type: application/json" \
  -d '{"businessName": "Test Dakdekker"}'
```

## 🎯 Business Data Format

### Required Fields
- `business_name` - Company name (e.g., "KVS Onderhoud")
- `business_city` - City location (e.g., "Amsterdam")
- `business_phone` - Dutch phone format (e.g., "+31 20 123 4567")
- `business_email` - Contact email
- `business_address` - Full Dutch address

### Optional Fields
- `business_rating` - Rating (1-5, default: "4.8")
- `business_reviews` - Number of reviews (default: "127")
- `business_image` - Hero background image URL
- `website_url` - Company website
- `website_html_base64` - Custom HTML content (base64 encoded)
- `html_transmission_ready` - Set to "true" to use custom HTML

## 🏠 Dutch Roofing Focus

### Services Covered (in Dutch)
- **Dakbedekking** - Complete roofing
- **Dakreparatie** - Roof repairs
- **Dakisolatie** - Roof insulation
- **Loodwerk** - Lead work & gutters
- **Gootreiniging** - Gutter cleaning
- **Dakinspectie** - Roof inspection

### Dutch Language Elements
- Content in Dutch (Netherlands)
- Euro currency (€)
- Dutch phone format (+31)
- Netherlands addresses
- Local business terms (dakdekker, etc.)

## 🔧 API Endpoints

### Health Check
```bash
GET /health
```
Returns server status and information.

### Generate Video
```bash
POST /generate-video
Content-Type: application/json

{
  "businessName": "Company Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dutch roofing video generated successfully",
  "filename": "roofing_company_name_1234567890.mp4",
  "size": 15728640,
  "duration": "16 seconds",
  "resolution": "1920x1080", 
  "framerate": "60fps"
}
```

## 🎥 Video Specifications

| Property | Value |
|----------|-------|
| Duration | 16 seconds |
| Resolution | 1920x1080 (Full HD) |
| Frame Rate | 60 fps |
| Format | MP4 (H.264) |
| Quality | CRF 23 (high quality) |
| Audio | None (visual only) |

### Video Timeline
- **0-1 second**: Hero section pause
- **1-16 seconds**: Smooth scroll through website content

## 🌐 n8n Integration

### Workflow Setup

1. **HTTP Request Node**: Send business data to GitHub Actions
2. **Repository Dispatch**: Trigger `generate-roofing-video` event
3. **Wait Node**: Allow time for video generation
4. **Download Node**: Retrieve completed video from GitHub Actions artifacts

### Example n8n Workflow

```javascript
// HTTP Request Node Configuration
{
  "method": "POST",
  "url": "https://api.github.com/repos/{{YOUR_REPO}}/dispatches",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "headers": {
    "Accept": "application/vnd.github.v3+json"
  },
  "body": {
    "event_type": "generate-roofing-video",
    "client_payload": "={{$json}}"
  }
}
```

### Business Data Mapping
Map your business data to the required format:

```javascript
// Transform Node
{
  "business_name": "={{$json.company_name}}",
  "business_city": "={{$json.location}}",
  "business_phone": "={{$json.phone}}",
  "business_email": "={{$json.email}}",
  "business_rating": "={{$json.rating || '4.8'}}",
  "business_reviews": "={{$json.review_count || '100'}}",
  "business_address": "={{$json.full_address}}",
  "website_html_base64": "={{$json.html_content}}", 
  "html_transmission_ready": "={{$json.html_content ? 'true' : 'false'}}"
}
```

## 🔄 HTML Content Options

### Option 1: Use Repository Template
- Set `html_transmission_ready: "false"` or omit the field
- System uses `website.html` template with placeholder replacement
- Business data gets inserted into `{{BUSINESS_NAME}}`, `{{BUSINESS_CITY}}`, etc.

### Option 2: Custom HTML Content  
- Set `html_transmission_ready: "true"`
- Provide `website_html_base64` with base64-encoded HTML
- System decodes and uses your custom HTML for video generation

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- FFmpeg installed
- Puppeteer dependencies (Chrome/Chromium)

### Local Setup
```bash
# Clone repository
git clone <repository-url>
cd dutch-roofing-video-generator

# Install dependencies
npm install

# Start development server
npm run dev
```

### GitHub Actions Setup
1. Repository must have `package.json` and server files
2. GitHub Actions workflow automatically installs dependencies
3. Videos are uploaded as GitHub Actions artifacts
4. 30-day retention on generated videos

### Environment Variables (GitHub Actions)
All business data is passed via `client_payload` - no additional environment setup required.

## 📱 Mobile Responsive Template

The Dutch roofing template (`website.html`) is fully responsive:
- Desktop: Full layout with side-by-side sections
- Mobile: Stacked layout optimized for smaller screens
- Video recording: Always uses 1920x1080 viewport regardless of responsive design

## 🎨 Customization

### Modifying the Template
Edit `website.html` to customize:
- Dutch content and terminology
- Visual styling and branding
- Service offerings
- Layout and sections

### Template Placeholders
Available placeholders for dynamic content:
- `{{BUSINESS_NAME}}` - Company name
- `{{BUSINESS_CITY}}` - City location  
- `{{BUSINESS_PHONE}}` - Phone number
- `{{BUSINESS_EMAIL}}` - Email address
- `{{BUSINESS_ADDRESS}}` - Full address
- `{{BUSINESS_RATING}}` - Rating score
- `{{BUSINESS_REVIEWS}}` - Review count
- `{{BUSINESS_IMAGE}}` - Hero image URL
- `{{WEBSITE_URL}}` - Website URL

## 🚨 Troubleshooting

### Common Issues

**Video not generated:**
- Check GitHub Actions logs for errors
- Verify all required business data is provided
- Ensure HTML content is valid if using custom HTML

**Poor video quality:**
- Increase CRF value in server (lower = better quality)
- Check source website loading and content visibility
- Verify image URLs are accessible

**Server startup fails:**
- Install FFmpeg: `sudo apt-get install ffmpeg`
- Install Chrome dependencies for Puppeteer
- Check Node.js version (requires 18+)

### Debug Mode
Enable debug logging in `server-roofing-simple.js`:
```javascript
console.log('🐛 Debug info:', data);
```

## 📊 Performance

### Typical Generation Times
- Video processing: ~30-45 seconds
- Frame generation: ~20-30 seconds  
- FFmpeg encoding: ~10-15 seconds
- Total: ~60-90 seconds per video

### File Sizes
- 16-second video: ~15-25 MB
- Frame count: 960 frames (16s × 60fps)
- Quality: Optimized for web delivery

## 🔐 Security

- No sensitive data stored locally
- Business data passed via GitHub Actions environment
- HTML content decoded from base64 safely
- Puppeteer runs in sandboxed mode

## 📈 Scaling

For high-volume usage:
- Deploy multiple server instances
- Use queue system for video generation
- Consider cloud storage for video output
- Implement caching for repeated content

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support with Dutch roofing video generation:
- Open GitHub Issues for bugs
- Check troubleshooting section first
- Review GitHub Actions logs for errors

---

**Built for Dutch dakdekkers** 🇳🇱 | **Powered by Puppeteer & FFmpeg** 🎬 