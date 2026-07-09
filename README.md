# TimeWeaver

Bank your tasks, then generate a schedule that fits the time you actually have.

- **Task Bank** (left): add a task name and a duration (15/30/45/60 min). Saved to `localStorage`.
- **Schedule Generator** (right): enter how many minutes you have available and a start time, then hit **Generate**. It picks whichever tasks from the Task Bank best fill that time (a 0/1 knapsack over task durations) and lays them out with a 5-minute break between each.

## Run locally (no build tools)

Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 9080
```

## Run via Docker (single image, matches the hackathon judging contract)

```bash
docker build --platform linux/amd64 -t hackathon-app:final .
docker run --rm -p 9080:9080 -p 8090:8090 hackathon-app:final
```

- Frontend: `http://localhost:9080`
- Backend health check (proxied through nginx): `http://localhost:9080/api/health`

There is no database — all task data lives in the browser's `localStorage`, so the backend only exists to satisfy the judging contract's `/api/health` check.
