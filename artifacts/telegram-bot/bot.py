import os
import io
import logging
import smtplib
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

# ── Employee database (CSV or dict — easy to extend) ──────────────────────────
EMPLOYEES = {
    "MAT-2020-001": {
        "nom":      "El Alami",
        "prenom":   "Youssef",
        "poste":    "Technicien de maintenance",
        "service":  "Direction Technique",
        "statut":   "APTE",
        "date_vm":  "15/03/2025",
        "decision": "Apte au poste. Contrôle annuel recommandé.",
    },
    "MAT-2020-002": {
        "nom":      "Benali",
        "prenom":   "Fatima",
        "poste":    "Comptable",
        "service":  "Direction Financière",
        "statut":   "APTE SOUS RÉSERVE",
        "date_vm":  "20/04/2025",
        "decision": "Apte sous réserve. Suivi ophtalmologique requis.",
    },
    "MAT-2020-003": {
        "nom":      "Idrissi",
        "prenom":   "Mehdi",
        "poste":    "Ingénieur HSE",
        "service":  "Hygiène & Sécurité",
        "statut":   "APTE",
        "date_vm":  "10/01/2025",
        "decision": "Apte. Pas de restriction médicale.",
    },
}


# ── PDF generator ─────────────────────────────────────────────────────────────
def generate_fiche_pdf(matricule: str, emp: dict) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    # Title bar
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_fill_color(44, 62, 80)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 12, "FICHE TECHNIQUE MEDICALE", align="C", fill=True,
             new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(6)

    def section(title: str):
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(220, 220, 220)
        pdf.cell(0, 8, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    def row(label: str, value: str):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(65, 8, label + "  :", border=0)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 8, value, border=0, new_x="LMARGIN", new_y="NEXT")

    # Employee info
    section("INFORMATIONS AGENT")
    row("Nom & Prenom",        f"{emp['prenom']} {emp['nom']}")
    row("Matricule",           matricule)
    row("Poste de travail",    emp["poste"])
    row("Service / Direction", emp["service"])
    pdf.ln(4)

    # Medical visit
    section("VISITE MEDICALE")
    row("Date de la visite",   emp["date_vm"])

    # Statut with color
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(65, 8, "Statut medical  :", border=0)
    statut = emp["statut"]
    if "SOUS" in statut:
        pdf.set_text_color(180, 100, 0)
    elif "INAPTE" in statut:
        pdf.set_text_color(180, 0, 0)
    else:
        pdf.set_text_color(0, 130, 0)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 8, statut, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    # Decision
    section("DECISION MEDICALE")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 7, emp["decision"])
    pdf.ln(8)

    # Signature zone
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(90, 6, "Signature du medecin du travail :", border=0)
    pdf.cell(0,  6, "Cachet du service :", border=0, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(14)
    pdf.set_draw_color(120, 120, 120)
    pdf.line(20, pdf.get_y(), 100, pdf.get_y())
    pdf.line(120, pdf.get_y(), 190, pdf.get_y())

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
        "Envoyez un matricule -> PDF envoye + email automatique\n\n"
        "Matricules disponibles (demo) :\n"
        "  MAT-2020-001\n"
        "  MAT-2020-002\n"
        "  MAT-2020-003"
    )


async def handle_matricule(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text.strip().upper()
    emp  = EMPLOYEES.get(text)

    if emp is None:
        await update.message.reply_text(
            f"Matricule '{text}' introuvable.\n"
            "Verifiez et reessayez (ex: MAT-2020-001)."
        )
        return

    full_name = f"{emp['prenom']} {emp['nom']}"
    await update.message.reply_text(f"Generation de la fiche pour {full_name}...")

    try:
        pdf_bytes = generate_fiche_pdf(text, emp)
    except Exception as e:
        logger.error("PDF generation error: %s", e)
        await update.message.reply_text("Erreur lors de la generation du PDF.")
        return

    # 1) Send PDF in Telegram
    await update.message.reply_document(
        document=io.BytesIO(pdf_bytes),
        filename=f"fiche_{text}.pdf",
        caption=f"Fiche Technique — {full_name} ({text}) | {emp['statut']}",
    )

    # 2) Send PDF by email automatically
    email_ok = send_pdf_by_email(EMAIL_DEST, text, emp, pdf_bytes)
    if email_ok:
        await update.message.reply_text(f"Email envoye a {EMAIL_DEST}")
    else:
        await update.message.reply_text(
            "PDF envoye sur Telegram.\n"
            "(Email desactive — ajoutez SMTP_USER et SMTP_PASS dans Secrets pour l'activer.)"
        )


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    app = ApplicationBuilder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help",  help_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_matricule))

    logger.info("Bot is running...")
    app.run_polling()


if __name__ == "__main__":
    main()
