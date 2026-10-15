// ============ UTILITIES ============
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============ ANIMATED 2D BACKGROUND ============
function initAnimatedBackground() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const particles = [];
    const PARTICLE_COUNT = 60;
    
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];
    
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 3 + 1;
            this.speedX = (Math.random() - 0.5) * 0.8;
            this.speedY = (Math.random() - 0.5) * 0.8;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.opacity = Math.random() * 0.5 + 0.3;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x < 0 || this.x > width) this.speedX *= -1;
            if (this.y < 0 || this.y > height) this.speedY *= -1;
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
    
    function connectParticles() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = particles[i].color;
                    ctx.globalAlpha = (1 - distance / 150) * 0.15;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
    }
    
    function animate() {
        ctx.fillStyle = 'rgba(26, 26, 46, 0.08)';
        ctx.fillRect(0, 0, width, height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        connectParticles();
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
}

initAnimatedBackground();

// ============ UPLOAD AREA SETUP ============
function setupUpload(areaId, inputId, previewId, multiple = false) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!area || !input) return;
    
    // Klik area = trigger input file
    area.addEventListener('click', (e) => {
        if (e.target === input) return;
        input.click();
    });
    
    // Drag & drop
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        area.style.borderColor = '#f093fb';
        area.style.background = 'rgba(240, 147, 251, 0.15)';
        area.style.transform = 'scale(1.02)';
    });
    
    area.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        area.style.borderColor = 'rgba(255, 255, 255, 0.25)';
        area.style.background = 'rgba(255, 255, 255, 0.03)';
        area.style.transform = 'scale(1)';
    });
    
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        area.style.borderColor = 'rgba(255, 255, 255, 0.25)';
        area.style.background = 'rgba(255, 255, 255, 0.03)';
        area.style.transform = 'scale(1)';
        
        const files = e.dataTransfer.files;
        if (files.length) {
            if (multiple) {
                input.files = files;
            } else {
                const dt = new DataTransfer();
                dt.items.add(files[0]);
                input.files = dt.files;
            }
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    
    // Preview saat file dipilih
    input.addEventListener('change', () => {
        if (multiple) return; // Skip preview untuk multiple
        
        const file = input.files[0];
        if (file && preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                preview.style.maxWidth = '120px';
                preview.style.marginTop = '12px';
            };
            reader.readAsDataURL(file);
        }
    });
}

// ============ BUILD LOGIC ============
async function startBuild(config, ids) {
    const progressBox = document.getElementById(ids.progressBox);
    const progressMsg = document.getElementById(ids.progressMsg);
    const progressTitle = document.getElementById(ids.progressTitle);
    const progressFill = document.getElementById(ids.progressFill);
    const downloadSection = document.getElementById(ids.downloadSection);
    
    progressBox.style.display = 'block';
    progressBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    progressTitle.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang Build APK...';
    progressMsg.textContent = 'Menyiapkan data...';
    progressFill.style.width = '5%';
    progressFill.style.background = 'linear-gradient(90deg, #667eea, #f093fb, #667eea)';
    downloadSection.innerHTML = '';
    
    try {
        // Prepare icon
        let iconBase64 = null;
        if (config.icon) {
            progressMsg.textContent = 'Memproses ikon...';
            progressFill.style.width = '10%';
            iconBase64 = await fileToBase64(config.icon);
        }
        
        // Prepare HTML files (ZIP)
        let htmlContentBase64 = null;
        if (config.type === 'html' && config.files && config.files.length) {
            progressMsg.textContent = 'Mengemas file HTML...';
            progressFill.style.width = '20%';
            
            const zip = new JSZip();
            for (const file of config.files) {
                const content = await file.arrayBuffer();
                zip.file(file.name, content);
            }
            const zipBlob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            htmlContentBase64 = await new Promise(r => {
                const reader = new FileReader();
                reader.onload = () => r(reader.result);
                reader.readAsDataURL(zipBlob);
            });
        }
        
        progressMsg.textContent = 'Mengirim ke server build...';
        progressFill.style.width = '30%';
        
        // Send to API
        const response = await fetch('/api/build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: config.type,
                appName: config.appName,
                packageName: config.packageName,
                versionName: config.versionName || '1.0.0',
                url: config.url || '',
                mainFile: config.mainFile || 'index.html',
                orientation: config.orientation,
                iconBase64,
                htmlContentBase64
            })
        });
        
        // Parse response dengan aman
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server mengembalikan response tidak valid (${response.status}). Pastikan API berjalan dengan benar.`);
        }
        
        if (!result.success) {
            throw new Error(result.error || 'Gagal memulai build');
        }
        
        const jobId = result.jobId;
        const runId = result.runId;
        progressMsg.textContent = 'Build dimulai! Menunggu GitHub Actions...';
        progressFill.style.width = '40%';
        
        // Polling status
        let attempts = 0;
        const maxAttempts = 120;
        
        const pollInterval = setInterval(async () => {
            attempts++;
            const progress = Math.min(40 + (attempts * 0.6), 95);
            progressFill.style.width = `${progress}%`;
            
            try {
                const statusRes = await fetch(`/api/status?jobId=${jobId}&runId=${runId || ''}`);
                const statusContentType = statusRes.headers.get('content-type');
                
                if (!statusContentType || !statusContentType.includes('application/json')) {
                    console.warn('Status response bukan JSON');
                    return;
                }
                
                const statusData = await statusRes.json();
                progressMsg.textContent = statusData.message || 'Sedang build...';
                
                if (statusData.status === 'success') {
                    clearInterval(pollInterval);
                    progressFill.style.width = '100%';
                    progressTitle.innerHTML = '<i class="fas fa-check-circle" style="color:#22c55e;"></i> Build Berhasil!';
                    progressMsg.textContent = `APK "${config.appName}" siap diunduh!`;
                    
                    const ghOwner = statusData.githubOwner || 'USERNAME';
                    const ghRepo = statusData.githubRepo || 'builder';
                    const finalRunId = statusData.runId || runId;
                    
                    downloadSection.innerHTML = `
                        <a href="https://github.com/${ghOwner}/${ghRepo}/actions/runs/${finalRunId}" 
                           target="_blank" 
                           class="btn-download">
                            <i class="fas fa-download"></i> Lihat & Download APK
                        </a>
                        <p class="hint-text" style="margin-top:1rem;">
                            Klik tombol di atas → scroll ke bagian <strong>Artifacts</strong> → download <strong>apk-build.zip</strong>
                        </p>
                    `;
                    
                } else if (statusData.status === 'failed') {
                    clearInterval(pollInterval);
                    progressTitle.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i> Build Gagal';
                    progressMsg.textContent = statusData.message || 'Terjadi kesalahan. Coba lagi.';
                    progressFill.style.background = '#ef4444';
                }
                
            } catch (err) {
                console.error('Polling error:', err);
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                progressTitle.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f39c12;"></i> Timeout';
                progressMsg.textContent = 'Build terlalu lama. Cek GitHub Actions secara manual.';
            }
            
        }, 3000);
        
    } catch (err) {
        console.error('Build error:', err);
        progressTitle.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i> Error';
        progressMsg.textContent = err.message;
        progressFill.style.background = '#ef4444';
        progressFill.style.width = '100%';
    }
}

// ============ HALAMAN 1: WEBSITE TO APK ============
setupUpload('iconUploadArea', 'appIcon', 'iconPreview', false);

const websiteForm = document.getElementById('websiteForm');
if (websiteForm) {
    const appNameInput = document.getElementById('appName');
    const pkgInput = document.getElementById('packageName');
    
    appNameInput.addEventListener('blur', () => {
        if (!pkgInput.value && appNameInput.value) {
            const clean = appNameInput.value.toLowerCase().replace(/[^a-z0-9]/g, '');
            pkgInput.value = 'com.app.' + clean;
        }
    });
    
    websiteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = websiteForm.querySelector('.btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang Build...';
        
        await startBuild({
            type: 'website',
            appName: document.getElementById('appName').value,
            url: document.getElementById('websiteUrl').value,
            packageName: document.getElementById('packageName').value,
            versionName: document.getElementById('versionName').value,
            orientation: document.getElementById('orientation').value,
            icon: document.getElementById('appIcon').files[0] || null
        }, {
            progressBox: 'progressBox',
            progressMsg: 'progressMsg',
            progressTitle: 'progressTitle',
            progressFill: 'progressFill',
            downloadSection: 'downloadSection'
        });
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-hammer"></i> Build APK Lagi';
    });
}

// ============ HALAMAN 2: HTML TO APK ============
setupUpload('htmlIconUploadArea', 'htmlAppIcon', 'htmlIconPreview', false);

let htmlFilesData = [];
const htmlFilesInput = document.getElementById('htmlFiles');
const fileListEl = document.getElementById('fileList');

// HTML FILES UPLOAD - FIXED!
if (htmlFilesInput) {
    htmlFilesInput.addEventListener('change', () => {
        const newFiles = Array.from(htmlFilesInput.files);
        
        // Gabungkan dengan file yang sudah ada (hindari duplikat nama)
        newFiles.forEach(newFile => {
            const exists = htmlFilesData.find(f => f.name === newFile.name && f.size === newFile.size);
            if (!exists) {
                htmlFilesData.push(newFile);
            }
        });
        
        renderFileList();
        
        // Reset input supaya bisa upload file yang sama lagi
        htmlFilesInput.value = '';
    });
}

function renderFileList() {
    if (!fileListEl) return;
    fileListEl.innerHTML = '';
    
    let totalSize = 0;
    htmlFilesData.forEach((file, index) => {
        totalSize += file.size;
        const item = document.createElement('div');
        item.className = 'file-item';
        
        let icon = 'fa-file';
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) icon = 'fa-file-code';
        else if (file.name.endsWith('.zip')) icon = 'fa-file-archive';
        else if (file.name.endsWith('.css')) icon = 'fa-file-code';
        else if (file.name.endsWith('.js')) icon = 'fa-file-code';
        else if (/\.(png|jpg|jpeg|svg|gif|ico|webp)$/i.test(file.name)) icon = 'fa-file-image';
        else if (file.name.endsWith('.json')) icon = 'fa-file-code';
        
        item.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${file.name}</span>
            <span class="size">${formatSize(file.size)}</span>
            <i class="fas fa-times remove" data-index="${index}"></i>
        `;
        fileListEl.appendChild(item);
    });
    
    if (htmlFilesData.length > 0) {
        const totalEl = document.createElement('div');
        totalEl.style.cssText = 'text-align:right; color:#a5b4fc; font-weight:bold; padding:0.5rem; font-size: 0.9rem;';
        totalEl.textContent = `Total: ${formatSize(totalSize)} (${htmlFilesData.length} file)`;
        fileListEl.appendChild(totalEl);
    }
    
    fileListEl.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.target.dataset.index);
            htmlFilesData.splice(idx, 1);
            renderFileList();
        });
    });
}

const htmlForm = document.getElementById('htmlForm');
if (htmlForm) {
    const htmlAppNameInput = document.getElementById('htmlAppName');
    const htmlPkgInput = document.getElementById('htmlPackageName');
    
    htmlAppNameInput.addEventListener('blur', () => {
        if (!htmlPkgInput.value && htmlAppNameInput.value) {
            const clean = htmlAppNameInput.value.toLowerCase().replace(/[^a-z0-9]/g, '');
            htmlPkgInput.value = 'com.html.' + clean;
        }
    });
    
    htmlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (htmlFilesData.length === 0) {
            alert('Upload minimal 1 file HTML!');
            return;
        }
        
        const btn = htmlForm.querySelector('.btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang Build...';
        
        await startBuild({
            type: 'html',
            appName: document.getElementById('htmlAppName').value,
            packageName: document.getElementById('htmlPackageName').value,
            versionName: document.getElementById('htmlVersionName').value,
            mainFile: document.getElementById('mainFile').value,
            orientation: document.getElementById('htmlOrientation').value,
            icon: document.getElementById('htmlAppIcon').files[0] || null,
            files: htmlFilesData
        }, {
            progressBox: 'htmlProgressBox',
            progressMsg: 'htmlProgressMsg',
            progressTitle: 'htmlProgressTitle',
            progressFill: 'htmlProgressFill',
            downloadSection: 'htmlDownloadSection'
        });
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-hammer"></i> Build APK Lagi';
    });
}
