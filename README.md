# High-Throughput Real-Time Data Processing Service

A Node.js/Express.js service for ingesting, processing, and broadcasting data in real-time using Bull, Redis, MongoDB, and Socket.io.
Supports batch ingestion (1000+ points/sec), aggregates statistics, stores historical data, and provides real-time updates to connected clients.

---

## Tech Stack

Node.js / Express.js – HTTP API

MongoDB – Data persistence (aggregates & historical records)

Bull – Background job queue

Redis – Bull backend + pub/sub

---

## Features

- Batch or stream data ingestion (/api/data/ingest)

- Centralized aggregate statistics (count, sum, avg)

- Historical data storage for auditing (/api/data/history)

- Real-time updates via WebSocket (/ws)

- Room-based subscriptions for selective updates

- High-throughput capable (1000+ points/sec)

---

## Architecture

```plaintext
Client (Browser/API)
        |
        v
   Express API
  POST /api/data/ingest
        |
        v
     Redis Queue (Bull)
        |
        v
   Worker Process
  - Validate & transform data
  - Update Aggregate
  - Store ProcessedRecord
  - Publish to Redis pub/sub
         |
        v
  Express + Socket.io
  Broadcast to subscribed clients
        |
        v
      Browser
```

### Key points:

- API vs Worker separation prevents back-pressure

- Redis + Bull ensures high-throughput job handling

- MongoDB aggregates & history enable persistence and stats retrieval

---

## Setup/Installation

### 1. Clone the repo

### 2.Install dependencies

```bash
    npm install
```

### 3.Create .env file

### 4. Start mongodb and Redis(local or Docker)

```bash
    docker compose up -d
```

### 5. Start the server

```bash
    npm run dev
```

### 6. Start the worker in a separate terminal

```bash
    npm run dev:worker
```

---

## End points

A postman collection has been included inside the project.You can

- Batch ingestion of data points
- Fetch current aggregate statistics for a key
- Fetch processed historical records

---

### Testing High-Throughput

- Sends 1000+ data points in a single request to simulate load
- Worker processes asynchronously,aggregates updated in real-time

  ```bash
  node load-test.js
  ```

---

### Real-time Websocket

- Open /test-socket.html in your browser to monitor completed jobs from the queue.

- Every time the /api/data/ingest endpoint is called, updates for processed tasks will appear in real-time on this page.

---

### Folder Structure

```plaintext
src/
├─ config/
│  └─ envLoader.js
├─ lib/
│  ├─ db.js
│  └─ queue.js
├─ models/
│  ├─ Aggregate.js
│  ├─ DataPoint.js
│  └─ ProcessedRecord.js
├─ routes/
│  └─ ingest.js
├─ worker.js
└─ server.js

```
