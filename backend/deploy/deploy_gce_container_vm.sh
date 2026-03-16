#!/usr/bin/env bash
set -euo pipefail

# Emergency deploy script for the FastAPI backend on a GCE e2-small VM.
# It builds a fresh container image, then creates or updates a VM that runs it
# via VM startup script + Docker.
# Security defaults:
# - Backend container is private (Docker network only, no public port binding).
# - Caddy handles TLS on ports 80/443 and proxies to backend.
# - GCP firewall is restricted to 80/443.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
ZONE="${ZONE:-us-central1-a}"
INSTANCE_NAME="${INSTANCE_NAME:-video-downloader-api}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-small}"
ARTIFACT_REPO="${ARTIFACT_REPO:-video-downloader}"
IMAGE_NAME="${IMAGE_NAME:-backend}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}"
STATIC_IP_NAME="${STATIC_IP_NAME:-${INSTANCE_NAME}-ip}"
FIREWALL_RULE="${FIREWALL_RULE:-${INSTANCE_NAME}-allow-http}"
NETWORK_TAG="${NETWORK_TAG:-${INSTANCE_NAME}}"
CONTAINER_NAME="${CONTAINER_NAME:-video-downloader-api}"
CADDY_CONTAINER_NAME="${CADDY_CONTAINER_NAME:-video-downloader-caddy}"
DOCKER_NETWORK="${DOCKER_NETWORK:-video-downloader-net}"
API_DOMAIN="${API_DOMAIN:-api.getmediatools.com}"
TLS_EMAIL="${TLS_EMAIL:-admin@getmediatools.com}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://getmediatools.com,http://localhost:4321,http://localhost:3000}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: PROJECT_ID is required."
  echo "Example:"
  echo "  PROJECT_ID=my-gcp-project ./deploy/deploy_gce_container_vm.sh"
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI is not installed."
  exit 1
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
ALLOWED_ORIGINS_B64="$(printf '%s' "${ALLOWED_ORIGINS}" | base64 | tr -d '\n')"

echo "==> Setting active project to ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Enabling required APIs"
gcloud services enable \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com

echo "==> Ensuring Artifact Registry repo exists (${ARTIFACT_REPO})"
if ! gcloud artifacts repositories describe "${ARTIFACT_REPO}" \
  --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${ARTIFACT_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Video downloader backend images"
fi

echo "==> Building and pushing image: ${IMAGE_URI}"
gcloud builds submit "${BACKEND_DIR}" --tag "${IMAGE_URI}"

echo "==> Ensuring static IP exists (${STATIC_IP_NAME})"
if ! gcloud compute addresses describe "${STATIC_IP_NAME}" \
  --region="${REGION}" >/dev/null 2>&1; then
  gcloud compute addresses create "${STATIC_IP_NAME}" --region="${REGION}"
fi
STATIC_IP="$(gcloud compute addresses describe "${STATIC_IP_NAME}" \
  --region="${REGION}" --format='value(address)')"

echo "==> Ensuring firewall rule exists (${FIREWALL_RULE})"
if ! gcloud compute firewall-rules describe "${FIREWALL_RULE}" >/dev/null 2>&1; then
  gcloud compute firewall-rules create "${FIREWALL_RULE}" \
    --allow=tcp:80,tcp:443 \
    --target-tags="${NETWORK_TAG}" \
    --description="Allow HTTP(S) and backend API traffic"
else
  gcloud compute firewall-rules update "${FIREWALL_RULE}" \
    --allow=tcp:80,tcp:443 >/dev/null
fi

STARTUP_SCRIPT="$(mktemp)"
trap 'rm -f "${STARTUP_SCRIPT}"' EXIT
cat > "${STARTUP_SCRIPT}" <<EOF
#!/usr/bin/env bash
set -euo pipefail

META="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
HEADER="Metadata-Flavor: Google"

IMAGE_URI="\$(curl -fsS -H "\${HEADER}" "\${META}/IMAGE_URI")"
ALLOWED_ORIGINS_B64="\$(curl -fsS -H "\${HEADER}" "\${META}/ALLOWED_ORIGINS_B64")"
ALLOWED_ORIGINS="\$(printf '%s' "\${ALLOWED_ORIGINS_B64}" | base64 -d)"
REGION="\$(curl -fsS -H "\${HEADER}" "\${META}/REGION")"
CONTAINER_NAME="\$(curl -fsS -H "\${HEADER}" "\${META}/CONTAINER_NAME")"
CADDY_CONTAINER_NAME="\$(curl -fsS -H "\${HEADER}" "\${META}/CADDY_CONTAINER_NAME")"
DOCKER_NETWORK="\$(curl -fsS -H "\${HEADER}" "\${META}/DOCKER_NETWORK")"
API_DOMAIN="\$(curl -fsS -H "\${HEADER}" "\${META}/API_DOMAIN")"
TLS_EMAIL="\$(curl -fsS -H "\${HEADER}" "\${META}/TLS_EMAIL")"
BACKEND_IMAGE="caddy:2.9-alpine"

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y docker.io curl python3
fi
systemctl enable docker
systemctl start docker

TOKEN="\$(curl -fsS -H "\${HEADER}" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"
echo "\${TOKEN}" | docker login -u oauth2accesstoken --password-stdin "https://\${REGION}-docker.pkg.dev"

docker network create "\${DOCKER_NETWORK}" >/dev/null 2>&1 || true

docker pull "\${IMAGE_URI}"
docker pull "\${BACKEND_IMAGE}"

docker rm -f "\${CONTAINER_NAME}" || true
docker run -d \
  --name "\${CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "\${DOCKER_NETWORK}" \
  -e ALLOWED_ORIGINS="\${ALLOWED_ORIGINS}" \
  "\${IMAGE_URI}"

mkdir -p /opt/video-downloader/caddy

cat > /opt/video-downloader/caddy/Caddyfile <<CADDY
{
  email \${TLS_EMAIL}
  admin off
}

\${API_DOMAIN} {
  encode zstd gzip
  reverse_proxy \${CONTAINER_NAME}:8000
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
  }
}
CADDY

docker rm -f "\${CADDY_CONTAINER_NAME}" || true
docker run -d \
  --name "\${CADDY_CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "\${DOCKER_NETWORK}" \
  -p 80:80 \
  -p 443:443 \
  -v /opt/video-downloader/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v /opt/video-downloader/caddy/data:/data \
  -v /opt/video-downloader/caddy/config:/config \
  "\${BACKEND_IMAGE}"
EOF

if gcloud compute instances describe "${INSTANCE_NAME}" --zone="${ZONE}" >/dev/null 2>&1; then
  echo "==> Instance exists, updating metadata and rebooting to apply image"
  gcloud compute instances add-metadata "${INSTANCE_NAME}" \
    --zone="${ZONE}" \
    --metadata="IMAGE_URI=${IMAGE_URI},ALLOWED_ORIGINS_B64=${ALLOWED_ORIGINS_B64},REGION=${REGION},CONTAINER_NAME=${CONTAINER_NAME},CADDY_CONTAINER_NAME=${CADDY_CONTAINER_NAME},DOCKER_NETWORK=${DOCKER_NETWORK},API_DOMAIN=${API_DOMAIN},TLS_EMAIL=${TLS_EMAIL}" \
    --metadata-from-file="startup-script=${STARTUP_SCRIPT}"
  gcloud compute instances reset "${INSTANCE_NAME}" --zone="${ZONE}"
else
  echo "==> Creating new e2-small instance: ${INSTANCE_NAME}"
  gcloud compute instances create "${INSTANCE_NAME}" \
    --zone="${ZONE}" \
    --machine-type="${MACHINE_TYPE}" \
    --boot-disk-size=20GB \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --address="${STATIC_IP}" \
    --tags="${NETWORK_TAG}" \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --metadata="IMAGE_URI=${IMAGE_URI},ALLOWED_ORIGINS_B64=${ALLOWED_ORIGINS_B64},REGION=${REGION},CONTAINER_NAME=${CONTAINER_NAME},CADDY_CONTAINER_NAME=${CADDY_CONTAINER_NAME},DOCKER_NETWORK=${DOCKER_NETWORK},API_DOMAIN=${API_DOMAIN},TLS_EMAIL=${TLS_EMAIL}" \
    --metadata-from-file="startup-script=${STARTUP_SCRIPT}"
fi

echo "==> Waiting for backend process on VM"
for _ in $(seq 1 24); do
  if gcloud compute ssh "${INSTANCE_NAME}" \
    --zone="${ZONE}" \
    --quiet \
    --ssh-flag="-o StrictHostKeyChecking=no" \
    --command="curl -fsS http://127.0.0.1:8000/api/health >/dev/null" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

echo
echo "Deploy complete."
echo "Static IP: ${STATIC_IP}"
echo "Configured API domain: https://${API_DOMAIN}"
echo "Remember to point your DNS A record for ${API_DOMAIN} to ${STATIC_IP}."
echo "Set frontend PUBLIC_API_URL to https://${API_DOMAIN}"
