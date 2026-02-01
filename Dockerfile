# --- Stage 1: Build React Frontend ---
FROM node:20 AS frontend-builder
WORKDIR /app/client

# Copy frontend dependency files
COPY client/package.json client/package-lock.json ./
RUN npm install

# Copy frontend source code and build
COPY client/ ./
RUN npm run build


# --- Stage 2: Build Spring Boot Backend ---
FROM maven:3.8.5-openjdk-17 AS backend-builder
WORKDIR /app

# Copy pom.xml and install dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy backend source code
COPY src ./src

# Copy React build to Spring Boot static resources
COPY --from=frontend-builder /app/client/dist ./src/main/resources/static

# Build the JAR file
RUN mvn clean package -DskipTests


# --- Stage 3: Run the Application ---
# FIX 1: Use a standard Debian-based image (Jammy) instead of Alpine.
# This ensures better compatibility with the Tesseract native libraries.
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app

# FIX 2: Install the native Tesseract OCR engine
RUN apt-get update && \
    apt-get install -y tesseract-ocr && \
    apt-get clean

# Copy the JAR from the build stage
COPY --from=backend-builder /app/target/*.jar app.jar

# FIX 3: Copy the 'tessdata' folder so the Java code can find the models
COPY tessdata ./tessdata

EXPOSE 8080

ENTRYPOINT ["java", "-Xmx400m", "-jar", "app.jar"]