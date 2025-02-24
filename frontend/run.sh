npm run build
sudo nginx -t
sudo systemctl reload nginx

#nohup serve -s dist -l 5173 > front.log 2>&1 &
