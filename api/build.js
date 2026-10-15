export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const body = req.body || {};
    
    if (!body.appName || !body.packageName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nama aplikasi dan package name wajib diisi' 
      });
    }
    
    if (body.type === 'website' && !body.url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL website wajib diisi' 
      });
    }
    
    const ghOwner = process.env.GITHUB_OWNER;
    const ghRepo = process.env.GITHUB_REPO;
    const ghToken = process.env.GITHUB_TOKEN;
    
    if (!ghOwner || !ghRepo || !ghToken) {
      return res.status(500).json({
        success: false,
        error: 'Server belum dikonfigurasi. Hubungi admin.'
      });
    }
    
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let iconUrl = '';
    let htmlContentUrl = '';
    
    if (body.iconBase64) {
      iconUrl = await uploadToTemp(body.iconBase64, `icon-${jobId}.png`);
    }
    
    if (body.type === 'html' && body.htmlContentBase64) {
      htmlContentUrl = await uploadToTemp(body.htmlContentBase64, `html-${jobId}.zip`);
    }
    
    const ghResponse = await fetch(
      `https://api.github.com/repos/${ghOwner}/${ghRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'APK-Builder'
        },
        body: JSON.stringify({
          event_type: 'build_apk',
          client_payload: {
            jobId,
            appName: body.appName,
            packageName: body.packageName,
            versionName: body.versionName || '1.0.0',
            type: body.type,
            url: body.url || '',
            mainFile: body.mainFile || 'index.html',
            iconUrl,
            htmlContentUrl,
            orientation: body.orientation || 'portrait'
          }
        })
      }
    );
    
    if (!ghResponse.ok) {
      const errText = await ghResponse.text();
      console.error('GitHub API error:', ghResponse.status, errText);
      
      if (ghResponse.status === 401) {
        return res.status(500).json({
          success: false,
          error: 'Token GitHub tidak valid. Silakan periksa kembali.'
        });
      }
      if (ghResponse.status === 404) {
        return res.status(500).json({
          success: false,
          error: 'Repo GitHub tidak ditemukan. Cek GITHUB_OWNER dan GITHUB_REPO.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: `GitHub error ${ghResponse.status}`
      });
    }
    
    await new Promise(r => setTimeout(r, 2500));
    
    let runId = null;
    try {
      const runsRes = await fetch(
        `https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/runs?event=repository_dispatch&per_page=1`,
        {
          headers: {
            'Authorization': `token ${ghToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'APK-Builder'
          }
        }
      );
      
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
          runId = runsData.workflow_runs[0].id;
        }
      }
    } catch (e) {
      console.warn('Gagal ambil runId:', e.message);
    }
    
    return res.status(200).json({
      success: true,
      jobId,
      runId,
      message: 'Build dimulai!'
    });
    
  } catch (err) {
    console.error('Build handler error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan pada server'
    });
  }
}

async function uploadToTemp(base64Data, filename) {
  try {
    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), filename);
    
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) return '';
    
    const data = await response.json();
    
    if (data.status === 'success' && data.data && data.data.url) {
      return data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    }
    
    return '';
  } catch (err) {
    console.error('Upload error:', err);
    return '';
  }
}
