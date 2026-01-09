# FinTracker App

This is the React Native frontend for the FinTracker application.

## 🚀 Getting Started for Contributors

If you are a backend developer or new contributor, follow these steps to get the app running locally.

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
