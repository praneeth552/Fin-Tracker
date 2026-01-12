# Backend

A Spring Boot REST API for the FinTracker application.

## 🐳 Using Docker (Recommended)

The backend is automatically started when you run `make up` or `docker-compose up` from the root directory.

**API Endpoints**:
- Health Check: http://localhost:8080/api/health
- Version: http://localhost:8080/api/version
- H2 Console (dev): http://localhost:8080/h2-console

## 🛠 Manual Development (Without Docker)

### Prerequisites
- JDK 17 or higher
- Gradle 8.x (or use the wrapper)

### Running Locally

```bash
cd backend

# Using Gradle wrapper (recommended)
./gradlew bootRun

# Or if you have Gradle installed
gradle bootRun
```

### Building

```bash
# Build JAR file
./gradlew build

# Run the JAR
java -jar build/libs/fintracker-backend-0.0.1-SNAPSHOT.jar
```

### Testing

```bash
./gradlew test
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/fintrackerapp/
│   │   │   ├── FinTrackerApplication.java    # Main application
│   │   │   ├── controller/                   # REST controllers
│   │   │   ├── service/                       # Business logic
│   │   │   ├── repository/                    # Data access
│   │   │   └── model/                         # Entity models
│   │   └── resources/
│   │       └── application.properties         # Configuration
│   └── test/                                  # Test files
├── build.gradle                               # Dependencies
└── settings.gradle
```

## 🔧 Configuration

Edit `src/main/resources/application.properties` for:
- Database connection
- Server port
- Logging levels
- etc.

## 📝 Adding New Features

1. **Create Entity**: Add to `model/` package
2. **Create Repository**: Add interface extending `JpaRepository`
3. **Create Service**: Add business logic
4. **Create Controller**: Add REST endpoints

Example structure for a Transaction feature:

```java
// model/Transaction.java
@Entity
public class Transaction { ... }

// repository/TransactionRepository.java
public interface TransactionRepository extends JpaRepository<Transaction, Long> { ... }

// service/TransactionService.java
@Service
public class TransactionService { ... }

// controller/TransactionController.java
@RestController
@RequestMapping("/api/transactions")
public class TransactionController { ... }
```
