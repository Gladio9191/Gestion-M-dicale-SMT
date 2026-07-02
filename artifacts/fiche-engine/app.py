"""
fiche-engine — Flask REST API
Wraps fiche_medicale.py to expose endpoints consumable by the React frontend
and the Telegram bot.

Endpoints (all prefixed /fiche-engine):
  GET  /health                    — liveness probe
  POST /upload                    — upload Data-Base.xlsx, load into memory
  GET  /status                    — check if database is loaded
  POST /confirm                   — quick matricule confirmation
  POST /generate                  — generate single fiche
  POST /batch/text                — parse text + generate batch
  POST /batch/excel               — parse Excel file + generate batch
  POST /batch/image               — OCR image + generate batch (requires tesseract)
  POST /batch/generate            — generate from explicit matricule list
  GET  /audit/duplicates          — duplicate date-of-birth audit
  GET  /audit/direction           — direction mismatch audit
  GET  /audit/fonction            — fonction mismatch audit
  GET  /audit/crossed             — combined crossed audit
  POST /send-telegram             — generate PDF + send to Telegram chat_id
"""

import io
import os
import urllib.request
import urllib.parse
import urllib.error
import tempfile
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import fiche_medicale as fm
from fpdf import FPDF

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
BASE_PATH = os.environ.get("BASE_PATH", "/api/fiche-engine")
CORS(app, origins="*")

# ── In-memory database state ──────────────────────────────────────────────────
_db: dict | None = None
_db_info: dict = {}


def _require_db():
    if _db is None:
        return jsonify({"error": "Base de données non chargée. Uploadez Data-Base.xlsx d'abord."}), 503
    return None


# ── Health ────────────────────────────────────────────────────────────────────

@app.get(f"{BASE_PATH}/health")
def health():
    return jsonify({"ok": True, "db_loaded": _db is not None})


# ── Upload & load Excel ───────────────────────────────────────────────────────

@app.post(f"{BASE_PATH}/upload")
def upload():
    global _db, _db_info
    if "file" not in request.files:
        return jsonify({"error": "Aucun fichier fourni (clé 'file' attendue)."}), 400

    f = request.files["file"]
    if not f.filename or not f.filename.lower().endswith((".xlsx", ".xls")):
        return jsonify({"error": "Fichier Excel (.xlsx / .xls) requis."}), 400

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        f.save(tmp.name)
        tmp_path = tmp.name

    try:
        logger.info("Loading Data-Base.xlsx from upload...")
        _db = fm.load_database(tmp_path)
        n_personnel = len(_db["personnel"])
        n_vms = len(_db["vms"])
        _db_info = {
            "filename": f.filename,
            "personnel_count": n_personnel,
            "vms_rows": n_vms,
        }
        logger.info("Database loaded: %d personnel, %d VMS rows", n_personnel, n_vms)
        return jsonify({"ok": True, **_db_info})
    except Exception as e:
        logger.error("Upload error: %s", e)
        _db = None
        _db_info = {}
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ── Status ────────────────────────────────────────────────────────────────────

@app.get(f"{BASE_PATH}/status")
def status():
    return jsonify({
        "loaded": _db is not None,
        **_db_info,
    })


# ── Matricule confirmation ────────────────────────────────────────────────────

@app.post(f"{BASE_PATH}/confirm")
def confirm():
    err = _require_db()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    try:
        matricule = int(body.get("matricule", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "matricule invalide"}), 400
    return jsonify(fm.get_matricule_confirmation(matricule, _db))


# ── Generate single fiche ─────────────────────────────────────────────────────

@app.post(f"{BASE_PATH}/generate")
def generate():
    err = _require_db()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    try:
        matricule = int(body.get("matricule", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "matricule invalide"}), 400

    year_from = int(body.get("year_from", 2017))
    year_to = int(body.get("year_to", 2026))

    personnel_match = _db["personnel"][_db["personnel"]["Matricule"] == matricule]
    vms_match = _db["vms"][_db["vms"]["Matricule"] == matricule]
    if personnel_match.empty and vms_match.empty:
        return jsonify({"error": f"Matricule {matricule} introuvable dans la base de données"}), 404

    try:
        fiche = fm.generate_fiche(matricule, _db, year_from, year_to)
        return jsonify(fiche)
    except Exception as e:
        logger.error("generate error: %s", e)
        return jsonify({"error": str(e)}), 500


# ── Batch: from text ──────────────────────────────────────────────────────────

@app.post(f"{BASE_PATH}/batch/text")
def batch_text():
    err = _require_db()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    text = body.get("text", "")
    year_from = int(body.get("year_from", 2017))
    year_to = int(body.get("year_to", 2026))

    matricules = fm.parse_matricules_from_text(text)
    if not matricules:
        return jsonify({"extracted": [], "results": [], "warning": "Aucun matricule détecté dans le texte."})

    results = fm.generate_fiches_batch(matricules, _db, year_from, year_to)
    return jsonify({"extracted": matricules, "results": results})


# ── Batch: from Excel/CSV file ────────────────────────────────────────────────

@app.post(f"{BASE_PATH}/batch/excel")
def batch_excel():
    err = _require_db()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "Aucun fichier fourni."}), 400

    f = request.files["file"]
    year_from = int(request.form.get("year_from", 2017))
    year_to = int(request.form.get("year_to", 2026))

    suffix = Path(f.filename).suffix if f.filename else ".xlsx"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        f.save(tmp.name)
        tmp_path = tmp.name

    try:
        entries = fm.read_matricules_from_table(tmp_path)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    results = fm.generate_fiches_batch(entries, _db, year_from, year_to)
    return jsonify({"extracted": entries, "results": results})


# ── Batch: from image (OCR) ───────────────────────────────────────────────────

@app.post(f"{BASE_PATH}/batch/image")
def batch_image():
    err = _require_db()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "Aucun fichier fourni."}), 400

    f = request.files["file"]
    year_from = int(request.form.get("year_from", 2017))
    year_to = int(request.form.get("year_to", 2026))

    suffix = Path(f.filename).suffix if f.filename else ".png"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        f.save(tmp.name)
        tmp_path = tmp.name

    try:
        entries = fm.read_matricules_from_image(tmp_path)
    except ImportError as e:
        return jsonify({"error": str(e), "ocr_unavailable": True}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    results = fm.generate_fiches_batch(entries, _db, year_from, year_to)
    return jsonify({
        "extracted": entries,
        "results": results,
        "ocr_warning": "Les résultats OCR doivent être vérifiés manuellement avant génération.",
    })


# ── Batch: from explicit list ─────────────────────────────────────────────────

@app.post(f"{BASE_PATH}/batch/generate")
def batch_generate():
    err = _require_db()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    entries = body.get("matricules", [])
    year_from = int(body.get("year_from", 2017))
    year_to = int(body.get("year_to", 2026))

    if not entries:
        return jsonify({"error": "Liste de matricules vide."}), 400

    results = fm.generate_fiches_batch(entries, _db, year_from, year_to)
    return jsonify({"results": results})


# ── Audits ────────────────────────────────────────────────────────────────────

@app.get(f"{BASE_PATH}/audit/duplicates")
def audit_duplicates():
    err = _require_db()
    if err:
        return err
    try:
        return jsonify({"suspects": fm.audit_duplicate_matricules(_db)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get(f"{BASE_PATH}/audit/direction")
def audit_direction():
    err = _require_db()
    if err:
        return err
    try:
        return jsonify(fm.audit_matricule_direction_mismatch(_db))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get(f"{BASE_PATH}/audit/fonction")
def audit_fonction():
    err = _require_db()
    if err:
        return err
    try:
        return jsonify(fm.audit_matricule_fonction_mismatch(_db))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get(f"{BASE_PATH}/audit/crossed")
def audit_crossed():
    err = _require_db()
    if err:
        return err
    try:
        return jsonify({"results": fm.audit_matricule_croise(_db)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Send fiche via Telegram ───────────────────────────────────────────────────

def _build_fiche_pdf(fiche: dict) -> bytes:
    """Generate a one-page PDF from a fiche dict and return bytes."""
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=False)
    W = 170

    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(W, 6, "SMT LAAYOUNE", align="L", border=0, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(W, 10, "FICHE TECHNIQUE MEDICALE", align="C", border=0, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    LBL = 70
    def hfield(label: str, value: str):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(LBL, 7, label + "  :", border=0)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(W - LBL, 7, str(value or ""), border=0, new_x="LMARGIN", new_y="NEXT")

    hfield("Matricule",              str(fiche.get("matricule", "")))
    hfield("Direction",              fiche.get("direction", ""))
    hfield("Poste de travail actuel", fiche.get("poste_travail_actuel", ""))
    hfield("Date de naissance",      fiche.get("date_naissance", ""))
    hfield("Age",                    str(fiche.get("age", "")))
    pdf.ln(3)

    def txt_section(title: str, content: str):
        pdf.set_font("Helvetica", "BU", 10)
        pdf.cell(W, 6, title, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(W, 6, str(content or ""), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    atcd_list = fiche.get("atcd_notables", [])
    if isinstance(atcd_list, list):
        atcd_str = "  /  ".join(str(a) for a in atcd_list) if atcd_list else ""
    else:
        atcd_str = str(atcd_list)
    txt_section("ATCD NOTABLES :", atcd_str)

    pdf.set_font("Helvetica", "BU", 10)
    pdf.cell(W, 6, "EXPERTISE :", new_x="LMARGIN", new_y="NEXT")
    expertises = fiche.get("expertises", [])
    exp_map: dict = {}
    if isinstance(expertises, list):
        for ex in expertises:
            if isinstance(ex, dict):
                exp_map[str(ex.get("type_expertise", "")).upper()] = str(ex.get("resultat") or "")
    for exp_type in ["OPTHALMO", "PSY", "ORL", "VERTIGE"]:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(45, 6, f"   {exp_type}", border=0)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(W - 45, 6, exp_map.get(exp_type, ""), border=0, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    C1, C2, C3 = 32, 88, 50
    ROW_H = 7
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(220, 220, 220)
    pdf.cell(C1, ROW_H, "Date des visites", border=1, align="C", fill=True)
    pdf.cell(C2, ROW_H, "Examen Clinique & Examens demandes", border=1, align="C", fill=True)
    pdf.cell(C3, ROW_H, "Decision medicale", border=1, align="C", fill=True, new_x="LMARGIN", new_y="NEXT")

    timeline = fiche.get("timeline", [])
    rows_added = 0
    if isinstance(timeline, list):
        for row in timeline:
            if rows_added >= 16:
                break
            if not isinstance(row, dict):
                continue
            date_v = str(row.get("date", "") or "")
            exam   = str(row.get("examen_clinique", "") or "RAS")
            dec    = str(row.get("decision_visite", "") or "")
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(C1, ROW_H, date_v, border=1, align="C")
            pdf.cell(C2, ROW_H, exam[:60], border=1)
            pdf.cell(C3, ROW_H, dec, border=1, align="C", new_x="LMARGIN", new_y="NEXT")
            rows_added += 1
    for _ in range(max(0, 10 - rows_added)):
        pdf.cell(C1, ROW_H, "", border=1)
        pdf.cell(C2, ROW_H, "", border=1)
        pdf.cell(C3, ROW_H, "", border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.set_font("Helvetica", "BU", 10)
    pdf.cell(W, 6, "DECISION IMPORTANTE :", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(W, 7, str(fiche.get("decision_importante", "") or ""), border=0, new_x="LMARGIN", new_y="NEXT")

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


@app.post(f"{BASE_PATH}/send-telegram")
def send_telegram():
    err = _require_db()
    if err:
        return err

    token = os.environ.get("TELEGRAM_TOKEN", "")
    if not token:
        return jsonify({"error": "TELEGRAM_TOKEN non configuré"}), 503

    body = request.get_json(silent=True) or {}
    try:
        matricule = int(body.get("matricule", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "matricule invalide"}), 400
    chat_id = str(body.get("chat_id", "")).strip()
    if not chat_id:
        return jsonify({"error": "chat_id manquant"}), 400

    year_from = int(body.get("year_from", 2017))
    year_to   = int(body.get("year_to", 2026))

    try:
        fiche = fm.generate_fiche(matricule, _db, year_from, year_to)
    except Exception as e:
        logger.error("generate_fiche error: %s", e)
        return jsonify({"error": str(e)}), 500

    try:
        pdf_bytes = _build_fiche_pdf(fiche)
    except Exception as e:
        logger.error("pdf build error: %s", e)
        return jsonify({"error": f"Erreur génération PDF: {e}"}), 500

    filename = f"fiche_{matricule}.pdf"
    caption  = (
        f"Fiche Technique Médicale\n"
        f"Matricule: {matricule}\n"
        f"Direction: {fiche.get('direction','')}\n"
        f"Généré le {fiche.get('generated_at','')}"
    )

    tg_url = f"https://api.telegram.org/bot{token}/sendDocument"
    boundary = "----FormBoundary7MA4YWxkTrZu0gW"
    body_parts = []
    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{chat_id}".encode()
    )
    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n{caption}".encode()
    )
    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"document\"; filename=\"{filename}\"\r\nContent-Type: application/pdf\r\n\r\n".encode()
        + pdf_bytes
    )
    body_parts.append(f"--{boundary}--\r\n".encode())
    payload = b"\r\n".join(body_parts)

    req = urllib.request.Request(
        tg_url,
        data=payload,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        logger.error("Telegram API error: %s — %s", e.code, detail)
        return jsonify({"error": f"Telegram API {e.code}: {detail}"}), 502
    except Exception as e:
        logger.error("Telegram send error: %s", e)
        return jsonify({"error": str(e)}), 502

    # ── Log to Express API (best-effort, non-blocking) ────────────────────
    nom_prenom = f"{fiche.get('nom','')} {fiche.get('prenom','')}".strip() or str(matricule)
    direction  = fiche.get("direction", "")
    try:
        log_body = {
            "matricule": matricule,
            "chatId": chat_id,
            "status": "success",
            "nomPrenom": nom_prenom,
            "direction": direction,
        }
        log_data = json.dumps(log_body).encode()
        log_req  = urllib.request.Request(
            "http://localhost:80/api/telegram-sends",
            data=log_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(log_req, timeout=5) as _:
            pass
    except Exception as log_err:
        logger.warning("Could not log Telegram send: %s", log_err)

    return jsonify({"ok": True, "message": f"Fiche {matricule} envoyée au chat {chat_id} ✓"})


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info("fiche-engine starting on port %d at %s", port, BASE_PATH)
    app.run(host="0.0.0.0", port=port, debug=False)
