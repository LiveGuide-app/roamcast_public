# LiveKit Expo Plugin Debugging Guide

## Overview
This document outlines a systematic approach to debugging LiveKit integration issues in an Expo project. The focus is on resolving the Gradle build errors related to the Kotlin Expo Modules Core plugin.

## Dependency Chain Analysis

### 1. Current Project Versions
| Package | Current Version | Source |
|---------|----------------|---------|
| expo | 50.0.5 | package.json |
| react-native | 0.73.6 | package.json |
| @livekit/react-native | 2.1.0 | package.json |
| @livekit/react-native-expo-plugin | 1.0.1 | package.json |
| @livekit/react-native-webrtc | 125.0.9 | package.json |
| expo-modules-core | 1.11.14 | transitive dependency |

### 2. LiveKit Plugin Requirements
| Package | Required Version | Source |
|---------|-----------------|---------|
| expo | * (any version) | plugin's peerDependencies |
| react | * (any version) | plugin's peerDependencies |
| react-native | * (any version) | plugin's peerDependencies |
| @livekit/react-native | ^2.1.0 | plugin's peerDependencies |
| expo-modules-core | ^1.11.12 | plugin's devDependencies |

### 3. Version Compatibility Analysis
| Package | Current | Required | Status | Notes |
|---------|---------|----------|---------|-------|
| expo | 50.0.5 | * | ✅ | Compatible |
| react-native | 0.73.6 | * | ✅ | Compatible |
| @livekit/react-native | 2.1.0 | ^2.1.0 | ✅ | Compatible |
| @livekit/react-native-expo-plugin | 1.0.1 | N/A | ⚠️ | Current version |
| @livekit/react-native-webrtc | 125.0.9 | N/A | ⚠️ | Current version |
| expo-modules-core | 1.11.14 | ^1.11.12 | ✅ | Compatible |

## Debugging Steps

### 1. Environment Verification
- [x] Check Expo development client installation
  - Status: ✅ Installed (version 3.3.12)
  - Action: None needed
- [x] Verify local development environment setup
  - Status: ✅ Expo CLI 0.17.13 installed
  - Action: None needed
- [x] Verify EAS CLI installation
  - Status: ✅ EAS CLI installed (using npx eas)
  - Action: None needed
- [x] Validate project configuration
  - Status: ✅ app.json configured correctly
  - Status: ✅ package.json dependencies set up
  - Action: None needed
- [x] EAS Local Build Behavior
  - Status: ✅ Using local files (not git)
  - Note: Building from current working directory state
  - Note: No git commit required for local builds

### Next Steps
Since we're using EAS for building, we can skip the local Android SDK setup and move directly to:
1. Dependency Analysis
2. Build Configuration Review
3. Plugin Configuration Verification

### 2. Dependency Analysis
#### Peer Dependency Analysis
1. @livekit/react-native-expo-plugin (1.0.1)
   - Required:
     - @livekit/react-native: ^2.1.0
     - expo: *
     - react: *
     - react-native: *
   - Status: ✅ All satisfied

2. @livekit/react-native (2.6.5)
   - Required:
     - @livekit/react-native-webrtc: ^125.0.8
     - livekit-client: ^2.9.0
     - react: *
     - react-native: *
   - Status: ✅ All satisfied

3. @livekit/react-native-webrtc (125.0.9)
   - Required:
     - react-native: >=0.60.0
   - Status: ✅ Satisfied (we have 0.73.6)

#### Version Compatibility Matrix
| Package | Current Version | Required Version | Status | Notes |
|---------|----------------|------------------|---------|-------|
| @livekit/react-native-expo-plugin | 1.0.1 | N/A | ✅ | Current version |
| @livekit/react-native | 2.6.5 | ^2.1.0 | ✅ | Compatible |
| @livekit/react-native-webrtc | 125.0.9 | ^125.0.8 | ✅ | Compatible |
| livekit-client | 2.9.0 | ^2.9.0 | ✅ | Compatible |
| expo | 50.0.5 | * | ✅ | Compatible |
| react | 18.2.0 | * | ✅ | Compatible |
| react-native | 0.73.6 | * | ✅ | Compatible |

#### Analysis Findings
1. All peer dependencies are satisfied
2. No version conflicts detected
3. All packages are using compatible versions
4. The Kotlin plugin error is likely not related to peer dependency issues

#### Next Steps
Since peer dependencies are all satisfied, we should:
1. Move to Build Configuration review
2. Focus on plugin application order
3. Check Gradle configuration files

### 3. Build Configuration
#### Current Configuration Analysis
1. app.json Plugin Configuration
   - Current plugins order:
     ```json
     "plugins": [
       "@livekit/react-native-expo-plugin",
       "@config-plugins/react-native-webrtc",
       "expo-av"
     ]
     ```
   - Status: ✅ Plugin order looks correct
   - Note: expo-modules-core is automatically included and doesn't need to be listed

2. EAS Build Configuration (eas.json)
   - Development build configured correctly
   - No specific plugin configuration issues found
   - Status: ✅ Configuration looks correct

#### Next Steps
Since the plugin configuration appears correct, we should:
1. Move to Specific Error Investigation
2. Focus on the Kotlin plugin application sequence
3. Check for any potential conflicts in the build process

### 4. Specific Error Investigation
Current Error: `Failed to apply plugin class 'KotlinExpoModulesCorePlugin'`

#### Plugin Configuration Analysis
1. LiveKit Plugin Structure
   - Using expo-modules-core as a dependency
   - Attempting to apply Kotlin plugin through ExpoModulesCorePlugin.gradle
   - Default Kotlin version: 1.8.10

2. Potential Issues Found
   - Plugin assumes expo-modules-core project is in same project structure
   - Kotlin plugin application might fail in EAS build environment
   - Possible version mismatch between Kotlin and expo-modules-core

3. Next Steps
   - Try explicitly setting Kotlin version in project
   - Consider adding expo-modules-core as a direct dependency
   - Check if we need to modify the plugin's build.gradle

#### Investigation Points
1. Plugin Application Order
   - Current order in app.json is correct
   - Added audioType configuration
   - Status: ✅ Configuration looks correct

2. Gradle Configuration
   - Found potential issue in plugin's build.gradle
   - Plugin might not be properly resolving expo-modules-core
   - Need to verify Kotlin version compatibility

3. Kotlin Integration
   - Default version: 1.8.10
   - Need to verify compatibility with expo-modules-core
   - Consider adding explicit Kotlin version configuration

### 5. Testing Steps
1. Clean Environment
   ```bash
   rm -rf node_modules
   rm -rf android
   rm -rf ios
   ```

2. Dependency Installation
   ```bash
   npm install
   ```

3. Build Verification
   ```bash
   npx eas build --platform android --local
   ```

## Common Issues and Solutions

### 1. Plugin Application Order
If the Kotlin plugin isn't being applied correctly:
- Ensure expo-modules-core is listed before LiveKit plugin in app.json
- Check if expo-modules-core is properly initialized

### 2. Version Conflicts
If dependency versions are incompatible:
- Review the version compatibility matrix
- Check for peer dependency conflicts
- Verify expo-modules-core version matches Expo SDK

### 3. Gradle Configuration
If Gradle build fails:
- Verify Android Gradle Plugin version
- Check Kotlin plugin configuration
- Validate build.gradle structure

## Next Steps
1. Review each section of the debugging guide
2. Document findings for each verification step
3. Identify specific failure points
4. Implement solutions based on findings
5. Test changes incrementally

## Resources
- [LiveKit React Native Documentation](https://docs.livekit.io/guides/client-sdk-react-native)
- [Expo Development Client Guide](https://docs.expo.dev/development/development-builds/introduction/)
- [Expo Modules Core Documentation](https://docs.expo.dev/modules/core/) 