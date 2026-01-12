# Android SDK API Level Troubleshooting

## Problem

When building the Docker frontend container, you may encounter errors related to Android SDK API 36:
- "Package 'platforms;android-36' is not available"
- "Failed to install the following Android SDK packages"
- Build timeout or network issues

## Why This Happens

- **API 36 may not be released yet** or still in preview/beta
- **Network issues** downloading large SDK components
- **Google's SDK servers** may be slow or unavailable

## Solution: Use API 35 (Stable)

API 35 is stable and fully compatible with React Native 0.83. Here's how to switch:

### Step 1: Update Dockerfile.frontend

Edit `Dockerfile.frontend` and find this section:

```dockerfile
# Install required Android SDK components (matching your build.gradle versions)
RUN ${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "ndk;27.1.12297006" \
    "system-images;android-36;google_apis;x86_64"
```

**Change to:**

```dockerfile
# Install required Android SDK components (using stable API 35)
RUN ${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-35" \
    "build-tools;35.0.0" \
    "ndk;27.1.12297006" \
    "system-images;android-35;google_apis;x86_64"
```

### Step 2: Update android/build.gradle

Edit `android/build.gradle` and find this section:

```gradle
buildscript {
    ext {
        buildToolsVersion = "36.0.0"
        minSdkVersion = 24
        compileSdkVersion = 36
        targetSdkVersion = 36
        ndkVersion = "27.1.12297006"
        kotlinVersion = "2.1.20"
    }
    // ...
}
```

**Change to:**

```gradle
buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35
        targetSdkVersion = 35
        ndkVersion = "27.1.12297006"
        kotlinVersion = "2.1.20"
    }
    // ...
}
```

### Step 3: Rebuild Docker Image

```bash
# Stop containers
docker-compose down

# Rebuild frontend with no cache
docker-compose build --no-cache frontend

# Start everything
docker-compose up -d
```

### Step 4: Verify

Check that the frontend container built successfully:

```bash
docker-compose ps
```

You should see:
```
NAME                       STATUS
fintrackerapp-frontend     Up
fintrackerapp-backend      Up
```

## Alternative: Check Available SDK Versions

If you want to see what SDK versions are actually available:

```bash
# Start a temporary container
docker-compose run frontend bash

# Inside the container, list available packages
${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager --list | grep "platforms;android"
```

This will show output like:
```
platforms;android-33
platforms;android-34
platforms;android-35
```

Use the highest stable version available.

## API Level Compatibility

| API Level | Android Version | Status |
|-----------|-----------------|--------|
| 35 | Android 15 | ✅ Stable |
| 34 | Android 14 | ✅ Stable |
| 33 | Android 13 | ✅ Stable |
| 36 | Android 16 (?) | ⚠️ May be preview/beta |

**Recommendation**: Use API 35 for maximum stability.

## Impact on Your App

Switching from API 36 to API 35 has **minimal impact**:
- ✅ Your app will still compile and run
- ✅ Still supports Android 7.0+ (minSdkVersion 24)
- ✅ React Native 0.83 fully compatible with API 35
- ✅ All your code works exactly the same

The `compileSdkVersion` just determines which SDK tools are used to build - it doesn't limit which Android versions your app runs on.

## Preventing Future Issues

To avoid this in the future:

1. **Use LTS/Stable SDK versions** - Stick to API levels that have been released for at least a few months
2. **Check Google's SDK release schedule** before updating
3. **Pin specific versions** in your build files (like we're doing with API 35)

## Need Help?

If you're still having issues:

1. **Check Docker logs**:
   ```bash
   docker-compose logs frontend
   ```

2. **Try manual SDK manager**:
   ```bash
   docker-compose run frontend bash
   ${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager --update
   ```

3. **Clean rebuild**:
   ```bash
   docker-compose down -v --rmi all
   # Then edit files as shown above
   docker-compose build --no-cache
   docker-compose up -d
   ```
