# Sentient Engine – Mac Studio Development Environment Setup Guide

This guide sets up your **Mac Studio** as the ultimate development environment for Sentient Engine. It covers tools, configuration, Docker, VSCode, and workflow best practices.

---

# 1. Install Homebrew

Homebrew is required before installing anything else.

In Terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Add Homebrew to PATH:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Verify:

```bash
brew doctor
```

---

# 2. Install Core Tools

Install everything needed for full-stack, multi-service development:

```bash
brew install git gh node pnpm docker docker-compose mkcert nss
```

Then install Docker Desktop:

```bash
brew install --cask docker
```

Start Docker Desktop from Applications.

### Recommended Docker Desktop Settings:

- Enable **VirtioFS** (faster file sharing)
- CPUs: **8+**
- Memory: **8–16 GB**
- Enable **Rosetta** (for x86 compatibility)

---

# 3. Install VS Code

```bash
brew install --cask visual-studio-code
```

Open VS Code, then install these extensions:

- Docker
- Prettier
- ESLint
- TypeScript Next
- Remote Containers
- indent-rainbow

---

# 4. Clone Your Repository

```bash
mkdir -p ~/Projects
cd ~/Projects
gh repo clone YOUR_USERNAME/snere
cd snere
```

---

# 5. Create `.env` File

```bash
cp .env.example .env
code .env
```

Sample development values:

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=localdev
POSTGRES_DB=sentient_dev

REDIS_URL=redis://redis:6379
MQTT_USERNAME=devuser
MQTT_PASSWORD=devpass

NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002

JWT_SECRET=devsecret123
```

---

# 6. Create Docker Compose Stack

Your repo root should contain:

```
docker-compose.yml
.env
```

Start infrastructure:

```bash
docker compose up -d
```

Check services:

```bash
docker ps
```

---

# 7. Test Infrastructure

### PostgreSQL

```bash
docker exec -it sentient_postgres psql -U postgres
```

Exit: `\q`

### Redis

```bash
docker exec -it sentient_redis redis-cli ping
# Expect: PONG
```

### MQTT

Terminal 1:

```bash
docker exec -it sentient_mqtt mosquitto_sub -t '#' -v
```

Terminal 2:

```bash
docker exec -it sentient_mqtt mosquitto_pub -t 'test/topic' -m 'hello'
```

---

# 8. Open Project in VS Code

```bash
code ~/Projects/snere
```

Your Mac Studio now runs a full **Sentient Engine local cluster**.

---

# 9. Optional Tools

### mkcert (Local HTTPS)

```bash
mkcert -install
mkcert localhost
```

### ngrok (Public Dev URL)

```bash
brew install ngrok
ngrok http 3000
```

### TablePlus (DB GUI)

```bash
brew install --cask tableplus
```

---

# 10. Workflow Summary

- Edit code → auto-reloads inside containers  
- Use VS Code debugger + Docker extension  
- Use Git + GitHub for CI/CD deployments  
- Rely on Docker Compose for full local cluster  

Your Mac Studio is now a *production-grade development machine* for Sentient Engine.

Enjoy. 🚀
