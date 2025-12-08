## Multi-stage build for SanguiBlog backend
# Stage 1: build with Maven (JDK 21)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests clean package && cp target/*.jar /app/app.jar

# Stage 2: slim runtime (JRE 21)
FROM eclipse-temurin:21-jre
WORKDIR /app

# Optional: install curl for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Runtime envs (override in deployment)
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:MaxRAMPercentage=75" \
    SERVER_PORT=8080 \
    STORAGE_BASE_PATH=/data/uploads

COPY --from=build /app/app.jar ./app.jar

VOLUME ["/data/uploads"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD curl -f http://localhost:${SERVER_PORT}/api/site/meta || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
