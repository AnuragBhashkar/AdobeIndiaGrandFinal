
FROM python:3.10-slim

WORKDIR /app


RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    redis-server \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*


COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm install

COPY Frontend/ .

ARG ADOBE_EMBED_API_KEY
ENV REACT_APP_ADOBE_CLIENT_ID=${ADOBE_EMBED_API_KEY}
RUN npm run build

COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY Backend/ .

RUN mv build static

RUN mkdir -p /data
VOLUME /data
VOLUME /app/session_files

COPY Backend/start.sh .
RUN chmod +x ./start.sh

EXPOSE 8080

CMD ["./start.sh"]