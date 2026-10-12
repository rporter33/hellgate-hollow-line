# Deployment

The production build was launched locally with `npm run start:server`, and browser and WebSocket checks ran against it. Public Internet deployment is pending Node-host access. Localhost is not a shipped URL.

## Simplest deployment: one Node service

Import this repository into Render using `render.yaml`. It explicitly selects a **free preview**, one instance, Frankfurt, and manual deploys. No paid plan has been purchased. Build: `npm ci --include=dev && npm run build`. Start: `npm run start:server`. Health: `/health`. The provider assigns `PORT`; the service listens on `0.0.0.0`.

The server also serves `apps/client/dist`, so the resulting `https://<assigned-service>.onrender.com/` is both client and game origin; the browser derives matching WSS automatically. Same-origin clients are permitted. Set `ALLOWED_ORIGINS` for any additional static-client origin. Do not enable autoscaling: rooms and checkpoints use one process's memory.

A free service sleeps after inactivity and has a cold start. It is a preview and cannot promise immediate room creation after idle. A reliable always-on release requires choosing and approving the host's current paid plan, after the free-preview checks.

## Separate GitHub Pages client

After the Node service exists, verify `/health` and its WSS connection. Allow `https://rporter33.github.io` in backend configuration. Enable GitHub Pages with Actions as source. Dispatch `pages.yml` with the exact backend HTTPS origin. The workflow verifies matching protocol/content versions, runs rule and real-room tests, builds under `/hellgate-hollow-line/`, and deploys the client artifact. No hosting credential enters the browser.

The relative default Vite base also supports a direct index reload at a repository subpath. In-game screens do not use URL routes; invite codes use a query parameter.

## Release checks

Record the actual HTTPS client URL and WSS backend endpoint only after deployment succeeds. Repeat clean-page load, one-, two- and three-client full combat/loot/destruction/extraction, 60-second reconnect, and leader exit against that endpoint. The three-player release gate includes separate physical machines. Local proxy tests do not satisfy that remote-device gate.

## Update / rollback

Deploy a matching protocol/content server before publishing the client. `/health` reports both versions. Incompatible clients receive a refresh message. Rollback restores the same source commit for both halves. A server process restart ends unfinished in-memory runs; clients show recovery and then a session-ended message. Do not advertise durable characters or unfinished-run persistence.

## Current access state

GitHub CLI access to `rporter33` was verified. Render and Railway plugins were discovered but neither is connected in this task. The managed environment has no configured Node-host credentials. Sites hosting helpers are not installed or readable here; Sites static hosting would still require the separate Node backend. No temporary tunnel is counted as a release.
