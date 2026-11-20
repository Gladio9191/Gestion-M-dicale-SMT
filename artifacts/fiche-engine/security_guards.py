"""Pure, testable safety checks for the local fiche-engine service.

The medical API is intended to be called through the local Express proxy.
These checks are defense in depth, NOT user authentication for Express.
"""
import ipaddress
import os


def is_loopback_peer(remote_addr):
    if not isinstance(remote_addr, str) or not remote_addr:
        return False
    try:
        ip = ipaddress.ip_address(remote_addr)
        return ip.is_loopback or bool(ip.ipv4_mapped and ip.ipv4_mapped.is_loopback) if ip.version == 6 else ip.is_loopback
    except ValueError:
        return False


def allowed_web_origins():
    """Never implicitly allow arbitrary third-party websites."""
    return [v.strip() for v in os.environ.get("FICHE_ENGINE_ALLOWED_ORIGINS", "").split(",")
            if v.strip() and v.strip() != "*"]


def is_telegram_recipient_allowed(chat_id):
    allowed = {v.strip() for v in os.environ.get("FICHE_TELEGRAM_ALLOWED_CHAT_IDS", "").split(",") if v.strip()}
    return str(chat_id).strip() in allowed
