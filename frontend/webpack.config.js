const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure devServer object exists
  config.devServer = config.devServer || {};

  // Set headers for OAuth popup support
  config.devServer.headers = {
    ...config.devServer.headers, // Preserve existing headers
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    // Removed COEP as it's too strict and causes issues with OAuth popups
  };

  return config;
};
