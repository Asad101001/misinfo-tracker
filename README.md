# 🕵️ Misinfo Tracker

A real-time misinformation velocity tracker that monitors Reddit and RSS news feeds,
measures how fast false claims spread, and uses AI to rate veracity against
fact-check databases.

## Architecture
- **Collector Service** — scrapes Reddit + RSS feeds on a schedule
- **Analyzer Service** — OpenAI-powered claim extraction and fact-checking
- **Backend API** — FastAPI serving data to the dashboard
- **Frontend** — React dashboard with D3.js infection map
- **Infrastructure** — Kubernetes (minikube) + Helm + GitLab CI/CD
- **Monitoring** — Prometheus + Grafana

## Tech Stack
`Python` `FastAPI` `React` `Docker` `Kubernetes` `Helm` `GitLab CI/CD`
`PostgreSQL` `Redis` `OpenAI API` `Prometheus` `Grafana`
