# docker-k6-grafana-influxdb
Demonstrates how to run load tests with containerised instances of K6, Grafana and InfluxDB.

For web dashboard use 

```K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=html-report.html k6 run <name.js>```

#### Article
This is the accompanying source code for the following article. Please read for a detailed breakdown of the code and how K6, Grafana and InfluxDB work together using Docker Compose:

https://medium.com/swlh/beautiful-load-testing-with-k6-and-docker-compose-4454edb3a2e3

Commands:
```
docker-compose up -d influxdb grafana
docker-compose run k6 run /scripts/ewoks.js
OR 
k6 run --env TARGET_VUS=100 ./scripts/gorest-in.js --out influxdb=http://127.0.0.1:8086/k6
```
docker run -it --rm --name test -v ${pwd}:/app -w /app loadimpact/k6:latest run --env TARGET_VUS=100 ./scripts/gorest-in.js --out influxdb=http://127.0.0.1:8086/k6

#### Dashboards
The dashboard in /dashboards is adapted from the excellent K6 / Grafana dashboard here:
https://grafana.com/grafana/dashboards/2587

There are only two small modifications:
* the data source is configured to use the docker created InfluxDB data source
* the time period is set to now-15m, which I feel is a better view for most tests

#### Scripts
The script here is an example of a low Virtual User (VU) load test of the excellent Star Wars API:
https://swapi.dev/

If you're tinkering with the script, it is just a friendly open source API, be gentle!
