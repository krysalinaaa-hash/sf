"""Локальный запуск сайта «Старый фермер».

Запускается из PyCharm кнопкой Run или из терминала командой:
python run_server.py
"""

from __future__ import annotations

import os
import socket
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
START_PORT = 8000


def find_free_port(start_port: int = START_PORT, host: str = HOST) -> int:
    """Находит свободный порт, начиная с 8000."""
    for port in range(start_port, start_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sock.connect_ex((host, port)) != 0:
                return port
    raise RuntimeError("Не удалось найти свободный порт для локального сервера.")


def main() -> None:
    project_dir = Path(__file__).resolve().parent
    os.chdir(project_dir)

    port = find_free_port()
    server = ThreadingHTTPServer((HOST, port), SimpleHTTPRequestHandler)
    url = f"http://{HOST}:{port}/"

    print("Сайт «Старый фермер» запущен")
    print(f"Откройте в браузере: {url}")
    print("Для остановки сервера нажмите Ctrl+C")

    try:
        webbrowser.open(url)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер остановлен.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
