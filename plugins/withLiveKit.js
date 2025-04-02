const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const withLiveKit = (config, options) => {
  if (options) {
    let androidOptions = options.android;
    if (androidOptions) {
      let audioType = androidOptions.audioType;
      if (audioType) {
        config = withAndroidManifest(config, (config) => {
          const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
            config.modResults
          );

          AndroidConfig.Manifest.addMetaDataItemToMainApplication(
            mainApplication,
            'io.livekit.reactnative.expo.ANDROID_AUDIO_TYPE',
            audioType
          );
          return config;
        });
      }
    }
  }

  return config;
};

module.exports = withLiveKit; 