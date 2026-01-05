const versionConfig = require('../version-config.json');

module.exports = (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Return version configuration
  res.status(200).json({
    minVersion: versionConfig.minVersion,
    latestVersion: versionConfig.latestVersion,
    updateMessage: versionConfig.updateMessage,
    forceUpdate: versionConfig.forceUpdate,
    storeUrl: versionConfig.storeUrl
  });
};
