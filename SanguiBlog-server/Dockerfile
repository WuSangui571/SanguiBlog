# SanguiBlog 后端 Dockerfile
# 多阶段构建：Maven 编译 -> Java 21 运行

FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn -B dependency:go-offline -DskipTests -q
COPY src/ src/
RUN mvn -B -DskipTests package -q

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S sangui && adduser -S sangui -G sangui
RUN mkdir -p /data/uploads && chown sangui:sangui /data/uploads
USER sangui:sangui
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=60s \
    CMD wget -qO- http://localhost:8080/api/site/meta || exit 1
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
