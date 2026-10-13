# Live Demo Deployment — IBM Cloud Code Engine

Deploys the modernized Express Gateway in this repository as a public HTTPS
demo application on IBM Cloud Code Engine (region: us-south / Dallas), so the
submission has a live URL that stays up through the judging period
(winners announced 2026-10-28).

## Why `Dockerfile.demo` and not `Dockerfile`

The root `Dockerfile` is the upstream distribution image: it runs
`yarn global add express-gateway@$EG_VERSION`, i.e. it installs the
*published npm package*, not the code in this repo. `Dockerfile.demo`
installs this repo's production dependencies and runs its `lib/` source on
Node 22. Redis needs no external service: the project's built-in Redis
emulation is on by default (`EG_DB_EMULATE` defaults to `true`, and
`ioredis-mock` is a production dependency).

## Console steps (about 10 minutes)

1. Go to [cloud.ibm.com](https://cloud.ibm.com) → navigation menu →
   **Code Engine** → **Projects** → **Create**.
   - Name: `bob-modernization-factory`
   - Region: **Dallas (us-south)**
   - Resource group: **Default** → **Create**.
2. In the project: **Applications** → **Create**.
   - Choose **Start from source code**.
   - Source URL: `https://github.com/Mike-Demo/express-gateway`
   - Branch: `master`
   - Build strategy: **Dockerfile**; Dockerfile path: `Dockerfile.demo`;
     build context: `/`
3. Application settings:
   - Compute: **1 vCPU / 2 GiB**
   - Listening port: **8080**
   - Environment variables:
     - `NODE_ENV` = `production`
     - `EG_CONFIG_DIR` = `/app/lib/config`
     - `EG_DISABLE_CONFIG_WATCH` = `true`
     - `EG_HTTP_PORT` = `8080`
   - Scaling: minimum instances **0**, maximum **2**
4. **Create** and wait for the build and deployment to finish (a few
   minutes). Copy the application URL
   (`https://<app>.<id>.us-south.codeengine.appdomain.cloud`).

## Verify

Open the application URL. A `404` JSON response from the gateway on `/` is
the expected proof of life — the gateway is running with the repository's
sample configuration, which defines no pipeline for `/`. Any HTTP response
served by Express Gateway confirms the modernized code is live on Node 22.
If you instead get a Code Engine error page, open the application's
**Logs** tab in the project and check for a startup error.

## Use and lifetime

- Paste the application URL into the hackathon portal's live-demo field.
- Leave the application running until after the winners announcement
  (2026-10-28). Minimum scale 0 means it idles at effectively no cost on
  the account's credits.
- After 2026-10-28, delete the application and the Code Engine project.
  This is separate from the development VSI teardown.

## CLI alternative

```bash
ibmcloud login --sso
ibmcloud ce project create --name bob-modernization-factory
ibmcloud ce project select --name bob-modernization-factory
ibmcloud ce app create --name express-gateway \
  --build-source https://github.com/Mike-Demo/express-gateway \
  --build-branch master \
  --build-dockerfile Dockerfile.demo \
  --cpu 1 --memory 2G --port 8080 \
  --min-scale 0 --max-scale 2 \
  --env NODE_ENV=production \
  --env EG_CONFIG_DIR=/app/lib/config \
  --env EG_DISABLE_CONFIG_WATCH=true \
  --env EG_HTTP_PORT=8080
ibmcloud ce app get --name express-gateway   # prints the public URL
```
