Vehicle Tracker Backend (ready-to-run)

How to use (development):
1. Install Docker and docker-compose
2. Copy .env.example to .env and edit values (especially DOMAIN and DEVICE_DEFAULT_API_KEY)
3. Build and start services:
   docker-compose up -d --build
4. Enter the app container to run DB migrations & seed:
   docker-compose exec app sh -c "npm run migrate && npm run seed"
5. Obtain TLS certs with certbot (manual step) and restart nginx
6. Point your device to: https://YOUR_DOMAIN/api/devices/update with header X-Device-Key: <device_key>

Device POST example (JSON):
{ "id":"veh1", "lat":28.6139, "lon":77.2090, "speed":45 }

Notes:
- This is a skeleton intended for deployment. Review security settings, CORS, JWT secret, and production logging before going live.
