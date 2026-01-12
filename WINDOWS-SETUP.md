# 🪟 Windows Setup Guide for FinTrackerApp

## For Team Members on Windows

This guide is for Windows users who already have the repository cloned.

---

## Step 1: Install Docker Desktop for Windows

1. **Download Docker Desktop**: https://docs.docker.com/desktop/install/windows-install/
2. **System Requirements**:
   - Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
   - OR Windows 11 64-bit
   - WSL 2 feature enabled (Docker installer will help with this)
3. **Install and restart** your computer when prompted
4. **Start Docker Desktop** from the Start menu

---

## Step 2: Update Your Repository

Open **PowerShell** or **Command Prompt** and navigate to your project:

```powershell
cd FinTrackerApp
git pull origin main
```

This will download all the new Docker configuration files.

---

## Step 3: Start Everything with One Command

### Option A: Using PowerShell/CMD (No Make required)

```powershell
docker-compose up -d
```

That's it! Everything is now running.

### Option B: Install Make for Windows (Optional)

If you want to use the simpler `make` commands:

**Using Chocolatey** (recommended):
```powershell
# Install Chocolatey first if you don't have it:
# Run PowerShell as Administrator and paste:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Then install Make:
choco install make
```

After installing, you can use:
```powershell
make up
```

---

## Step 4: Verify Everything is Running

Check container status:

```powershell
docker-compose ps
```

You should see:
```
NAME                       STATUS    PORTS
fintrackerapp-backend      Up        0.0.0.0:8080->8080/tcp
fintrackerapp-frontend     Up        0.0.0.0:8081->8081/tcp
```

Test the backend API:

```powershell
curl http://localhost:8080/api/health
```

Or open in browser: http://localhost:8080/api/health

---

## Daily Development Commands

### Without Make (PowerShell/CMD)

| Task | Command |
|------|---------|
| Start services | `docker-compose up -d` |
| Stop services | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| View frontend logs only | `docker-compose logs -f frontend` |
| View backend logs only | `docker-compose logs -f backend` |
| Enter frontend container | `docker-compose exec frontend /bin/bash` |
| Enter backend container | `docker-compose exec backend /bin/bash` |
| Build Android APK | `docker-compose exec frontend bash -c "cd android && ./gradlew assembleDebug"` |
| Restart services | `docker-compose restart` |
| Check status | `docker-compose ps` |

### With Make (If Installed)

| Task | Command |
|------|---------|
| Start services | `make up` |
| Stop services | `make down` |
| View logs | `make logs` |
| Enter frontend container | `make shell-frontend` |
| Enter backend container | `make shell-backend` |
| Build Android APK | `make build-apk` |
| Show all commands | `make help` |

---

## Connecting Your Android Device on Windows

### Option 1: Physical Android Device

1. **Enable USB Debugging** on your Android phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Install ADB on Windows**:
   
   **Method A: Using Chocolatey (Easiest)**
   ```powershell
   choco install adb
   ```
   
   **Method B: Using Android Studio**
   - Install Android Studio: https://developer.android.com/studio
   - ADB will be at: `C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools`
   
   **Method C: Download Platform Tools**
   - Download: https://developer.android.com/tools/releases/platform-tools
   - Extract to `C:\platform-tools`

3. **Add ADB to PATH** (if not using Chocolatey):
   
   **GUI Method**:
   - Right-click "This PC" → Properties
   - Advanced System Settings → Environment Variables
   - Under "System Variables", find "Path" and click Edit
   - Click New and add: `C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools`
   - Or if you downloaded platform tools: `C:\platform-tools`
   - Click OK on all dialogs
   - **Restart PowerShell/CMD**
   
   **PowerShell Method** (Run as Administrator):
   ```powershell
   # For Android Studio installation
   $path = [Environment]::GetEnvironmentVariable('Path', 'Machine')
   $newPath = $path + ';C:\Users\' + $env:USERNAME + '\AppData\Local\Android\Sdk\platform-tools'
   [Environment]::SetEnvironmentVariable('Path', $newPath, 'Machine')
   
   # OR for manual platform-tools download
   $path = [Environment]::GetEnvironmentVariable('Path', 'Machine')
   $newPath = $path + ';C:\platform-tools'
   [Environment]::SetEnvironmentVariable('Path', $newPath, 'Machine')
   ```
   Then restart your terminal.

4. **Connect phone via USB**

5. **Verify connection**:
   ```powershell
   adb devices
   ```
   
   If you see "adb is not recognized", restart your terminal after adding to PATH.

6. **Install the APK**:
   ```powershell
   adb install android\app\build\outputs\apk\debug\app-debug.apk
   ```

### Option 2: Android Emulator (Host Machine)

1. **Install Android Studio**: https://developer.android.com/studio
2. **Create an emulator** via AVD Manager
3. **Start the emulator**
4. Build APK in Docker:
   ```powershell
   docker-compose exec frontend bash -c "cd android && ./gradlew assembleDebug"
   ```
5. Install from Windows:
   ```powershell
   adb install android\app\build\outputs\apk\debug\app-debug.apk
   ```

---

## Common Issues on Windows

### Issue 1: "docker-compose not recognized"

**Solution**: Make sure Docker Desktop is running. Look for the Docker whale icon in your system tray.

### Issue 2: "WSL 2 installation is incomplete"

**Solution**: Docker Desktop will prompt you to install WSL 2. Follow the prompts or manually:
```powershell
# Run in PowerShell as Administrator
wsl --install
```
Then restart your computer.

### Issue 3: Port 8080 or 8081 already in use

**Solution**: Find and stop the process using the port:
```powershell
# Find process on port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

Or change the port in `docker-compose.yml`.

### Issue 4: "Cannot connect to Docker daemon"

**Solution**: 
1. Start Docker Desktop from the Start menu
2. Wait for Docker to fully start (whale icon will be steady, not animated)
3. Try your command again

### Issue 5: Volume mounting issues

**Solution**: Make sure your project is on a drive that Docker Desktop can access:
1. Open Docker Desktop
2. Settings → Resources → File Sharing
3. Add your drive (e.g., C:\ or D:\)

### Issue 6: Line ending issues (CRLF vs LF)

**Solution**: Configure Git to handle line endings:
```powershell
git config --global core.autocrlf input
cd FinTrackerApp
git rm --cached -r .
git reset --hard
```

### Issue 7: ADB not found / "adb is not recognized"

**Solution**:
1. Make sure you've installed ADB (see "Option 1: Physical Android Device" section above)
2. If installed via Chocolatey, close and reopen PowerShell
3. If installed via Android Studio, add to PATH (see instructions above)
4. Verify installation:
   ```powershell
   adb version
   ```

### Issue 8: Android SDK API 36 download issues in Docker

**Symptoms**: Frontend container fails to build with errors like:
- "Failed to install the following Android SDK packages"
- "Could not find or load main class com.android.sdklib.tool.sdkmanager.SdkManagerCli"
- "Package 'platforms;android-36' is not available"

**Solution A - Use API 35 (Stable Alternative)**:

If API 36 has issues, edit `Dockerfile.frontend` and change:
```dockerfile
# Change this line:
RUN ${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "ndk;27.1.12297006" \
    "system-images;android-36;google_apis;x86_64"

# To this:
RUN ${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-35" \
    "build-tools;35.0.0" \
    "ndk;27.1.12297006" \
    "system-images;android-35;google_apis;x86_64"
```

Also update `android/build.gradle`:
```gradle
ext {
    buildToolsVersion = "35.0.0"
    minSdkVersion = 24
    compileSdkVersion = 35  // Changed from 36
    targetSdkVersion = 35   // Changed from 36
    ndkVersion = "27.1.12297006"
    kotlinVersion = "2.1.20"
}
```

Then rebuild:
```powershell
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

**Solution B - Wait for Network/Retry**:

Sometimes it's just a network timeout:
```powershell
# Rebuild with better network
docker-compose build --no-cache frontend
```

**Solution C - Check Available Versions**:

Enter the container and check what's available:
```powershell
docker-compose run frontend bash
${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager --list
```

---

## Accessing Services

Once running:
- **Backend API**: http://localhost:8080/api/health
- **Metro Bundler**: http://localhost:8081
- **H2 Database Console**: http://localhost:8080/h2-console

---

## Building the APK

### Quick Build

```powershell
# Enter frontend container
docker-compose exec frontend /bin/bash

# Inside container, run:
cd android
./gradlew assembleDebug
exit
```

The APK will be at: `android\app\build\outputs\apk\debug\app-debug.apk`

### Installing on Your Device

```powershell
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Stopping Development

When you're done for the day:

```powershell
docker-compose down
```

This stops and removes the containers (but keeps your code and data).

---

## Clean Rebuild

If something goes wrong and you want to start fresh:

```powershell
# Stop and remove everything
docker-compose down -v --rmi all

# Rebuild from scratch
docker-compose build --no-cache

# Start again
docker-compose up -d
```

---

## File Paths on Windows

Remember that Windows uses backslashes (`\`) in file paths, but in Docker commands, you often need forward slashes (`/`).

**Examples**:
- Windows path: `C:\Users\YourName\FinTrackerApp`
- Docker path: `/c/Users/YourName/FinTrackerApp`

---

## Need Help?

### Check Container Logs

```powershell
# All logs
docker-compose logs -f

# Frontend only
docker-compose logs -f frontend

# Backend only
docker-compose logs -f backend
```

### Check Container Status

```powershell
docker-compose ps
```

### Restart a Specific Service

```powershell
docker-compose restart frontend
# or
docker-compose restart backend
```

---

## What Docker Manages for You

✅ **No need to install**:
- Java/JDK
- Android SDK
- Gradle
- Node.js
- Environment variables

✅ **Everything is containerized and version-controlled**

This means your Windows laptop will have the exact same environment as your teammate's Mac! 🎉

---

## Quick Reference Card

Print this for your desk:

```
┌─────────────────────────────────────────┐
│   FinTrackerApp Docker Quick Commands   │
├─────────────────────────────────────────┤
│ Start:     docker-compose up -d         │
│ Stop:      docker-compose down          │
│ Logs:      docker-compose logs -f       │
│ Status:    docker-compose ps            │
│ Frontend:  docker-compose exec frontend bash │
│ Backend:   docker-compose exec backend bash  │
│ Build APK: docker-compose exec frontend \    │
│            bash -c "cd android &&       │
│            ./gradlew assembleDebug"     │
└─────────────────────────────────────────┘
```
