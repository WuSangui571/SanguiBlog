## Stage 1: Build with Maven (JDK 21)
FROM ghcr.io/library/maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn -q -DskipTests clean package && \
    cp target/*.jar /app/app.jar


## Stage 2: Runtime (JRE 21)
FROM ghcr.io/adoptium/temurin:21-jre

WORKDIR /app

# Optional tooling (curl for healthcheck)
RUN microdnf install -y curl && microdnf clean all

# Correct env names for your Spring Boot app
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:MaxRAMPercentage=75" \
    SERVER_PORT=8080 \
    STORAGE_BASE_PATH=/uploads

COPY --from=build /app/app.jar ./app.jar

VOLUME ["/uploads"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:${SERVER_PORT}/api/site/meta || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
