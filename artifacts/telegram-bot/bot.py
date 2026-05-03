import os
import io
import logging
import smtplib
import asyncio
import urllib.request
import urllib.error
import urllib.parse
import json
from email.message import EmailMessage
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters
from fpdf import FPDF

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

TOKEN      = os.environ["TELEGRAM_TOKEN"]
SMTP_USER  = os.environ.get("SMTP_USER", "")
SMTP_PASS  = os.environ.get("SMTP_PASS", "")
SMTP_HOST  = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT  = int(os.environ.get("SMTP_PORT", "587"))
EMAIL_DEST = "chat.fox2@gmail.com"

# ── API base (shared proxy — works for all matricules in the real DB) ─────────
API_BASE = "http://localhost:80"


# ── Fetch employee from real PostgreSQL database via API ──────────────────────
def fetch_from_db(matricule: str) -> dict | None:
    """Call /api/employees/{matricule}/fiche and return a normalised emp dict."""
    url = f"{API_BASE}/api/employees/{urllib.parse.quote(matricule)}/fiche"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        logger.error("API HTTP error %s for %s", e.code, matricule)
        return None
    except Exception as e:
        logger.error("API fetch error: %s", e)
        return None

    emp_raw  = data.get("employee", {})
    visites  = data.get("visites", [])

    # Last visite (most recent) for status & date
    last = visites[0] if visites else {}

    return {
        "nom":      emp_raw.get("nom", ""),
        "prenom":   emp_raw.get("prenom", ""),
        "poste":    emp_raw.get("posteActuel") or "",
        "service":  emp_raw.get("service") or emp_raw.get("direction") or "",
        "statut":   last.get("decisionAptitude") or "—",
        "date_vm":  last.get("dateVisite") or "—",
        "decision": last.get("observations") or last.get("recommandations") or "—",
        "source":   "db",
        "_fiche":   data,   # full raw API response for PDF generation
    }


# ── Local fallback dictionary (demo only) ─────────────────────────────────────
EMPLOYEES = {
    "MAT-2020-001": {
        "nom":      "El Alami",
        "prenom":   "Youssef",
        "poste":    "Technicien de maintenance",
        "service":  "Direction Technique",
        "statut":   "APTE",
        "date_vm":  "15/03/2025",
        "decision": "Apte au poste. Controle annuel recommande.",
        "source":   "local",
    },
    "MAT-2020-002": {
        "nom":      "Benali",
        "prenom":   "Fatima",
        "poste":    "Comptable",
        "service":  "Direction Financiere",
        "statut":   "APTE SOUS RESERVE",
        "date_vm":  "20/04/2025",
        "decision": "Apte sous reserve. Suivi ophtalmologique requis.",
        "source":   "local",
    },
    "MAT-2020-003": {
        "nom":      "Idrissi",
        "prenom":   "Mehdi",
        "poste":    "Ingenieur HSE",
        "service":  "Hygiene & Securite",
        "statut":   "APTE",
        "date_vm":  "10/01/2025",
        "decision": "Apte. Pas de restriction medicale.",
        "source":   "local",
    },
}


# ── PDF generator — mirrors the Word template exactly ─────────────────────────
def generate_fiche_pdf(matricule: str, emp: dict) -> bytes:
    fiche = emp.get("_fiche")          # full API response (DB employees)
    e     = fiche.get("employee", {}) if fiche else {}

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=False)

    W = 170   # usable width (210 - 2*20)

    # ── Title ──────────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(W, 10, "FICHE TECHNIQUE MEDICALE", align="C", border=1,
             new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # ── Header fields ──────────────────────────────────────────────────────────
    LBL = 70   # label column width

    def hfield(label: str, value: str):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(LBL, 7, label + "  :", border=0)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(W - LBL, 7, value or "", border=0, new_x="LMARGIN", new_y="NEXT")

    if fiche:
        age_str = (f"{e.get('age')} ans") if e.get("age") else ""
        hfield("Nom & Prenom",            f"{e.get('prenom','')} {e.get('nom','')}")
        hfield("Matricule",               e.get("matricule", matricule))
        hfield("Age",                     age_str)
        hfield("Date d'embauche",         e.get("dateEmbauche") or "")
        hfield("Service",                 e.get("service") or "")
        hfield("Poste de travail actuel", e.get("posteActuel") or "")
    else:
        hfield("Nom & Prenom",            f"{emp.get('prenom','')} {emp.get('nom','')}")
        hfield("Matricule",               matricule)
        hfield("Age",                     "")
        hfield("Date d'embauche",         "")
        hfield("Service",                 emp.get("service", ""))
        hfield("Poste de travail actuel", emp.get("poste", ""))

    pdf.ln(4)

    # ── Text sections (bold underlined title + content) ────────────────────────
    def txt_section(title: str, content: str):
        pdf.set_font("Helvetica", "BU", 10)
        pdf.cell(W, 6, title, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(W, 6, content or "", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    if fiche:
        antecedents = fiche.get("antecedents", [])
        atcd = "  /  ".join(
            f"{a.get('type','')}: {a.get('description','')}"
            for a in antecedents
        ) if antecedents else ""
        txt_section("ATCD NOTABLES :", atcd)

        # EXPERTISE
        pdf.set_font("Helvetica", "BU", 10)
        pdf.cell(W, 6, "EXPERTISE :", new_x="LMARGIN", new_y="NEXT")
        expertises = fiche.get("expertises", [])
        exp_map = {
            ex.get("typeExpertise", "").upper(): ex.get("resultat") or ""
            for ex in expertises
        }
        for exp_type in ["OPTHALMO", "PSY", "ORL", "VERTIGE"]:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(45, 6, f"   {exp_type}", border=0)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(W - 45, 6, exp_map.get(exp_type, ""), border=0,
                     new_x="LMARGIN", new_y="NEXT")
    else:
        txt_section("ATCD NOTABLES :", "")
        pdf.set_font("Helvetica", "BU", 10)
        pdf.cell(W, 6, "EXPERTISE :", new_x="LMARGIN", new_y="NEXT")
        for exp_type in ["OPTHALMO", "PSY", "ORL", "VERTIGE"]:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(45, 6, f"   {exp_type}", border=0)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(W - 45, 6, "", border=0, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)

    # ── Visits table — sized to keep everything on one A4 page ─────────────────
    # Budget: 257mm usable − 116mm fixed content = 141mm ÷ 7mm/row ≈ 18 rows max
    C1, C2, C3 = 32, 88, 50     # col widths (total = 170)
    ROW_H      = 7
    MIN_ROWS   = 18              # fits exactly on one A4 page

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(220, 220, 220)
    pdf.cell(C1, ROW_H, "Date des visites",                      border=1, align="C", fill=True)
    pdf.cell(C2, ROW_H, "Examens cliniques et/ou explorations",  border=1, align="C", fill=True)
    pdf.cell(C3, ROW_H, "Observations",                          border=1, align="C", fill=True,
             new_x="LMARGIN", new_y="NEXT")

    visites = fiche.get("visites", []) if fiche else []
    pdf.set_font("Helvetica", "", 9)
    for v in visites:
        date_v = v.get("dateVisite") or ""
        exam   = v.get("examensCliniques") or ""
        obs    = v.get("observations") or ""
        pdf.cell(C1, ROW_H, date_v, border=1)
        pdf.cell(C2, ROW_H, exam,   border=1)
        pdf.cell(C3, ROW_H, obs,    border=1, new_x="LMARGIN", new_y="NEXT")

    empty_count = max(MIN_ROWS - len(visites), 5)
    for _ in range(empty_count):
        pdf.cell(C1, ROW_H, "", border=1)
        pdf.cell(C2, ROW_H, "", border=1)
        pdf.cell(C3, ROW_H, "", border=1, new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())


# ── Email sender ──────────────────────────────────────────────────────────────
def send_pdf_by_email(to_email: str, matricule: str, emp: dict, pdf_bytes: bytes) -> bool:
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP credentials not set — email skipped.")
        return False

    full_name = f"{emp['prenom']} {emp['nom']}"
    msg = EmailMessage()
    msg["Subject"] = f"Fiche Technique Medicale — {full_name} ({matricule})"
    msg["From"]    = SMTP_USER
    msg["To"]      = to_email
    msg.set_content(
        f"Bonjour,\n\n"
        f"Veuillez trouver ci-joint la Fiche Technique Medicale de :\n"
        f"  Nom        : {full_name}\n"
        f"  Matricule  : {matricule}\n"
        f"  Statut     : {emp['statut']}\n"
        f"  Date VM    : {emp['date_vm']}\n\n"
        f"Cordialement,\nService Medecine du Travail"
    )
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=f"fiche_{matricule}.pdf",
    )
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.ehlo()
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
        logger.info("Email sent to %s for matricule %s", to_email, matricule)
        return True
    except Exception as e:
        logger.error("Email error: %s", e)
        return False


# ── Handlers ──────────────────────────────────────────────────────────────────
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Bienvenue — Service Medecine du Travail\n\n"
        "Envoyez un matricule (ex: MAT-2020-001)\n"
        "pour recevoir la Fiche Technique PDF.\n\n"
        "/start — Accueil\n"
        "/help  — Aide"
    )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Comment utiliser ce bot :\n\n"
        "Envoyez un matricule (ex: 80022)\n"
        "-> PDF genere + email envoye automatiquement\n\n"
        "/list  — Voir tous les employes dans la base\n"
        "/help  — Cette aide\n\n"
        "Pour ajouter un employe : utilisez l'application web\n"
        "(ajoutez-le, puis envoyez son matricule ici)."
    )


def _fetch_employees_list() -> list:
    """Blocking helper — run via asyncio.to_thread."""
    url = f"{API_BASE}/api/employees?limit=100"
    with urllib.request.urlopen(url, timeout=8) as resp:
        data = json.loads(resp.read().decode())
    return data.get("employees") or data.get("data") or (data if isinstance(data, list) else [])


async def list_employees(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show all employees currently in the real database."""
    try:
        employees = await asyncio.to_thread(_fetch_employees_list)
    except Exception as e:
        logger.error("List employees error: %s", e)
        await update.message.reply_text("Erreur lors de la recuperation de la liste.")
        return

    if not employees:
        await update.message.reply_text("Aucun employe trouve dans la base de donnees.")
        return

    lines = ["Liste des employes (base de donnees) :\n"]
    for emp in employees:
        mat    = emp.get("matricule", "?")
        nom    = emp.get("nom", "")
        prenom = emp.get("prenom", "")
        lines.append(f"  {mat}  —  {prenom} {nom}")

    lines.append(f"\nTotal : {len(employees)} employe(s)")
    lines.append("\nEnvoyez un matricule pour generer le PDF.")
    await update.message.reply_text("\n".join(lines))


async def handle_matricule(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text.strip()

    # 1) Check local demo dict (case-insensitive upper)
    emp = EMPLOYEES.get(text.upper())

    # 2) If not found locally, search the real database (run blocking IO in thread)
    if emp is None:
        await update.message.reply_text(f"Recherche de '{text}' dans la base de donnees...")
        emp = await asyncio.to_thread(fetch_from_db, text)

    # 3) Also try uppercase variant
    if emp is None and text != text.upper():
        emp = await asyncio.to_thread(fetch_from_db, text.upper())

    if emp is None:
        await update.message.reply_text(
            f"Matricule '{text}' introuvable.\n"
            "Verifiez le matricule et reessayez.\n\n"
            "Utilisez /list pour voir tous les matricules disponibles."
        )
        return

    full_name = f"{emp['prenom']} {emp['nom']}"
    source_label = " [BD]" if emp.get("source") == "db" else ""
    await update.message.reply_text(f"Generation de la fiche pour {full_name}{source_label}...")

    try:
        pdf_bytes = await asyncio.to_thread(generate_fiche_pdf, text, emp)
    except Exception as e:
        logger.error("PDF generation error: %s", e)
        await update.message.reply_text(f"Erreur lors de la generation du PDF: {e}")
        return

    # 1) Send PDF in Telegram
    await update.message.reply_document(
        document=io.BytesIO(pdf_bytes),
        filename=f"fiche_{text}.pdf",
        caption=f"Fiche Technique — {full_name} ({text}) | {emp['statut']}",
    )

    # 2) Send PDF by email automatically (non-blocking)
    email_ok = await asyncio.to_thread(send_pdf_by_email, EMAIL_DEST, text, emp, pdf_bytes)
    if email_ok:
        await update.message.reply_text(f"Email envoye automatiquement a {EMAIL_DEST}")
    else:
        await update.message.reply_text(
            "PDF envoye sur Telegram.\n"
            "(Email desactive — verifiez SMTP_USER / SMTP_PASS dans les Secrets.)"
        )


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    app = ApplicationBuilder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help",  help_cmd))
    app.add_handler(CommandHandler("list",  list_employees))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_matricule))

    logger.info("Bot is running...")
    app.run_polling()


if __name__ == "__main__":
    main()
