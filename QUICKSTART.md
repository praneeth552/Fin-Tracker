# 🚀 FinTracker Quick Start Guide

> **Windows Users**: See [WINDOWS-SETUP.md](WINDOWS-SETUP.md) for Windows-specific instructions!

## For Your Team Members

### One-Time Setup

1. **Install Docker Desktop**
   - **Mac**: https://docs.docker.com/desktop/install/mac-install/
   - **Windows**: https://docs.docker.com/desktop/install/windows-install/ (see [WINDOWS-SETUP.md](WINDOWS-SETUP.md) for detailed Windows guide)
   - **Linux**: https://docs.docker.com/desktop/install/linux-install/

2. **Clone the repository** (or if already cloned, update it)
   ```bash
   # If you don't have it yet:
   git clone <YOUR_REPO_URL>
   cd FinTrackerApp
   
   # If you already have it, just update:
   cd FinTrackerApp
   git pull origin main
   ```

3. **Start everything**
   ```bash
   make up
   ```
   
   Don't have `make`? No problem:
   ```bash
   docker-compose up -d
   ```

### Development Workflow

**Starting your work day:**
```bash
make up
make logs  # View logs to confirm everything is running
```

**Building an APK:**
```bash
make build-apk
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

**Accessing containers:**
```bash
make shell-frontend  # Work on React Native
make shell-backend   # Work on Spring Boot
```

**Viewing logs:**
```bash
make logs              # All services
make logs-frontend     # Frontend only
make logs-backend      # Backend only
```

**Stopping for the day:**
```bash
make down
```

### Testing the Backend API

Once everything is running:

```bash
# Test health endpoint
curl http://localhost:8080/api/health

# Expected response:
# {"status":"UP","message":"FinTracker Backend is running!"}
```

### Connecting Your Phone

1. Build the APK: `make build-apk`
2. Enable USB debugging on your Android phone
3. Connect phone to computer via USB
4. Install the app:
   ```bash
   adb devices  # Confirm device is connected
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Common Issues

**"Docker is not running"**
- Start Docker Desktop application

**"Port 8080 already in use"**
- Stop any local Java/Spring Boot processes
- Or change the port in `docker-compose.yml`

**"Build failed"**
- Try rebuilding: `make build`
- Or clean rebuild: `make clean-docker && make up`

**"Can't connect to backend from app"**
- For Android emulator on host: Use `http://10.0.2.2:8080`
- For physical device: Use your computer's IP (e.g., `http://192.168.1.100:8080`)

### What Each Team Member Needs

**Frontend Developers:**
```bash
make up                 # Start services
make shell-frontend     # Enter frontend container
cd src/                 # Work on React Native code
```

**Backend Developers:**
```bash
make up                 # Start services
make shell-backend      # Enter backend container
cd src/                 # Work on Spring Boot code
```

**No need to worry about:**
- ❌ Java versions
- ❌ Gradle versions
- ❌ Android SDK installation
- ❌ Node.js versions
- ❌ Path configurations

Docker handles all of this automatically! 🎉

### Available Commands

Run `make help` to see all commands:

```
make help              # Show all available commands
make up                # Start all services
make down              # Stop all services
make logs              # View logs from all services
make shell-frontend    # Open terminal in frontend container
make shell-backend     # Open terminal in backend container
make build-apk         # Build Android debug APK
make status            # Show container status
make clean             # Clean build artifacts
make build             # Rebuild Docker images
```

### File Structure

```
FinTrackerApp/
├── android/              # React Native Android code
├── ios/                  # React Native iOS code
├── src/                  # React Native frontend source
├── backend/              # Spring Boot backend
│   ├── src/main/java/    # Java source code
│   └── src/main/resources/ # Config files
├── Dockerfile.frontend   # Frontend container config
├── Dockerfile.backend    # Backend container config
├── docker-compose.yml    # Orchestrates both services
└── Makefile             # Simple commands
```

### Questions?

Check the main [README.md](README.md) for detailed documentation.
