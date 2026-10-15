// api/download.js
export default async function handler(req, res) {
  const { runId } = req.query;
  
  if (!runId) {
    return res.status(400).json({ error: 'runId required' });
  }
  
  try {
    // Get artifacts dari run ini
    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/runs/${runId}/artifacts`,
      {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    const data = await response.json();
    
    if (!data.artifacts || data.artifacts.length === 0) {
      return res.status(404).json({ error: 'APK belum tersedia' });
    }
    
    const artifact = data.artifacts[0];
    
    // Redirect ke download URL dengan token
    const downloadRes = await fetch(artifact.archive_download_url, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      redirect: 'manual'
    });
    
    const downloadUrl = downloadRes.headers.get('location');
    
    return res.redirect(302, downloadUrl);
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}