const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const app = express();

// Genel ayarlar
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public'))); // favicon için

// Favicon çözümü
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// Kartela resmi yükleme ayarı
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const types = /jpeg|jpg|png|webp/;
    const ext = types.test(path.extname(file.originalname).toLowerCase());
    const mime = types.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Sadece resim dosyası yüklenebilir!'));
  }
});

// ✅ Kumaş ekleme endpoint’i
app.post('/admin/kumas-ekle', upload.single('kartela'), (req, res) => {
  try {
    const { isim, aciklama, satici_turu, seo_baslik, seo_aciklama, vitrin } = req.body;

    if (!req.file) {
      return res.status(400).send('Kartela resmi yüklenmedi');
    }

    const kartela_resmi = req.file.filename;
    const sql = `
      INSERT INTO kumaslar 
      (isim, aciklama, satici_turu, kartela_resmi, seo_baslik, seo_aciklama, aktif, vitrin)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `;

const values = [
  isim,
  aciklama,
  satici_turu.toLowerCase(), // frontend’den geleni normalize et
  kartela_resmi,
  seo_baslik || '',
  seo_aciklama || '',
  vitrin === '1' ? 1 : 0
];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('❌ Veritabanı hatası:', err);
        return res.status(500).send('Kayıt yapılamadı: ' + err.message);
      }
      res.send('✅ Kumaş başarıyla eklendi');
    });
  } catch (error) {
    console.error('❌ Genel hata:', error);
    res.status(500).send('Kayıt yapılamadı');
  }
});

// ✅ Kumaşları listeleme
app.get('/kumaslar', (req, res) => {
  const sql = `
    SELECT id, isim, aciklama, satici_turu, kartela_resmi, seo_baslik, seo_aciklama 
    FROM kumaslar WHERE aktif = 1
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Veritabanı hatası:', err);
      return res.status(500).send('Listeleme yapılamadı');
    }
    res.json(results);
  });
});

// ✅ Vitrin kumaşlarını listeleme
app.get('/kumaslar/vitrin', (req, res) => {
  const sql = `
SELECT id, isim, kartela_resmi, aciklama FROM kumaslar WHERE vitrin = 1

  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Vitrin kumaşlarını çekerken hata:', err);
      return res.status(500).send('Vitrin kumaşları listelenemedi');
    }

    res.json(results);
  });
});

// ✅ Kullanıcı kayıt
app.post('/api/kayit', (req, res) => {
  const { fullname, email, password, rol } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'Tüm alanlar doldurulmalı!' });
  }

  const sql = `INSERT INTO kullanicilar (isim, email, sifre, rol) VALUES (?, ?, ?, ?)`;
  const values = [fullname, email, password, rol || 'musteri'];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Veritabanı hatası:', err);
      return res.status(500).json({ error: 'Kayıt yapılamadı: ' + err.message });
    }
    res.status(201).json({ message: '✅ Kayıt başarılı!' });
  });
});

// ✅ Kullanıcı giriş
app.post('/api/giris', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre zorunlu!' });
  }

  const sql = `SELECT * FROM kullanicilar WHERE email = ? AND sifre = ?`;

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error('Veritabanı hatası:', err);
      return res.status(500).json({ error: 'Giriş yapılamadı.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre.' });
    }

    res.status(200).json({
      message: '✅ Giriş başarılı!',
      user: {
        id: results[0].id,
        isim: results[0].isim,
        email: results[0].email,
        rol: results[0].rol
      }
    });
  });
});

// ✅ Sunucuyu başlat
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} üzerinden çalışıyor`);
});
