# Sentient Engine – Single-Server Deployment Guide

This guide describes how to set up and deploy the **Sentient Engine** full stack on a fresh Dell PowerEdge R710 server as a single-node, production-style deployment.

It covers:

- OS choice and reasoning
- Disk layout and RAID 10
- Initial server and network setup (with UDM Pro)
- Docker + Docker Compose installation
- Running PostgreSQL, Redis, Mosquitto MQTT, and Sentient services via Compose
- Secrets and environment management
- Manual deployment via deploy script
- Optional monitoring stack (Prometheus, Grafana, Loki)
- Security hardening and safe update procedures  

---

## 1. Operating System Choice

**Recommended OS:** **Ubuntu Server LTS** (22.04 or 24.04)

**Why Ubuntu LTS?**

- **Stability & Support**  
  - Long-Term Support (5+ years of security updates).
  - Very common in production; widely documented and supported.
  - Works smoothly with Dell PowerEdge hardware (R710).

- **Docker-Friendly**  
  - Official Docker packages and documentation target Ubuntu.
  - Simple installation and updates for Docker Engine and Docker Compose.

- **Performance & Features**  
  - Modern Linux kernel with good support for multi-core CPUs and large RAM.
  - EXT4 filesystem by default, which is solid and battle-tested.

**Summary:** Ubuntu Server LTS is a great balance of stability, performance, and ecosystem support. Perfect for a Docker-based Sentient Engine deployment on an R710.

---

## 2. Disk Layout and RAID 10

Your R710 has **8 identical drives** configured as **RAID 10** via the hardware RAID controller.

### 2.1 RAID 10 on the PERC Controller

- Use the R710’s PERC controller (e.g. PERC 6i/H700) BIOS to create:
  - One **RAID 10** virtual disk across all 8 drives.
- RAID 10 gives:
  - Excellent **read/write performance** (striping).
  - **Redundancy**: can tolerate multiple disk failures as long as they’re in different mirror pairs.
- Enable **write-back cache** with a healthy RAID battery for best performance.

The OS will see this as a single large disk (e.g. `/dev/sda`).

### 2.2 Partitioning Strategy

You can keep it **simple** but still safe:

**Option A: One Big Partition (simplest)**

- During Ubuntu install:
  - Create one large partition mounted at `/` (root).
  - Let the installer create swap automatically (or you can use a swap file later).
- Pros:
  - No risk of “/var is full but /home is empty” or similar.
  - Modern standard for servers with large disks.
- Cons:
  - Less granular control over where data lives.

**Option B: Root + Data Partition**

- Create:
  - `/` (root) – **50–100 GB**
  - `/srv` or `/opt` – **rest of the space** for containers, DBs, and logs
  - Swap – **4–16 GB** (with 96 GB RAM, you don’t need massive swap)
- Docker, Postgres, etc. can live under `/srv/sentient` or `/opt/sentient`.

**Recommendation:**  
If you’re not doing anything unusual: **One big EXT4 filesystem** (Option A) is fine, with plenty of space and good backups. If you want cleaner separation, use Option B and keep all app data under a dedicated mount (`/srv` or `/opt`).

---

## 3. Initial Server Configuration

After installing Ubuntu:

### 3.1 Create Admin User and Configure SSH

1. **Create a non-root user (e.g. `deploy`):**
   ```bash
   adduser deploy
   ```
2. **Grant sudo:**
   ```bash
   usermod -aG sudo deploy
   ```
3. **Set up SSH keys:**
   - On your Mac/PC: `ssh-keygen` (if you don’t already have keys).
   - Copy public key to server:
     ```bash
     mkdir -p /home/deploy/.ssh
     nano /home/deploy/.ssh/authorized_keys
     chmod 700 /home/deploy/.ssh
     chmod 600 /home/deploy/.ssh/authorized_keys
     chown -R deploy:deploy /home/deploy/.ssh
     ```
4. **Disable root SSH login (and ideally password login):**
   - Edit `/etc/ssh/sshd_config`:
     ```text
     PermitRootLogin no
     PasswordAuthentication no   # once you confirm key login works
     ```
   - Reload SSH:
     ```bash
     sudo systemctl restart ssh
     ```

5. **Test login:**
   - From your workstation:
     ```bash
     ssh deploy@your-server-ip
     ```

Now you do everything as `deploy` + `sudo`, not root.

---

### 3.2 Firewall (UFW)

1. **Install & enable UFW:**
   ```bash
   sudo apt update
   sudo apt install -y ufw
   sudo ufw allow OpenSSH
   sudo ufw enable
   sudo ufw status
   ```

2. **Allow needed ports (we’ll refine later):**
   - SSH (22) is already allowed by OpenSSH profile.
   - Example basics:
     ```bash
     # MQTT (LAN & controller VLAN)
     sudo ufw allow 1883/tcp

     # If using secure MQTT from outside, later:
     # sudo ufw allow 8883/tcp

     # HTTP / HTTPS for APIs or UI
     sudo ufw allow 80/tcp
     sudo ufw allow 443/tcp

     # Optional monitoring
     sudo ufw allow 3000/tcp  # Grafana
     sudo ufw allow 9090/tcp  # Prometheus
     ```
   - You will tighten these later by source IP/range, but this gets you going.

---

### 3.3 Networking with UDM Pro and VLANs

Your network is based on a **Ubiquiti Dream Machine Pro** with VLANs. The R710 has **4 Ethernet ports**. You can use them in two main ways:

#### Option A – One NIC per VLAN (Access Ports)

- Configure your switch ports:
  - e.g. Port 1 on Management VLAN (untagged).
  - Port 2 on Controllers VLAN (untagged).
- Plug:
  - `ens1` -> Management VLAN
  - `ens2` -> Controllers VLAN

- In Ubuntu (Netplan), something like:
  ```yaml
  network:
    version: 2
    ethernets:
      ens1:
        addresses: [192.168.1.10/24]
        gateway4: 192.168.1.1
        nameservers:
          addresses: [192.168.1.1]
      ens2:
        addresses: [192.168.30.10/24]
  ```
  - Only **one** interface (`ens1`) has a default gateway.
  - UDM Pro handles inter-VLAN routing and firewall.

#### Option B – VLAN Trunking on One NIC

- Trunk VLANs 10 and 30 on one switch port.
- On Ubuntu:
  ```yaml
  network:
    version: 2
    ethernets:
      ens1:
        dhcp4: false
    vlans:
      vlan10:
        id: 10
        link: ens1
        addresses: [192.168.10.10/24]
        gateway4: 192.168.10.1
        nameservers:
          addresses: [192.168.10.1]
      vlan30:
        id: 30
        link: ens1
        addresses: [192.168.30.10/24]
  ```
- UDM Pro routes between VLANs (if allowed by firewall).

**Key points:**

- Only one interface (or VLAN interface) should have the default route.
- Use UDM Pro **inter-VLAN firewall rules** to:
  - Allow controllers VLAN → server IP on MQTT port.
  - Allow management VLAN → server for SSH, UI, etc.
  - Block everything else you don’t need.

---

### 3.4 Basic Housekeeping

- Sync time:
  ```bash
  sudo timedatectl set-ntp true
  ```
- Update packages:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

Now we’re ready for Docker.

---

## 4. Install Docker and Docker Compose

### 4.1 Install Docker Engine (CE)

1. **Prereqs:**
   ```bash
   sudo apt update
   sudo apt install -y      ca-certificates      curl      gnupg      lsb-release      apt-transport-https      software-properties-common
   ```

2. **Add Docker’s GPG key & repo:**
   ```bash
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg

   echo    "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg]    https://download.docker.com/linux/ubuntu    $(lsb_release -cs) stable" |    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   sudo apt update
   ```

3. **Install Docker:**
   ```bash
   sudo apt install -y docker-ce docker-ce-cli containerd.io
   ```

4. **Enable & test Docker:**
   ```bash
   sudo systemctl enable docker
   sudo systemctl status docker
   sudo docker run --rm hello-world
   ```

5. **Add your user to the docker group:**
   ```bash
   sudo usermod -aG docker deploy
   # log out and back in for this to take effect
   ```

---

### 4.2 Install Docker Compose (v2 plugin)

On Ubuntu 22.04+:

```bash
sudo apt install -y docker-compose-plugin
docker compose version
```

You should now have `docker compose` available.

---

## 5. Docker Compose Stack: Postgres, Redis, Mosquitto, Sentient

Create a directory for the stack, e.g.:

```bash
sudo mkdir -p /opt/sentient
sudo chown deploy:deploy /opt/sentient
cd /opt/sentient
```

### 5.1 Create `docker-compose.yml`

```yaml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    container_name: sentient-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=sentient
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=sentientdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend

  redis:
    image: redis:7-alpine
    container_name: sentient-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redisdata:/data
    networks:
      - backend

  mqtt:
    image: eclipse-mosquitto:2.0
    container_name: sentient-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      # - "8883:8883"   # enable later for TLS
      # - "9001:9001"   # MQTT over WebSockets if needed
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
    networks:
      - backend

  app:
    image: ghcr.io/YOUR_GH_USER/sentient-engine:latest
    container_name: sentient-app
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      - db
      - redis
      - mqtt
    networks:
      - backend
      - frontend
    ports:
      - "8080:8080"  # Example API/UI port

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge

volumes:
  pgdata:
  redisdata:
```

Adjust the `image:` for `app` to your actual image name.

### 5.2 Mosquitto Config

Create directories:

```bash
mkdir -p mosquitto/config mosquitto/data mosquitto/log
```

Create `mosquitto/config/mosquitto.conf`:

```conf
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwd

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
```

Create a password file:

```bash
docker run --rm -it -v "$PWD/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2.0   mosquitto_passwd -c /mosquitto/config/passwd sentient_user
```

Enter a strong password when prompted. This user and password will be used by controllers and the Sentient Engine app to connect to MQTT.

### 5.3 App `.env` File

Create `/opt/sentient/.env` (DO NOT commit this file to Git):

```env
POSTGRES_PASSWORD=SuperSecretDBPass
DATABASE_URL=postgres://sentient:SuperSecretDBPass@db:5432/sentientdb
REDIS_URL=redis://redis:6379

MQTT_USER=sentient_user
MQTT_PASSWORD=YourMQTTpassHere

# Any other app-specific env vars:
# APP_ENV=production
# JWT_SECRET=some-long-random-string
```

Ensure this file is not world-readable:

```bash
chmod 600 .env
```

---

### 5.4 Start the Stack

From `/opt/sentient`:

```bash
docker compose up -d
```

Check status:

```bash
docker compose ps
```

Check logs:

```bash
docker compose logs app
docker compose logs db
docker compose logs mqtt
```

Quick tests:

- **Postgres:**
  ```bash
  docker exec -it sentient-db psql -U sentient sentientdb
  ```
- **Redis:**
  ```bash
  docker exec -it sentient-redis redis-cli ping
  # Expect: PONG
  ```
- **Mosquitto:**
  ```bash
  docker exec -it sentient-mosquitto sh -c     "mosquitto_sub -u sentient_user -P YourMQTTpassHere -t '$SYS/#' -v"
  ```
  If you see $SYS metrics, auth works.

At this point the core infrastructure is up.

---

## 6. Secrets & Environment Management

**Core rules:**

- Never commit real secrets to Git.
- Use `.env` on the server for app secrets.
- Keep `.env.example` in the repo to document required variables.

### 6.1 `.env` Management

- `.env` file lives on the server only.
- Keep a sanitized `.env.example` in the repo to document required variables.
- Ensure `.env` is in `.gitignore`.

### 6.2 File-Based Secrets (Certificates, Keys)

For TLS, JWT keys, etc.:

- Store them under `/opt/sentient/secrets` (or similar).
- Restrict permissions:
  ```bash
  sudo mkdir -p /opt/sentient/secrets
  sudo chown deploy:deploy /opt/sentient/secrets
  chmod 700 /opt/sentient/secrets
  ```
- Mount into containers via bind mounts in `docker-compose.yml`:
  ```yaml
  app:
    volumes:
      - /opt/sentient/secrets/jwt.key:/run/secrets/jwt.key:ro
  ```

---

## 7. Deployment Workflow

We use **GitHub for version control only** (push/pull between Mac and server). Deployment is done manually via a deploy script on the server.

### 7.1 Git Setup

**On your Mac (development):**
```bash
git remote add origin git@github.com:AaronLay10/Sentient.git
git push origin main
```

**On the server:**
```bash
cd /opt/sentient
git clone git@github.com:AaronLay10/Sentient.git .
# Or if already cloned:
git pull origin main
```

### 7.2 Deploy Script

Create `/opt/sentient/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "=== Sentient Engine Deployment ==="
echo "Started at: $(date)"

cd /opt/sentient

# Pull latest code from GitHub
echo "[1/5] Pulling latest code..."
git pull origin main

# Build shared packages
echo "[2/5] Installing dependencies and building packages..."
pnpm install --frozen-lockfile
pnpm --filter "@sentient/*" build

# Build Docker images locally
echo "[3/5] Building Docker images..."
docker compose -f docker-compose.prod.yml build

# Run database migrations
echo "[4/5] Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm api-service pnpm prisma:db:push

# Deploy services
echo "[5/5] Deploying services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Health check
echo "Waiting for services to start..."
sleep 10
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Deployment Complete ==="
echo "Finished at: $(date)"
```

Make it executable:
```bash
chmod +x /opt/sentient/deploy.sh
```

### 7.3 Deployment Process

**From your Mac:**
```bash
# Commit and push changes
git add .
git commit -m "Your changes"
git push origin main
```

**On the server:**
```bash
cd /opt/sentient
./deploy.sh
```

### 7.4 Quick Deploy Commands

For faster iteration, you can also run individual steps:

```bash
# Just pull and restart (no rebuild)
git pull origin main && docker compose -f docker-compose.prod.yml up -d

# Rebuild a single service
docker compose -f docker-compose.prod.yml build api-service
docker compose -f docker-compose.prod.yml up -d api-service

# View logs
docker compose -f docker-compose.prod.yml logs -f api-service
```

---

## 8. Optional Monitoring Stack (Prometheus, Grafana, Loki)

For a system like Sentient, it’s nice to see:

- CPU, RAM, disk, network usage.
- Per-container metrics.
- Logs from all services in one place.

### 8.1 Minimal Metrics

Add **node-exporter** and **cAdvisor**, **Prometheus**, and **Grafana**:

Extend `docker-compose.yml` or create `monitoring-compose.yml`:

```yaml
services:
  nodeexporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    pid: host
    network_mode: host
    command: ["--path.rootfs=/host"]
    volumes:
      - /:/host:ro

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.47.0
    container_name: cadvisor
    restart: unless-stopped
    ports:
      - "8082:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - backend

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - backend

  grafana:
    image: grafana/grafana-oss:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - backend

networks:
  backend:
    external: true  # reuse the same backend network if defined in main compose

volumes:
  prometheus_data:
  grafana_data:
```

You’ll need a `prometheus.yml` pointing to nodeexporter and cadvisor:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["prometheus:9090"]

  - job_name: "node"
    static_configs:
      - targets: ["host.docker.internal:9100"]

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
```

Access Grafana at `http://server_ip:3000` and add Prometheus as a data source. Import popular dashboards (Node Exporter, Docker, etc.).

For logs, you can later add **Loki** and **Promtail** to aggregate container logs.

---

## 9. Security Hardening Summary

**On the server:**

- SSH:
  - Disable root login.
  - Use key-based auth only.
  - Consider changing SSH port.
  - Install `fail2ban`:
    ```bash
    sudo apt install -y fail2ban
    ```
- Firewall (UFW):
  - Allow only needed ports.
  - Restrict by source IP where possible:
    ```bash
    sudo ufw allow from 192.168.1.0/24 to any port 22
    sudo ufw allow from 192.168.30.0/24 to any port 1883
    ```

- Automatic security updates:
  ```bash
  sudo apt install -y unattended-upgrades
  sudo dpkg-reconfigure unattended-upgrades
  ```

- Docker:
  - No `--privileged` containers unless absolutely needed.
  - Keep images updated.
  - Use official images where possible.

**Network (UDM Pro):**

- Use VLAN isolation.
- Let controllers VLAN reach server on MQTT port only.
- Use VPN for remote access instead of exposing MQTT to the world if possible.
- If you must expose MQTT over the internet:
  - Use TLS (port 8883).
  - Use strong auth (username/password, or client certs).
  - Lock down by IP/range.

**Application:**

- Require auth for any API/GM UI.
- Use HTTPS via a reverse proxy with Let’s Encrypt (Caddy, Nginx + certbot, or Nginx-proxy with LE companion).

---

## 10. Safe Updates and Restarts

### 10.1 App Updates

- Push changes to GitHub from your Mac
- SSH to server and run `./deploy.sh`
- Downtime is minimal (app container restart). Make sure clients can handle reconnects.

### 10.2 Service Updates (DB, Redis, Mosquitto)

- To update Postgres/Redis/Mosquitto images:
  - Edit `docker-compose.yml` to new versions.
  - **Plan a maintenance window**.
  - On server:
    ```bash
    cd /opt/sentient
    docker compose pull
    # If it's DB, stop app first:
    docker compose stop app
    docker compose up -d db
    # Wait for DB healthy, then:
    docker compose up -d app
    ```
  - Always backup the database before major DB upgrades.

### 10.3 OS Updates and Reboots

- `unattended-upgrades` will install critical patches.
- For kernel updates, schedule a reboot:
  ```bash
  sudo reboot
  ```
- Docker and containers will auto-start if:
  - Docker service is enabled.
  - Containers use `restart: unless-stopped`.

Check after reboot:

```bash
docker compose ps
```

---

## 11. Backup Strategy (Quick Notes)

- **Database:**  
  Regular `pg_dump` (or physical backups) to off-server storage.
  ```bash
  pg_dump -h localhost -U sentient sentientdb > /backup/sentientdb_$(date +%F).sql
  ```
- **Configs & Compose:**  
  Keep your compose files and configs in Git (without secrets).
- **Secrets `.env` & keys:**  
  Store secure offline copies of `.env` and any keys (e.g., encrypted in a password manager or encrypted backup).

---

## 12. Summary

You now have a full recipe for:

- Installing **Ubuntu LTS** on a Dell R710 with **RAID 10**.
- Configuring users, SSH, firewall, and VLAN networking with a UDM Pro.
- Installing **Docker & Docker Compose**.
- Running **PostgreSQL, Redis, Mosquitto MQTT, and the Sentient Engine** via a single `docker compose up -d`.
- Managing secrets safely with `.env` files on the server.
- Deploying manually via `deploy.sh` script (git pull → build → deploy).
- Using GitHub for version control only (push/pull between Mac and server).
- Optionally adding **Prometheus + Grafana** (and later Loki) for metrics and logs.
- Hardening security and defining a safe update workflow.

From here, you can refine:

- Exact ports and TLS setup.
- How Scenes/Puzzles map into services.
- Advanced monitoring and alerting rules.

But with this in place, you've got a solid, production-style foundation for Sentient on that R710. 
