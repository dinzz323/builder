// status.js — API endpoint /api/status
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { jobId, runId } = req.query;
  
  if (!jobId) {
    return res.status(400).json({ error: 'jobId required' });
  }
  
  try {
    const ghOwner = process.env.GITHUB_OWNER;
    const ghRepo = process.env.GITHUB_REPO;
    const ghToken = process.env.GITHUB_TOKEN;
    
    if (!ghOwner || !ghRepo || !ghToken) {
      throw new Error('GitHub env variables belum diset');
    }
    
    let targetRunId = runId;
    
    if (!targetRunId || targetRunId === 'null' || targetRunId === 'undefined') {
      const runsRes = await fetch(
        `https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/runs?event=repository_dispatch&per_page=10`,
        {
          headers: {
            'Authorization': `token ${ghToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'APK-Builder'
          }
        }
      );
      
      if (!runsRes.ok) throw new Error('Gagal fetch runs');
      
      const runsData = await runsRes.json();
      
      const recent = runsData.workflow_runs.filter(r => {
        const t = new Date(r.created_at).getTime();
        return Date.now() - t < 10 * 60 * 1000;
      });
      
      if (recent.length === 0) {
        return res.status(200).json({
          status: 'building',
          message: 'Menunggu build dimulai...',
          githubOwner: ghOwner,
          githubRepo: ghRepo
        });
      }
      
      targetRunId = recent[0].id;
    }
    
    const runRes = await fetch(
      `https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/runs/${targetRunId}`,
      {
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'APK-Builder'
        }
      }
    );
    
    if (!runRes.ok) throw new Error('Gagal fetch run detail');
    
    const runData = await runRes.json();
    
    let status = 'building';
    let message = 'Sedang build...';
    
    if (runData.status === 'completed') {
      if (runData.conclusion === 'success') {
        status = 'success';
        message = 'Build berhasil! APK siap diunduh.';
      } else {
        status = 'failed';
        message = `Build gagal: ${runData.conclusion}`;
      }
    } else if (runData.status === 'queued') {
      message = 'Menunggu antrian GitHub Actions...';
    } else if (runData.status === 'in_progress') {
      message = 'Sedang build APK... (3-5 menit)';
    }
    
    return res.status(200).json({
      status,
      message,
      runId: targetRunId,
      runUrl: runData.html_url,
      githubOwner: ghOwner,
      githubRepo: ghRepo
    });
    
  } catch (err) {
    console.error('Status error:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}
