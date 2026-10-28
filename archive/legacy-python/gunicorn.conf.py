import multiprocessing

bind = "127.0.0.1:5000"
workers = 1
worker_class = "gevent"
worker_connections = 1000

timeout = 30
keepalive = 5

accesslog = "-"   # 输出到 stdout，systemd 会收
errorlog = "-"

graceful_timeout = 30
loglevel = "info"
