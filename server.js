const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// Güvenlik middleware'leri
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(express.json());

// Gerçek IP alma fonksiyonu
function getClientIP(req) {
  try {
    // Cloudflare, Heroku, AWS ELB gibi platformlar için
    const cloudflareIP = req.headers['cf-connecting-ip'];
    if (cloudflareIP) return cloudflareIP;

    // X-Forwarded-For header'ı (proxy/load balancer için)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = xForwardedFor.split(',');
      return ips[0].trim();
    }

    // X-Real-IP header'ı (nginx için)
    const xRealIP = req.headers['x-real-ip'];
    if (xRealIP) return xRealIP;

    // Socket IP (son çare)
    const socketIP = req.socket.remoteAddress || 
                    req.connection.remoteAddress;

    // IPv6 formatını IPv4'e çevir
    if (socketIP) {
      return socketIP.replace('::ffff:', '').replace('::1', '127.0.0.1');
    }

    return 'IP alınamadı';
  } catch (error) {
    console.error('IP alma hatası:', error);
    return 'Hata';
  }
}

// API Routes
app.get("/", (req, res) => {
  res.json({ 
    message: "KonserTakip API çalışıyor!",
    version: "1.0.0",
    endpoints: {
      getIP: "/api/ip",
      health: "/api/health"
    }
  });
});

// IP alma endpoint'i
app.get("/api/ip", (req, res) => {
  try {
    const clientIP = getClientIP(req);
    
    const userAgent = req.headers['user-agent'] || 'Bilinmiyor';
    
    res.json({
      success: true,
      ip: clientIP,
      userAgent: userAgent,
      timestamp: new Date().toISOString(),
      method: 'nodejs-backend'
    });
  } catch (error) {
    console.error('IP endpoint hatası:', error);
    res.status(500).json({
      success: false,
      error: "IP alınamadı",
      ip: "Hata"
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint bulunamadı"
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Sunucu hatası:', error);
  res.status(500).json({
    success: false,
    error: "Internal Server Error"
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KonserTakip Backend çalışıyor: http://0.0.0.0:${PORT}`);
});
