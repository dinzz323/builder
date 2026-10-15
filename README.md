# 📱 APK Builder

Build APK dari URL Website atau file HTML menggunakan GitHub Actions + Vercel.

## 🚀 Fitur

- ✅ Website to APK — ubah URL website jadi aplikasi Android
- ✅ HTML to APK — upload file HTML/ZIP jadi aplikasi Android
- ✅ Custom ikon aplikasi
- ✅ Pilih orientasi layar (portrait/landscape)
- ✅ Build otomatis via GitHub Actions
- ✅ 100% gratis

## 📁 Struktur

- `index.html` — Halaman Website to APK
- `html-builder.html` — Halaman HTML to APK
- `style.css` — Styling
- `script.js` — Logic frontend
- `build.js` — API trigger build
- `status.js` — API cek status build
- `download.js` — API info artifact (opsional)
- `.github/workflows/build-apk.yml` — Workflow build APK

## ⚙️ Setup

### 1. GitHub Token
- Buat di https://github.com/settings/tokens
- Scope: `repo` + `workflow`

### 2. Deploy ke Vercel
- Import repo ini ke Vercel
- Set Environment Variables:
  - `GITHUB_TOKEN` = ghp_xxxxx
  - `GITHUB_OWNER` = username-github
  - `GITHUB_REPO` = nama-repo-ini

### 3. Aktifkan Actions Write Permission
- GitHub repo → Settings → Actions → General
- Workflow permissions → **Read and write**

### 4. Test
- Buka URL Vercel
- Isi form → Build APK
- Tunggu 3-5 menit → Download dari GitHub Actions Artifacts

## 📄 Lisensi

MIT
