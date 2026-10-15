// download.js — Opsional, untuk proxy download APK
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { runId } = req.query;
  
  if (!runId) {
    return res.status(400).json({ error: 'runId required' });
  }
  
  try {
    const ghOwner = process.env.GITHUB_OWNER;
    const ghRepo = process.env.GITHUB_REPO;
    const ghToken = process.env.GITHUB_TOKEN;
    
    const response = await fetch(
      `https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/runs/${runId}/artifacts`,
      {
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'APK-Builder'
        }
      }
    );
    
    const data = await response.json();
    
    if (!data.artifacts || data.artifacts.length === 0) {
      return res.status(404).json({ error: 'APK belum tersedia' });
    }
    
    return res.status(200).json({
      success: true,
      artifacts: data.artifacts.map(a => ({
        name: a.name,
        size: a.size_in_bytes,
        downloadUrl: a.archive_download_url
      }))
    });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
