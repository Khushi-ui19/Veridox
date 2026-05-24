# Stage 1: Build the application
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Install Node.js (required by frontend-maven-plugin)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get update && apt-get install -y nodejs

# Copy the project files
COPY . .

# Build the project (includes building the frontend and packaging it into the JAR)
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre
WORKDIR /app

# Install Tesseract OCR and its dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the built JAR from the build stage
COPY --from=build /app/target/Veridox-0.0.1-SNAPSHOT.jar app.jar

# Copy the tessdata folder (required for OCR)
COPY --from=build /app/tessdata ./tessdata

# Set environment variables
ENV SERVER_PORT=8081

# Expose the port the app runs on
EXPOSE 8081

# Run the JAR
ENTRYPOINT ["java", "-jar", "app.jar"]
