import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def _load_dotenv() -> None:
    """Minimal .env loader (KEY=VALUE lines, # comments, no quoting support needed)."""
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

_load_dotenv()


def env(key: str, default: str = "") -> str:
    """Read an environment variable, falling back to the .env file and `default`."""
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    value = env(key, "").strip().lower()
    if value == "":
        return default
    return value in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    value = env(key, default)
    return [item.strip() for item in value.split(",") if item.strip()]
