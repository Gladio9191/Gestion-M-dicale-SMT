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
"""

import os
import tempfile
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import fiche_medicale as fm

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


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info("fiche-engine starting on port %d at %s", port, BASE_PATH)
    app.run(host="0.0.0.0", port=port, debug=False)
