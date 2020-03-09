#!/usr/bin/env bash
set -e
COMPOSE_PROJECT_NAME=local docker-compose down
COMPOSE_PROJECT_NAME=local docker-compose up -d
