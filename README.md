# 📱 APK Builder

Build APK from Website URL or HTML files using GitHub Actions + Vercel.

## 🚀 Deploy

### 1. Fork/Clone Repo

### 2. GitHub Setup
- Buat Personal Access Token (Settings → Developer settings → Tokens)
- Scope: `repo` + `workflow`
- Copy token

### 3. Vercel Setup
- Import repo ke Vercel
- Set Environment Variables:
  - `GITHUB_TOKEN` = ghp_xxx
  - `GITHUB_OWNER` = username-github
  - `GITHUB_REPO` = apk-builder

### 4. GitHub Actions Permission
- Settings → Actions → General
- Workflow permissions → **Read and write** ✅

### 5. Deploy!
Buka URL Vercel → Isi form → Build APK → Tunggu 3-5 menit → Download!

## 📊 Struktur

- `public/` → Frontend (Vercel)
- `api/` → Serverless functions
- `.github/workflows/` → Build engine