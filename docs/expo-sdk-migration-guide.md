# Expo SDK Migration Guide: 50.0.5 to 52.0.46

This document outlines a structured approach for upgrading Roamcast from Expo SDK 50.0.5 to the latest stable version 52.0.46. The migration should be performed carefully with thorough testing at each stage.

## Table of Contents
1. [Pre-Migration Assessment](#pre-migration-assessment)
2. [Preparation Steps](#preparation-steps)
3. [Migration Process](#migration-process)
4. [Testing and Validation](#testing-and-validation)
5. [Troubleshooting Common Issues](#troubleshooting-common-issues)
6. [Rollback Plan](#rollback-plan)
7. [Post-Migration Steps](#post-migration-steps)
8. [Dependency Compatibility Check](#dependency-compatibility-check)

## Pre-Migration Assessment

### Current Dependencies Analysis
- **Expo Core**: ~50.0.5    
- **React Native**: 0.73.6
- **Key Dependencies**:
  - @livekit/react-native: ^2.1.0
  - @livekit/react-native-webrtc: ^125.0.9
  - @stripe/stripe-react-native: ^0.35.0
  - expo-router: 3.4.10

### Breaking Changes Research
Before starting the migration, review the breaking changes in:
- [Expo SDK 51 Release Notes](https://docs.expo.dev/workflow/upgrading/#sdk-51)
- [Expo SDK 52 Release Notes](https://docs.expo.dev/workflow/upgrading/#sdk-52)

Pay special attention to:
- LiveKit compatibility with the new Expo versions
- Stripe React Native compatibility changes
- Changes to Audio API if any (critical for our streaming functionality)

## Dependency Compatibility Check

Before starting the migration, verify compatibility of key dependencies with Expo 52:

### Automated Compatibility Check
Run the following command to analyze your dependencies against Expo 52:

```bash
npx expo-doctor check-dependencies --sdk-version 52.0.0
```

### React Native Version Mapping
Expo 52 uses React Native 0.74.x, while your current setup uses React Native 0.73.6. This is a minor version change that may include API updates.

You can check the official Expo SDK version mapping:
- Expo SDK 50: React Native 0.73.x
- Expo SDK 51: React Native 0.73.x
- Expo SDK 52: React Native 0.74.x

### Advanced Dependency Analysis Tools

#### 1. Create Temporary Project with Target Expo Version
For critical projects, create a test project with the target Expo version to validate:

```bash
# Create a test project with Expo 52
npx create-expo-app test-expo52 --template blank@sdk-52

# Change to test project directory
cd test-expo52

# Install and test key dependencies one by one
npm install @livekit/react-native @livekit/react-native-webrtc
npm install @stripe/stripe-react-native
npm install expo-router@latest

# Start the project to verify basic compatibility
npx expo start
```

#### 2. Dependency Tree Analysis
Analyze dependency conflicts before upgrading:

```bash
# View dependency tree
npm ls @livekit/react-native-webrtc
npm ls react-native

# Check for dependency conflicts
npm dedupe --dry-run
```

#### 3. Gradual Update Testing
Test individual packages with your current app before full migration:

```bash
# Back in your main project
cd /path/to/your/project

# Test latest version of individual packages
npm install @livekit/react-native@latest --no-save
npx expo start --clear
```

### Manual Verification
For critical dependencies that need special attention:

#### LiveKit Compatibility
Check LiveKit compatibility with Expo 52:
```bash
npm view @livekit/react-native@latest peerDependencies
npm view @livekit/react-native-webrtc@latest peerDependencies
```

Look for compatibility with React Native versions used in Expo 52.

#### Stripe React Native
Check Stripe compatibility:
```bash
npm view @stripe/stripe-react-native@latest peerDependencies
```

#### Expo Router Compatibility
```bash
npm view expo-router@latest peerDependencies
```

### Version Compatibility Matrix

| Dependency | Current Version | Latest Version | Compatible with Expo 52 | Notes |
|------------|----------------|----------------|------------------------|-------|
| @livekit/react-native | ^2.1.0 | 2.7.3 | Yes | Uses loose peer dependencies (react-native: "*") |
| @livekit/react-native-webrtc | ^125.0.9 | ^125.0.8+ | Yes | Required by the latest LiveKit React Native |
| @stripe/stripe-react-native | ^0.35.0 | 0.44.0 | Yes | Compatible with Expo >=46.0.9 |
| expo-router | 3.4.10 | 4.0.20 | Yes | Major version change (3.x → 4.x) - requires testing |

The compatibility check shows that all key dependencies have versions that can work with Expo 52. However, the major version upgrade for expo-router (3.x to 4.x) may require code changes and thorough testing.

## Preparation Steps

### 1. Create a Migration Branch
```bash
git checkout -b feature/expo-sdk-upgrade
```

### 2. Environment Setup
Set up a dedicated testing environment:
```bash
cp .env.development .env.migration-test
```

### 3. Backup Critical Files
```bash
mkdir -p backups/expo-migration
cp package.json backups/expo-migration/
cp app.json backups/expo-migration/
cp babel.config.js backups/expo-migration/
cp eas.json backups/expo-migration/
```

### 4. Create Snapshot of Current Working Build
```bash
# For iOS
npm run build:preview:ios

# For Android
npm run build:preview:android
```

## Migration Process

### Phase 1: Update to Intermediate Version (Expo 51)

#### 1. Update Core Dependencies
```bash
npx expo install expo@51.0.x
```

This will update the core packages. Follow the prompts to update related packages.

#### 2. Update package.json Dependencies Manually
```json
{
  "dependencies": {
    "expo": "~51.0.x",
    "react": "18.2.0",
    "react-native": "0.72.x",
    "expo-status-bar": "~1.6.0"
    // Other dependencies will be updated by the expo install command
  }
}
```

#### 3. Update Configuration Files
Review and update:
- `app.json`: Check for any deprecated properties
- `eas.json`: Ensure EAS CLI version compatibility
- `babel.config.js`: Update if needed

#### 4. Run Initial Tests
```bash
npm install
npx expo start --clear
```

Fix any immediate issues before proceeding.

#### 5. Test Core Functionality
- Test navigation flow
- Test LiveKit audio streaming (critical path)
- Test Stripe integration

### Phase 2: Final Update to Expo 52

#### 1. Update Core Dependencies
```bash
npx expo install expo@52.0.46
```

#### 2. Update package.json Dependencies Manually
```json
{
  "dependencies": {
    "expo": "~52.0.46",
    "react": "18.2.0",
    "react-native": "0.73.x",
    "expo-status-bar": "~1.11.x"
    // Other dependencies will be updated by the expo install command
  }
}
```

#### 3. Update Plugin Configuration
Check `plugins/withLiveKit.js` for compatibility with Expo 52.

#### 4. Update SDK-Specific Code
Review usage of:
- Audio APIs
- LiveKit integration
- Stripe integration
- File system operations

## Testing and Validation

### 1. Local Development Testing
```bash
npm install
npx expo start --clear
```

### 2. Development Build Testing
```bash
# Create development build for testing
eas build --profile development --platform ios
eas build --profile development --platform android
```

### 3. Core Functionality Test Matrix

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| User Authentication | | | |
| LiveKit Audio Streaming | | | |
| Tour Creation | | | |
| Tour Playback | | | |
| Stripe Payments | | | |
| Tour Guides | | | |
| Background Audio | | | |

### 4. Regression Testing
Complete a full regression test suite based on the test scenarios in `/docs/manual-testing/`.

### 5. Performance Testing
- Startup time
- Audio latency
- Memory usage
- Battery consumption

## Troubleshooting Common Issues

### Native Module Versioning
If you encounter errors related to native modules:
```bash
npx expo install --fix
```

### React Native WebRTC Issues
LiveKit may need updates:
```bash
npm install @livekit/react-native@latest
npm install @livekit/react-native-webrtc@latest
```

### Plugin Compatibility
For config plugin issues:
```bash
npx expo install @config-plugins/react-native-webrtc@latest
```

### EAS Build Failures
1. Check EAS CLI version:
```bash
npm install -g eas-cli@latest
```

2. Update eas.json:
```json
{
  "cli": {
    "version": ">= 7.0.0"
  }
}
```

## Rollback Plan

### 1. Revert to Previous Branch
```bash
git checkout main
```

### 2. Restore from Backup
```bash
cp backups/expo-migration/package.json ./
cp backups/expo-migration/app.json ./
cp backups/expo-migration/babel.config.js ./
cp backups/expo-migration/eas.json ./
```

### 3. Clean Install
```bash
rm -rf node_modules
npm install
```

## Post-Migration Steps

### 1. Documentation Update
Update project documentation to reflect the new SDK version.

### 2. CI/CD Pipeline Updates
Update GitHub Actions or other CI/CD workflows.

### 3. Final Production Build
```bash
# For iOS
npm run build:prod:ios

# For Android
npm run build:prod:android
```

### 4. Monitoring Plan
Implement enhanced monitoring for the first two weeks after deployment.

## Resources

- [Official Expo Upgrade Guide](https://docs.expo.dev/workflow/upgrading/)
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo SDK 52 Changelog](https://blog.expo.dev/expo-sdk-52-9ec965eb1186) 