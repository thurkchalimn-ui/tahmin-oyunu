# Otomasyon Kurulumu (Bildirimler)

Bu klasördeki script, GitHub Actions üzerinde ücretsiz olarak 5 dakikada bir
çalışır ve iki iş yapar:

1. Admin panelinden **elle** girilen maç sonuçları için bekleyen push
   bildirimlerini gönderir.
2. Maç başlamadan **30 dakika önce** hatırlatma bildirimi gönderir.

> Not: "Canlı skor" ve "otomatik sonuç bulma" (dış bir spor API'siyle)
> özellikleri şu an KALDIRILMIŞTIR - ileride ayrıca ele alınacak. Sonuçlar
> tamamen admin panelinden elle giriliyor.

## Kurulum

### 1. Firebase servis hesabı anahtarı oluştur

1. Firebase Console → ⚙️ **Project settings** → **Service accounts** sekmesi
2. **Generate new private key** butonuna bas → bir `.json` dosyası inecek
3. Bu dosyayı **asla** GitHub'a commit etme! Sadece bir sonraki adımda
   GitHub Secret olarak ekleyeceksin.

### 2. GitHub'a secret olarak ekle

1. GitHub'daki repo sayfana git → **Settings** → sol menüde **Secrets and variables → Actions**
2. **New repository secret** ile şu secret'ı ekle:
   - Adı: `FIREBASE_SERVICE_ACCOUNT_KEY` — Değeri: indirdiğin `.json` dosyasının **tüm içeriğini** aç, kopyala, yapıştır

### 3. Test et

1. GitHub repo sayfanda **Actions** sekmesine git
2. Sol menüden **"Bildirim ve Hatırlatma Kontrolü"** workflow'unu seç
3. Sağda **Run workflow** butonuna basarak elle bir kez tetikle
4. Çalışan işin üzerine tıklayıp loglara bak

Bundan sonra otomatik olarak 5 dakikada bir kendi kendine çalışacak,
hiçbir şey yapmana gerek yok.
