# NodeJs + React + SSE



## Features

- SSE
- use eventSource vs fetch
- use docker run redis

## Install

```bash
yarn install
```


## Usage

step1. run node server

```bash
cd server
yarn dev
```

(Optional) If you need to simulate a second server
```bash
PORT=8082 yarn dev
```

step2. run client

```bash
cd client && yarn dev
```

Test in client

- for Fetch use 8081 port api:
  - http://localhost:1182/fetch/imagine
  - http://localhost:1182/fetch/wendy
- for EventSource use 8082 port api:
  - http://localhost:1182/event/ann
  - http://localhost:1182/event/gary
