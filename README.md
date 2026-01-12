# FinTracker App

A React Native mobile app for tracking finances with a Spring Boot backend.

## 🐳 Quick Start with Docker (Recommended)

**No version conflicts! Docker handles everything.**

### Prerequisites

-   **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop)
-   **Git**: For cloning the repository
-   **Physical Android device** OR **Android emulator on your host machine** (Docker can't run emulators)

### Setup in 3 Steps

1. **Clone and navigate to the project**:
```bash
git clone <YOUR_REPO_URL>
cd FinTrackerApp
```

2. **Start everything with one command**:
```bash
make up
# OR if you don't have make installed:
docker-compose up -d
```

3. **View logs to confirm everything is running**:
```bash
make logs
# OR:
docker-compose logs -f
```

That's it! 🎉

-   **Frontend (Metro)**: http://localhost:8081
-   **Backend API**: http://localhost:8080

### Common Docker Commands

```bash
make help              # Show all available commands
make up                # Start all services
make down              # Stop all services
make logs              # View logs from all services
make shell-frontend    # Open terminal in frontend container
make shell-backend     # Open terminal in backend container
make build-apk         # Build Android debug APK
make status            # Show container status
```

### Connecting Your Android Device

**Option 1: Physical Device**

1. Enable USB debugging on your device
2. Connect via USB
3. Run on your host machine (NOT in Docker):
```bash
adb devices
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Option 2: Emulator on Host**

1. Run Android emulator on your host machine
2. Build APK in Docker: `make build-apk`
3. Install from host: `adb install android/app/build/outputs/apk/debug/app-debug.apk`

### What Docker Manages for You

✅ **Java/JDK 17** (No need to install)<br>
✅ **Android SDK API 36 + Build Tools 36.0.0** (Automatically configured)<br>
✅ **Node.js 20** (Exact version from package.json)<br>
✅ **Gradle** (React Native's wrapper)<br>
✅ **All environment variables** (ANDROID_HOME, JAVA_HOME, etc.)<br>
✅ **Spring Boot backend** (Port 8080)<br>

### Troubleshooting Docker Setup

**Metro bundler not accessible?**
```bash
# Restart frontend service
docker-compose restart frontend
```

**Backend not responding?**
```bash
# Check backend health
docker-compose exec backend curl http://localhost:8080/actuator/health
```

**Need to rebuild after dependency changes?**
```bash
make build
# OR:
docker-compose build --no-cache
```

**Want to start fresh?**
```bash
make clean-docker  # Removes all containers and images
make up            # Start again
```

---

## 🛠 Alternative: Manual Setup (Without Docker)

### 1. Prerequisites

Ensure you have the following installed on your machine:

-   **Node.js**: (Version 18+ recommended)
-   **Watchman**: `brew install watchman` (macOS)
-   **JDK**: Java Development Kit 17 (recommended for React Native 0.73+)
-   **Android Studio**: With Android SDK and Emulator configured.
-   **Xcode** (macOS only): For running on iOS Simulator.

### 2. Clone and Install

```bash
# Clone the repository
git clone <YOUR_REPO_URL>
cd FinTrackerApp

# Install JavaScript dependencies
npm install
# or if you use yarn:
yarn install
```

### 3. iOS Setup (Mac Only)

If you are on a Mac and want to run the iOS version:

```bash
cd ios
pod install
cd ..
```

### 4. Running the App

Start the Metro Bundler (keep this running in a separate terminal):

```bash
npm start
```

Run on **Android**:

```bash
npm run android
```

Run on **iOS** (Mac only):

```bash
npm run ios
```

### 5. Backend Configuration

The app connects to the API properly defined in `src/context/AppContext.tsx` or similar configuration files.
If you are running a local backend (e.g., Spring Boot on `localhost:8080`):
-   **Android Emulator**: Use `http://10.0.2.2:8080` to access the host machine's localhost.
-   **iOS Simulator**: Use `http://localhost:8080`.

Update the `BASE_URL` in the code if necessary to point to your local backend instance.

## 🛠 Troubleshooting

-   **Icons not showing?** Run a full rebuild: `cd android && ./gradlew clean` then run android again.
-   **Metro connection issues?** Close the Metro terminal and restart it with `npm start -- --reset-cache`.
