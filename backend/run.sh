#!/bin/bash
pkill -f "node app.js"
nohup npm run start > back.log 2>&1 &
