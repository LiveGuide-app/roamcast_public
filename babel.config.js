console.log('Loading babel.config.js');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        envList: [
          'EXPO_PUBLIC_SUPABASE_URL',
          'EXPO_PUBLIC_SUPABASE_ANON_KEY',
          'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
          'EXPO_PUBLIC_APP_URL_SCHEME',
          'EXPO_PUBLIC_LIVEKIT_WS_URL'
        ],
        safe: false,
        allowUndefined: true,
      }],
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
          },
        },
      ],
    ],
  };
}; 