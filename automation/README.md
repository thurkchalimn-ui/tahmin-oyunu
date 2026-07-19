# Otomatik Sonuç Girme Kurulumu

Bu klasördeki script, kickoff saatinden 3 saat sonra hâlâ sonucu boş olan
maçları API-Football'dan sorgulayıp Firestore'a otomatik yazar. GitHub
Actions üzerinde ücretsiz olarak, 15 dakikada bir çalışır.

## 1. RapidAPI'den API-Football anahtarı al

1. https://rapidapi.com/api-sports/api/api-football adresine git
2. Ücretsiz bir RapidAPI hesabı oluştur / giriş yap
3. Sayfada **Subscribe to Test** → **Basic (Free)** planını seç
4. Sağ tarafta görünen `X-RapidAPI-Key` değerini kopyala (bu senin `RAPIDAPI_KEY`'in)

Not: Ücretsiz plan günlük 100 istek ile sınırlıdır. Bu script günde en fazla
maç günü sayısı kadar istek atar (maçları tarihe göre gruplayıp tek istekte
çektiği için 20 maç için bile genelde 1 istek yeterlidir).

## 2. Firebase servis hesabı anahtarı oluştur

1. Firebase Console → ⚙️ **Project settings** → **Service accounts** sekmesi
2. **Generate new private key** butonuna bas → bir `.json` dosyası inecek
3. Bu dosyayı **asla** GitHub'a commit etme! Sadece bir sonraki adımda
   GitHub Secret olarak ekleyeceksin.

## 3. GitHub'a secret olarak ekle

1. GitHub'daki repo sayfana git → **Settings** → sol menüde **Secrets and variables → Actions**
2. **New repository secret** ile iki secret ekle:
   - Adı: `FIREBASE_SERVICE_ACCOUNT_KEY` — Değeri: indirdiğin `.json` dosyasının **tüm içeriğini** aç, kopyala, yapıştır
   - Adı: `RAPIDAPI_KEY` — Değeri: 1. adımda kopyaladığın anahtar

## 4. Test et

1. GitHub repo sayfanda **Actions** sekmesine git
2. Sol menüden **"Maç Sonuçlarını Otomatik Kontrol Et"** workflow'unu seç
3. Sağda **Run workflow** butonuna basarak elle bir kez tetikle
4. Çalışan işin üzerine tıklayıp loglara bak — hata var mı, kaç maç güncellendi görebilirsin

Bundan sonra otomatik olarak 15 dakikada bir kendi kendine çalışacak,
hiçbir şey yapmana gerek yok.

## Önemli sınırlama

Otomatik eşleştirme, admin panelinde girdiğin takım adı ile API-Football'daki
takım adının (büyük/küçük harf ve boşluk farkları hariç) **birebir aynı**
olmasını gerektirir. Örn. "Galatasaray" ↔ "Galatasaray" eşleşir, ama
"GS" ↔ "Galatasaray" eşleşmez. Eşleşme bulunamazsa script o maçı atlar,
sen admin panelinden elle girmeye devam edebilirsin — otomasyon hiçbir
zaman veri bozmaz, sadece "en iyi çaba" ile yardımcı olur.
