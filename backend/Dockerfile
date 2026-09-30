# Multi-stage Dockerfile for TeachTool Spring Boot Backend
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace/app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN chmod +x ./mvnw
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
VOLUME /tmp
WORKDIR /app
COPY --from=build /workspace/app/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

# Cấu hình tường minh bộ nhớ JVM cho Render 512MB RAM:
# -Xms128m khởi đầu 128MB, -Xmx384m tối đa 384MB (75% RAM), chừa 128MB cho metaspace & OS
ENV JAVA_OPTS="-Xms128m -Xmx384m -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar /app/app.jar"]

