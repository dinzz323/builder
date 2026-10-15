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

function setupUpload(areaId, inputId, previewId) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!area || !input) return;
    
    area.addEventListener('click', () => input.click());
    
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.style.borderColor = '#667eea';
        area.style.background = '#f0f3ff';
    });
    
    area.addEventListener('dragleave', () => {
        area.style.borderColor = '#ccc';
        area.style.background = '#fafafa';
    });
    
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.style.borderColor = '#ccc';
        area.style.background = '#fafafa';
        if (e.dataTransfer.files.length) {
            input.files = e.dataTransfer.files;
            input.dispatchEvent(new Event('change'));
        }
    });
    
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file && preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
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
    progressBox.scrollIntoView({ behavior: 'smooth' });
    progressTitle.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang Build APK...';
    progressMsg.textContent = 'Mengirim permintaan ke server build...';
    progressFill.style.width = '10%';
    progressFill.style.background = 'linear-gradient(90deg, #667eea, #764ba2)';
    downloadSection.innerHTML = '';
    
    try {
        let iconBase64 = null;
        if (config.icon) {
            iconBase64 = await fileToBase64(config.icon);
        }
        
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
                themeColor: config.themeColor,
                splashBg: config.splashBg || '#ffffff',
                orientation: config.orientation,
                iconBase64,
                htmlContentBase64
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Gagal memulai build');
        }
        
        const jobId = result.jobId;
        const runId = result.runId;
        progressMsg.textContent = 'Build dimulai! Menunggu GitHub Actions...';
        progressFill.style.width = '40%';
        
        let attempts = 0;
        const maxAttempts = 120;
        
        const pollInterval = setInterval(async () => {
            attempts++;
            progressFill.style.width = `${Math.min(40 + attempts * 0.4, 95)}%`;
            
            try {
                const statusRes = await fetch(`/api/status?jobId=${jobId}&runId=${runId || ''}`);
                const statusData = await statusRes.json();
                
                progressMsg.textContent = statusData.message || 'Sedang build...';
                
                if (statusData.status === 'success') {
                    clearInterval(pollInterval);
                    progressFill.style.width = '100%';
                    progressTitle.innerHTML = '<i class="fas fa-check-circle" style="color:#27ae60;"></i> Build Berhasil!';
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
                    progressTitle.innerHTML = '<i class="fas fa-times-circle" style="color:#e74c3c;"></i> Build Gagal';
                    progressMsg.textContent = statusData.message || 'Terjadi kesalahan. Coba lagi.';
                    progressFill.style.background = '#e74c3c';
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
        progressTitle.innerHTML = '<i class="fas fa-times-circle" style="color:#e74c3c;"></i> Error';
        progressMsg.textContent = 'Error: ' + err.message;
        progressFill.style.background = '#e74c3c';
        progressFill.style.width = '100%';
    }
}

// ============ HALAMAN 1: WEBSITE TO APK ============
setupUpload('iconUploadArea', 'appIcon', 'iconPreview');

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
            themeColor: document.getElementById('themeColor').value,
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
setupUpload('htmlIconUploadArea', 'htmlAppIcon', 'htmlIconPreview');

let htmlFilesData = [];
const htmlFilesInput = document.getElementById('htmlFiles');
const fileListEl = document.getElementById('fileList');

if (htmlFilesInput) {
    htmlFilesInput.addEventListener('change', () => {
        htmlFilesData = Array.from(htmlFilesInput.files);
        renderFileList();
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
        else if (/\.(png|jpg|jpeg|svg|gif|ico)$/i.test(file.name)) icon = 'fa-file-image';
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
        totalEl.style.cssText = 'text-align:right; color:#667eea; font-weight:bold; padding:0.5rem;';
        totalEl.textContent = `Total: ${formatSize(totalSize)} (${htmlFilesData.length} file)`;
        fileListEl.appendChild(totalEl);
    }
    
    fileListEl.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
            themeColor: document.getElementById('htmlThemeColor').value,
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
