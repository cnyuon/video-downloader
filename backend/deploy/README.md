# GCP Emergency Redeploy (Second Account)

This backend is deployable as a single Docker container.  
Use the script below to move it quickly to another Google Cloud account/project.

## What This Script Does

`deploy_gce_container_vm.sh` will:

1. Enable required APIs (`compute`, `artifactregistry`, `cloudbuild`)
2. Build/push the backend image from `backend/`
3. Reserve a static external IP
4. Create/update firewall rules for ports `80`, `443`
5. Create or update an `e2-small` VM running your container via startup script
6. Run Caddy as TLS reverse proxy on `80/443`
7. Keep backend private on Docker network (no public `:8000`)

## Quick Start

From repo root:

```bash
cd backend
chmod +x deploy/deploy_gce_container_vm.sh
PROJECT_ID="your-second-gcp-project-id" \
REGION="us-central1" \
ZONE="us-central1-a" \
INSTANCE_NAME="video-downloader-api" \
API_DOMAIN="api.getmediatools.com" \
TLS_EMAIL="admin@getmediatools.com" \
ALLOWED_ORIGINS="https://getmediatools.com,https://www.getmediatools.com,http://localhost:4321,http://localhost:3000" \
./deploy/deploy_gce_container_vm.sh
```

## Common Variables

- `PROJECT_ID` (required): target GCP project in the other account
- `REGION` (default `us-central1`)
- `ZONE` (default `us-central1-a`)
- `INSTANCE_NAME` (default `video-downloader-api`)
- `MACHINE_TYPE` (default `e2-small`)
- `API_DOMAIN` (default `api.getmediatools.com`)
- `TLS_EMAIL` (default `admin@getmediatools.com`)
- `ALLOWED_ORIGINS` (default includes your main domain + localhost)
- `ARTIFACT_REPO` (default `video-downloader`)
- `IMAGE_TAG` (default timestamp)
- `CONTAINER_NAME` (default `video-downloader-api`)
- `CADDY_CONTAINER_NAME` (default `video-downloader-caddy`)
- `DOCKER_NETWORK` (default `video-downloader-net`)

## Frontend Cutover

Set frontend env var:

```bash
PUBLIC_API_URL="https://api.getmediatools.com"
```

Then rebuild/redeploy frontend.

### DNS Requirement

Point your API domain to the VM static IP:

```bash
api.getmediatools.com -> A -> <STATIC_IP>
```

TLS issuance happens on first request after DNS is pointed correctly.

For HTTPS validation:

```bash
curl -i https://api.getmediatools.com/api/health
```

## Notes

- Updates on an existing VM are applied by updating instance metadata and rebooting the VM, so expect brief downtime during redeploy.
- The script updates firewall to allow only `80/443` for this service tag.
- Backend port `8000` is private and no longer exposed publicly.
