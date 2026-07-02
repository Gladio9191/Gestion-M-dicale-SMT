# -*- coding: utf-8 -*-
"""
fiche_medicale.py
------------------
Backend logic (pandas) pour générer la structure de données d'une
"Fiche Technique Médicale" à partir du classeur Data-Base.xlsx.

Principe général :
- Toutes les données factuelles sont extraites TELLES QUELLES depuis le
  classeur Excel. Rien n'est inventé ni généré aléatoirement.
- Les champs "Expertises" (OPHTALMO, PSY, ORL, VERTIGE) sont pré-remplis
  UNIQUEMENT si une valeur réelle existe dans les feuilles sources.
  Sinon ils restent vides. Dans tous les cas, ces champs restent
  modifiables manuellement côté application.

Règle d'or absolue : le matricule ne doit JAMAIS être deviné, corrigé
ou rapproché automatiquement. Toujours faire un match strict et exact.
"""

import re
from datetime import datetime
import pandas as pd


# --------------------------------------------------------------------------
# 1. CHARGEMENT & NORMALISATION
# --------------------------------------------------------------------------

def _to_matricule(series: pd.Series) -> pd.Series:
    """Normalise une colonne matricule en Int64 nullable."""
    return pd.to_numeric(series, errors="coerce").astype("Int64")


def load_database(path: str) -> dict:
    """
    Charge toutes les feuilles utiles du classeur et normalise les
    colonnes Matricule pour permettre des jointures fiables.
    """
    xl = pd.ExcelFile(path)

    vms = pd.read_excel(xl, "VMS 2017- 2026")
    vms = vms.rename(columns={"Mle": "Matricule", "dates": "Date"})
    vms["Matricule"] = _to_matricule(vms["Matricule"])
    vms["Date"] = pd.to_datetime(vms["Date"], errors="coerce")
    vms = vms.dropna(subset=["Matricule", "Date"])

    personnel = pd.read_excel(xl, "Personnel Global")
    personnel["Matricule"] = _to_matricule(personnel["Matricule"])
    if "Désignation d'objet" not in personnel.columns:
        personnel["Désignation d'objet"] = None

    rm = pd.read_excel(xl, "Etat RM Global")
    rm = rm.rename(columns={"Mle": "Matricule"})
    rm["Matricule"] = _to_matricule(rm["Matricule"])
    rm["Date RM"] = pd.to_datetime(rm.get("Date RM"), errors="coerce")

    psa = pd.read_excel(xl, "Campagne PSA 2024")
    psa = psa.rename(columns={"Mle": "Matricule"})
    psa["Matricule"] = _to_matricule(psa["Matricule"])
    psa["PSA donné / fait le"] = pd.to_datetime(
        psa.get("PSA donné / fait le"), errors="coerce"
    )

    metabo = pd.read_excel(xl, "Camp.Mald.Métabo 2023")
    metabo = metabo.rename(columns={"Mle": "Matricule"})
    metabo["Matricule"] = _to_matricule(metabo["Matricule"])
    metabo["Date prélèvement"] = pd.to_datetime(
        metabo.get("Date prélèvement"), errors="coerce"
    )

    checkup_hc = pd.read_excel(xl, "Check Up HC 2024")
    checkup_hc = checkup_hc.rename(columns={"Mle": "Matricule"})
    checkup_hc["Matricule"] = _to_matricule(checkup_hc["Matricule"])
    checkup_hc["Date de Visite"] = pd.to_datetime(
        checkup_hc.get("Date de Visite"), errors="coerce"
    )

    # Ces deux feuilles ont un titre sur la ligne 1 -> header réel = ligne 2
    par_2022 = pd.read_excel(xl, "Check Up PAR 2022 ", skiprows=1)
    par_2022 = par_2022.rename(columns={"Mle": "Matricule"})
    par_2022["Matricule"] = _to_matricule(par_2022["Matricule"])
    par_2022["Date de Visite"] = pd.to_datetime(
        par_2022.get("Date de Visite"), errors="coerce"
    )

    par_2023 = pd.read_excel(xl, "Check Up PAR 2023", skiprows=1)
    par_2023 = par_2023.rename(columns={"Mle": "Matricule"})
    par_2023["Matricule"] = _to_matricule(par_2023["Matricule"])
    par_2023["Date de Visite"] = pd.to_datetime(
        par_2023.get("Date de Visite"), errors="coerce"
    )

    return {
        "vms": vms,
        "personnel": personnel,
        "rm": rm,
        "psa": psa,
        "metabo": metabo,
        "checkup_hc": checkup_hc,
        "par_2022": par_2022,
        "par_2023": par_2023,
    }


# --------------------------------------------------------------------------
# 2. HELPERS
# --------------------------------------------------------------------------

def _clean(val) -> str:
    """Convertit une valeur en texte propre, '' si vide/NaN."""
    if val is None:
        return ""
    if isinstance(val, float) and pd.isna(val):
        return ""
    try:
        if pd.isna(val) if not isinstance(val, (list, dict)) else False:
            return ""
    except Exception:
        pass
    s = str(val).strip()
    return "" if s.lower() in ("nan", "nat", "none") else s


def _fmt_date(d) -> str:
    if d is None:
        return ""
    try:
        if pd.isna(d):
            return ""
    except Exception:
        pass
    return pd.Timestamp(d).strftime("%d/%m/%Y")


def _fmt_year(d) -> str:
    """Pour les campagnes annexes : on ne garde que l'année."""
    if d is None:
        return ""
    try:
        if pd.isna(d):
            return ""
    except Exception:
        pass
    return str(pd.Timestamp(d).year)


def _normalize_text(s) -> str:
    """Uppercase, sans accents, espaces multiples réduits.
    Développe les abréviations connues : '1/4' = 'QUART', 'PL' = 'PRINCIPAL'."""
    import unicodedata
    s = _clean(s)
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"\s+", " ", s).strip().upper()
    s = s.replace("1/4", "QUART")
    s = re.sub(r"\bPL\b", "PRINCIPAL", s)
    return s


def _join_nonempty(parts, sep=" - ") -> str:
    return sep.join(p for p in (p.strip() for p in parts) if p)


# --------------------------------------------------------------------------
# 3. INFOS PERSONNELLES
# --------------------------------------------------------------------------

def get_personnel_info(matricule: int, data: dict) -> dict:
    """
    Bloc d'en-tête : matricule, âge, direction, poste actuel.

    Règle : le "Poste de travail actuel" vient TOUJOURS de Personnel Global
    (colonne "Désignation d'objet"), jamais de VMS — même en cas de
    promotion/avancement. VMS n'est utilisé qu'en dernier recours si
    l'agent est totalement absent de Personnel Global.
    """
    personnel = data["personnel"]
    row = personnel[personnel["Matricule"] == matricule]

    if not row.empty:
        row = row.iloc[0]
        direction = _clean(row.get("direction"))
        age = _clean(row.get("Age"))
        poste = _clean(row.get("Désignation d'objet")) or _clean(row.get("Texte domaine du pers."))
        date_naissance = _fmt_date(row.get("Né(e) le"))
    else:
        direction, age, poste, date_naissance = "", "", "", ""

    # Dernier recours uniquement : agent absent de Personnel Global.
    if not direction or not poste:
        vms_rows = data["vms"][data["vms"]["Matricule"] == matricule].sort_values("Date")
        if not vms_rows.empty:
            last = vms_rows.iloc[-1]
            direction = direction or _clean(last.get("Dir"))
            poste = poste or _clean(last.get("Fonction"))

    return {
        "matricule": matricule,
        "date_naissance": date_naissance,
        "age": age,
        "direction": direction,
        "service": "",
        "poste_travail_actuel": poste,
    }


# --------------------------------------------------------------------------
# 4. ANTECEDENTS NOTABLES (ATCD)
# --------------------------------------------------------------------------

def get_atcd_notables(matricule: int, data: dict) -> list:
    """
    Construit la liste des antécédents notables : RM à motif médical,
    campagne PSA, maladies métaboliques, check-up PAR 2022/2023, HC 2024.
    """
    atcd = []

    # --- RM à motif médical ---
    rm_rows = data["rm"][data["rm"]["Matricule"] == matricule]
    for _, r in rm_rows.iterrows():
        motif = _clean(r.get("Motif Médical"))
        if not motif:
            continue
        date_rm = _fmt_date(r.get("Date RM"))
        nature = _clean(r.get("Nature RM"))
        decision = _clean(r.get("Décision"))
        obs = _clean(r.get("OBSERVATIONS"))
        txt = _join_nonempty([
            f"RM {nature}".strip() if nature else "RM",
            f"motif: {motif}",
            f"le {date_rm}" if date_rm else "",
            f"décision: {decision}" if decision else "",
            obs,
        ])
        atcd.append(txt)

    # --- Campagne PSA ---
    psa_rows = data["psa"][data["psa"]["Matricule"] == matricule]
    for _, r in psa_rows.iterrows():
        resultat = r.get("Résultat")
        if pd.isna(resultat):
            continue
        annee_psa = _fmt_year(r.get("PSA donné / fait le"))
        suivi = _clean(r.get("Suivi"))
        txt = _join_nonempty([
            f"Campagne PSA {annee_psa}" if annee_psa else "Campagne PSA",
            f"résultat: {resultat}",
            f"suivi: {suivi}" if suivi else "",
        ])
        atcd.append(txt)

    # --- Maladies métaboliques 2023 ---
    metabo_rows = data["metabo"][data["metabo"]["Matricule"] == matricule]
    for _, r in metabo_rows.iterrows():
        pb = _clean(r.get("Problèmes détéctés"))
        if not pb or pb.upper() == "RAS":
            continue
        annee_p = _fmt_year(r.get("Date prélèvement"))
        suivi = _clean(r.get("SUIVI"))
        txt = _join_nonempty([
            f"Campagne maladies métaboliques {annee_p}" if annee_p else "Campagne maladies métaboliques",
            pb,
            f"suivi: {suivi}" if suivi else "",
        ])
        atcd.append(txt)

    # --- Check-up PAR 2022 / 2023 ---
    for label, df_key in (("Check-up PAR 2022", "par_2022"), ("Check-up PAR 2023", "par_2023")):
        rows = data[df_key][data[df_key]["Matricule"] == matricule]
        for _, r in rows.iterrows():
            pb = _clean(r.get("problèmes détectés"))
            if not pb or pb.upper() == "RAS":
                continue
            annee_v = _fmt_year(r.get("Date de Visite"))
            orient = _clean(r.get("orientations vers soins"))
            txt = _join_nonempty([
                f"{label} ({annee_v})" if annee_v else label,
                pb,
                f"orientation: {orient}" if orient else "",
            ])
            atcd.append(txt)

    # --- Check-up HC 2024 ---
    hc_rows = data["checkup_hc"][data["checkup_hc"]["Matricule"] == matricule]
    for _, r in hc_rows.iterrows():
        resultat = _clean(r.get("Résultat"))
        if not resultat or resultat.upper() == "NORMAL":
            continue
        annee_v = _fmt_year(r.get("Date de Visite"))
        txt = _join_nonempty([
            f"Check-up HC ({annee_v})" if annee_v else "Check-up HC",
            f"résultat: {resultat}",
        ])
        atcd.append(txt)

    return atcd


# --------------------------------------------------------------------------
# 5. TIMELINE DES VISITES (fusion contextuelle)
# --------------------------------------------------------------------------

def _year(d):
    return d.year if pd.notna(d) else None


def _vms_row_to_examen(row) -> str:
    """Construit le texte 'Examen clinique / observations' pour une ligne VMS."""
    parts = [_clean(row.get("EX Clinique"))]
    cs_soins = _clean(row.get("CS SOINS MT"))
    if cs_soins:
        parts.append(f"Cs Soins MT: {cs_soins}")
    cs_expertise = _clean(row.get("CS EXPERTISE MS"))
    if cs_expertise:
        parts.append(f"Cs Expertise MS: {cs_expertise}")
    rx = _clean(row.get("RX Pulmo"))
    if rx:
        parts.append(f"Radio: {rx}")
    bilan = _clean(row.get("BILAN"))
    if bilan:
        parts.append(f"Bilan: {bilan}")
    return _join_nonempty(parts)


def get_timeline(matricule: int, data: dict,
                 year_from: int = 2017, year_to: int = 2026) -> list:
    """
    Construit la chronologie des visites (ordre croissant) en fusionnant
    VMS + feuilles annexes. Correspondance par ANNEE (pas par date exacte).
    VMS affiche la date complète ; annexes affichent uniquement l'année.
    """
    timeline = []

    vms_rows = data["vms"][
        (data["vms"]["Matricule"] == matricule)
        & (data["vms"]["Date"].dt.year >= year_from)
        & (data["vms"]["Date"].dt.year <= year_to)
    ].sort_values("Date")

    used_years = set()
    for _, row in vms_rows.iterrows():
        d = row["Date"]
        used_years.add(_year(d))
        timeline.append({
            "date": d,
            "year_only": False,
            "examen": _vms_row_to_examen(row),
            "decision": _clean(row.get("décision et observations")),
            "source": "VMS",
        })

    YEAR_ONLY_SOURCES = {"psa", "metabo", "par_2022", "par_2023", "checkup_hc"}

    annex_specs = [
        ("rm", "Date RM", lambda r: _join_nonempty([
            f"RM {_clean(r.get('Nature RM'))}".strip(),
            f"motif: {_clean(r.get('Motif Médical'))}",
            _clean(r.get("OBSERVATIONS")),
        ]), "Décision"),
        ("psa", "PSA donné / fait le", lambda r: _join_nonempty([
            "PSA",
            f"résultat: {r.get('Résultat')}" if pd.notna(r.get("Résultat")) else "",
        ]), None),
        ("metabo", "Date prélèvement", lambda r: _join_nonempty([
            "Bilan métabolique", _clean(r.get("Problèmes détéctés")),
        ]), None),
        ("par_2022", "Date de Visite", lambda r: _join_nonempty([
            "Check-up PAR 2022", _clean(r.get("problèmes détectés")),
        ]), None),
        ("par_2023", "Date de Visite", lambda r: _join_nonempty([
            "Check-up PAR 2023", _clean(r.get("problèmes détectés")),
        ]), None),
        ("checkup_hc", "Date de Visite", lambda r: _join_nonempty([
            "Check-up HC 2024", f"résultat: {_clean(r.get('Résultat'))}",
        ]), None),
    ]

    for key, date_col, text_fn, decision_col in annex_specs:
        df = data[key]
        rows = df[df["Matricule"] == matricule]
        for _, r in rows.iterrows():
            d = r.get(date_col)
            if pd.isna(d):
                continue
            yr = _year(d)
            if yr is None or yr < year_from or yr > year_to:
                continue
            text = text_fn(r)
            if not text:
                continue
            decision_val = _clean(r.get(decision_col)) if decision_col else ""

            match = next((t for t in timeline
                          if t["source"] == "VMS" and _year(t["date"]) == yr), None)
            if match:
                match["examen"] = _join_nonempty([match["examen"], text])
                if decision_val:
                    match["decision"] = _join_nonempty([match["decision"], decision_val])
            else:
                display_date = pd.Timestamp(year=yr, month=1, day=1) if key in YEAR_ONLY_SOURCES else d
                timeline.append({
                    "date": display_date,
                    "year_only": key in YEAR_ONLY_SOURCES,
                    "examen": text,
                    "decision": decision_val,
                    "source": key,
                })

    timeline.sort(key=lambda t: t["date"])
    for t in timeline:
        t["date"] = _fmt_year(t["date"]) if t.get("year_only") else _fmt_date(t["date"])
        t.pop("year_only", None)

    return timeline


# --------------------------------------------------------------------------
# 6. DERNIERE DECISION MEDICALE
# --------------------------------------------------------------------------

def get_decision_importante(matricule: int, data: dict, timeline: list) -> str:
    """
    Dernière décision médicale connue = décision de la dernière visite,
    recoupée avec une RM active (Etat RM Global) si elle existe.
    """
    decision_visite = ""
    for t in reversed(timeline):
        if t["decision"]:
            decision_visite = t["decision"]
            break

    rm_rows = data["rm"][data["rm"]["Matricule"] == matricule]
    if not rm_rows.empty:
        last_rm = rm_rows.sort_values("Date RM").iloc[-1]
        decision_rm = _clean(last_rm.get("Décision"))
        if decision_rm:
            return _join_nonempty([
                decision_visite,
                f"[Restriction médicale en vigueur : {decision_rm}]",
            ])
    return decision_visite


# --------------------------------------------------------------------------
# 7. EXPERTISES (pré-remplissage à partir de données réelles uniquement)
# --------------------------------------------------------------------------

def get_expertises_prefill(matricule: int, data: dict) -> dict:
    """
    Pré-remplit OPHTALMO / PSY / ORL si une valeur RÉELLE existe dans les
    feuilles sources. Ne génère jamais de valeur. VERTIGE reste toujours vide.
    Tous ces champs restent éditables manuellement dans l'application.
    """
    expertises = {"OPHTALMO": "", "PSY": "", "ORL": "", "VERTIGE": ""}

    rm_rows = data["rm"][data["rm"]["Matricule"] == matricule]

    ophtalmo_rm = rm_rows[rm_rows["Motif Médical"].astype(str).str.contains(
        "OPHTALMO", case=False, na=False)]
    if not ophtalmo_rm.empty:
        obs = _clean(ophtalmo_rm.iloc[-1].get("OBSERVATIONS"))
        if obs:
            expertises["OPHTALMO"] = obs

    psy_rm = rm_rows[rm_rows["Motif Médical"].astype(str).str.contains(
        "PSY", case=False, na=False)]
    if not psy_rm.empty:
        vms_rows = data["vms"][data["vms"]["Matricule"] == matricule]
        mask = vms_rows["décision et observations"].astype(str).str.contains(
            "PSY", case=False, na=False
        ) | vms_rows["CS EXPERTISE MS"].astype(str).str.contains(
            "PSY", case=False, na=False
        )
        matches = vms_rows[mask]
        if not matches.empty:
            expertises["PSY"] = _clean(matches.iloc[-1].get("décision et observations")) \
                or _clean(matches.iloc[-1].get("CS EXPERTISE MS"))

    orl_rm = rm_rows[rm_rows["Motif Médical"].astype(str).str.contains(
        "ORL|VERTIGE", case=False, na=False)]
    if not orl_rm.empty:
        vms_rows = data["vms"][data["vms"]["Matricule"] == matricule]
        mask = vms_rows["décision et observations"].astype(str).str.contains(
            "ORL", case=False, na=False
        )
        matches = vms_rows[mask]
        if not matches.empty:
            expertises["ORL"] = _clean(matches.iloc[-1].get("décision et observations"))

    return expertises


# --------------------------------------------------------------------------
# 8. FONCTION PRINCIPALE
# --------------------------------------------------------------------------

def generate_fiche(matricule: int, data: dict,
                   year_from: int = 2017, year_to: int = 2026) -> dict:
    """
    Point d'entrée unique : construit la structure complète de la Fiche
    Technique Médicale pour un matricule donné.
    """
    matricule = int(matricule)

    personnel_info = get_personnel_info(matricule, data)
    timeline = get_timeline(matricule, data, year_from, year_to)
    atcd = get_atcd_notables(matricule, data)
    decision_importante = get_decision_importante(matricule, data, timeline)
    expertises = get_expertises_prefill(matricule, data)

    return {
        "nom_prenom": "",
        **personnel_info,
        "atcd_notables": atcd,
        "decision_importante": decision_importante,
        "expertises": expertises,
        "timeline": timeline,
        "generated_at": datetime.now().strftime("%d/%m/%Y %H:%M"),
    }


# --------------------------------------------------------------------------
# 9. SAISIE EN MASSE (LOT)
# --------------------------------------------------------------------------

_MATRICULE_TOKEN_RE = re.compile(r"\b\d{4,7}\b")

_MATRICULE_COL_CANDIDATES = ["matricule", "mle", "mat", "matricul"]
_TYPE_VISITE_COL_CANDIDATES = [
    "type de visite", "type visite", "visite demandée",
    "type de visite médicale", "habilitation", "motif", "visite demandee",
]


def parse_matricules_from_text(text: str) -> list:
    """
    Extrait les matricules d'un texte libre (email copié-collé, OCR...).
    Ne garde que des nombres plausibles (4 à 7 chiffres). Dédoublonne.
    """
    if not text:
        return []
    found = _MATRICULE_TOKEN_RE.findall(text)
    seen, ordered = set(), []
    for m in found:
        val = int(m)
        if val not in seen:
            seen.add(val)
            ordered.append(val)
    return ordered


def _find_column(columns, candidates) -> str | None:
    cols_lower = {str(c).strip().lower(): c for c in columns}
    for cand in candidates:
        for lower_name, original in cols_lower.items():
            if cand in lower_name:
                return original
    return None


def read_matricules_from_table(path: str) -> list:
    """
    Lit un fichier Excel (.xlsx/.xls) ou CSV et en extrait les matricules.
    Retourne [{"matricule": 74381, "type_visite": "VMS"}, ...]
    """
    if path.lower().endswith(".csv"):
        df = pd.read_csv(path)
    else:
        df = pd.read_excel(path)

    matricule_col = _find_column(df.columns, _MATRICULE_COL_CANDIDATES)
    if matricule_col is None:
        raise ValueError(
            f"Aucune colonne 'Matricule' détectée. Colonnes trouvées : {list(df.columns)}"
        )

    type_col = _find_column(df.columns, _TYPE_VISITE_COL_CANDIDATES)

    rows = []
    seen = set()
    for _, r in df.iterrows():
        raw = r.get(matricule_col)
        if pd.isna(raw):
            continue
        try:
            mat = int(re.sub(r"\D", "", str(raw)))
        except ValueError:
            continue
        if not mat or mat in seen:
            continue
        seen.add(mat)
        rows.append({
            "matricule": mat,
            "type_visite": _clean(r.get(type_col)) if type_col else "",
        })
    return rows


def read_matricules_from_image(path: str, lang: str = "fra") -> list:
    """
    Lit une photo/scan via OCR (pytesseract + Tesseract) et extrait les
    matricules détectés.
    ATTENTION : l'OCR n'est pas fiable à 100%, résultats à vérifier.
    """
    try:
        import pytesseract
        from PIL import Image
    except ImportError as e:
        raise ImportError(
            "pytesseract et/ou Pillow ne sont pas installés."
        ) from e

    image = Image.open(path)
    try:
        text = pytesseract.image_to_string(image, lang=lang)
    except Exception:
        text = pytesseract.image_to_string(image, lang="eng")
    matricules = parse_matricules_from_text(text)
    return [{"matricule": m, "type_visite": ""} for m in matricules]


def generate_fiches_batch(entries, data: dict,
                           year_from: int = 2017, year_to: int = 2026) -> list:
    """
    Génère les fiches pour une liste de matricules.
    Les matricules introuvables ne font pas planter le lot :
    ils sont renvoyés avec un champ "error" explicite.
    """
    results = []
    for entry in entries:
        if isinstance(entry, dict):
            matricule = entry.get("matricule")
            type_visite = entry.get("type_visite", "")
        else:
            matricule, type_visite = entry, ""

        try:
            matricule_int = int(matricule)
        except (TypeError, ValueError):
            results.append({"matricule": matricule, "error": "Matricule invalide"})
            continue

        personnel_match = data["personnel"][data["personnel"]["Matricule"] == matricule_int]
        vms_match = data["vms"][data["vms"]["Matricule"] == matricule_int]
        if personnel_match.empty and vms_match.empty:
            results.append({
                "matricule": matricule_int,
                "type_visite": type_visite,
                "error": "Matricule introuvable dans la base de données",
            })
            continue

        fiche = generate_fiche(matricule_int, data, year_from, year_to)
        fiche["type_visite"] = type_visite
        results.append(fiche)

    return results


# --------------------------------------------------------------------------
# 10. CONTROLE QUALITE DU MATRICULE
# --------------------------------------------------------------------------

def get_matricule_confirmation(matricule: int, data: dict) -> dict:
    """
    Identification rapide d'un matricule (sans construire toute la fiche),
    à afficher immédiatement après saisie pour confirmation visuelle.
    Retourne "OK" ou "INTROUVABLE".
    """
    matricule = int(matricule)
    personnel = data["personnel"]
    row = personnel[personnel["Matricule"] == matricule]

    if row.empty:
        vms_rows = data["vms"][data["vms"]["Matricule"] == matricule]
        if vms_rows.empty:
            return {
                "matricule": matricule,
                "status": "INTROUVABLE",
                "message": "Aucune donnée trouvée pour ce matricule. Vérifiez la saisie.",
            }
        last = vms_rows.sort_values("Date").iloc[-1]
        return {
            "matricule": matricule,
            "status": "OK",
            "direction": _clean(last.get("Dir")),
            "poste": _clean(last.get("Fonction")),
            "date_naissance": "",
            "source": "VMS uniquement (absent de Personnel Global)",
        }

    r = row.iloc[0]
    return {
        "matricule": matricule,
        "status": "OK",
        "direction": _clean(r.get("direction")),
        "poste": _clean(r.get("Texte domaine du pers.")),
        "date_naissance": _fmt_date(r.get("Né(e) le")),
        "age": _clean(r.get("Age")),
        "source": "Personnel Global",
    }


def audit_duplicate_matricules(data: dict) -> list:
    """
    Détecte les matricules différents partageant la même date de naissance.
    Exclut les dates placeholder 01/01 et 31/12.
    Ne corrige rien — signale uniquement pour vérification manuelle.
    """
    personnel = data["personnel"].dropna(subset=["Né(e) le"]).copy()
    personnel["Né(e) le"] = pd.to_datetime(personnel["Né(e) le"], errors="coerce")
    personnel = personnel.dropna(subset=["Né(e) le"])

    is_placeholder = (
        ((personnel["Né(e) le"].dt.month == 12) & (personnel["Né(e) le"].dt.day == 31))
        | ((personnel["Né(e) le"].dt.month == 1) & (personnel["Né(e) le"].dt.day == 1))
    )
    personnel = personnel[~is_placeholder]
    personnel["_dob_key"] = personnel["Né(e) le"].apply(_fmt_date)

    suspects = []
    for dob, group in personnel.groupby("_dob_key"):
        if not dob:
            continue
        matricules = group["Matricule"].dropna().unique().tolist()
        if len(matricules) < 2:
            continue

        directions = group["direction"].apply(_clean).unique().tolist()
        confiance = "haute" if len(directions) == 1 else "à vérifier"

        detail = [
            {
                "matricule": int(m),
                "direction": _clean(group[group["Matricule"] == m].iloc[0].get("direction")),
                "poste": _clean(group[group["Matricule"] == m].iloc[0].get("Texte domaine du pers.")),
            }
            for m in matricules
        ]
        suspects.append({
            "date_naissance": dob,
            "matricules": [int(m) for m in matricules],
            "confiance": confiance,
            "detail": detail,
        })

    suspects.sort(key=lambda s: s["confiance"] != "haute")
    return suspects


def audit_matricule_direction_mismatch(data: dict) -> dict:
    """
    Recoupe VMS avec Personnel Global : compare la Direction (Dir en VMS /
    direction en Personnel Global). Un écart signale une erreur possible
    ou un changement de direction. Ne corrige rien automatiquement.
    """
    personnel = data["personnel"].copy()
    personnel["direction"] = personnel["direction"].astype(str).str.strip()

    vms = data["vms"].copy()
    vms["Dir"] = vms["Dir"].astype(str).str.strip()

    common_matricules = set(personnel["Matricule"].dropna()) & set(vms["Matricule"].dropna())

    mismatches = []
    pattern_counts: dict = {}
    for m in sorted(common_matricules):
        pg_dir = personnel[personnel["Matricule"] == m]["direction"].iloc[0]
        vms_dirs = sorted(set(vms[vms["Matricule"] == m]["Dir"].dropna().tolist()))
        vms_dirs = [d for d in vms_dirs if d and d.lower() != "nan"]
        if not vms_dirs or pg_dir in vms_dirs:
            continue

        mismatches.append({
            "matricule": int(m),
            "direction_personnel_global": pg_dir,
            "directions_vms": vms_dirs,
        })
        for vd in vms_dirs:
            key = f"{pg_dir} -> {vd}"
            pattern_counts[key] = pattern_counts.get(key, 0) + 1

    return {
        "mismatches": mismatches,
        "patterns_frequents": dict(
            sorted(pattern_counts.items(), key=lambda kv: -kv[1])
        ),
    }


def audit_matricule_fonction_mismatch(data: dict) -> dict:
    """
    Recoupe VMS avec la colonne "Désignation d'objet" (Personnel Global).
    Si l'intitulé RH n'apparaît jamais dans l'historique VMS du matricule,
    c'est un signal à vérifier (peut être une promotion).
    Ne corrige rien automatiquement.
    """
    personnel = data["personnel"]
    vms = data["vms"]

    common_matricules = sorted(
        set(personnel["Matricule"].dropna()) & set(vms["Matricule"].dropna())
    )

    mismatches = []
    non_verifiables = []

    for m in common_matricules:
        fonction_rh = _clean(
            personnel[personnel["Matricule"] == m]["Désignation d'objet"].iloc[0]
        )
        if not fonction_rh:
            non_verifiables.append(int(m))
            continue

        fonctions_vms = [
            f for f in vms[vms["Matricule"] == m]["Fonction"].dropna().unique().tolist()
            if _clean(f)
        ]
        if not fonctions_vms:
            non_verifiables.append(int(m))
            continue

        fonction_rh_norm = _normalize_text(fonction_rh)
        fonctions_vms_norm = {_normalize_text(f) for f in fonctions_vms}

        if fonction_rh_norm not in fonctions_vms_norm:
            mismatches.append({
                "matricule": int(m),
                "fonction_rh": fonction_rh,
                "fonctions_vms_historique": fonctions_vms,
            })

    return {"mismatches": mismatches, "non_verifiables": non_verifiables}


def audit_matricule_croise(data: dict) -> list:
    """
    Combine les deux audits (Direction + Fonction).
    - "haute"   : les deux signaux discordants (Direction ET Fonction)
    - "moderee" : un seul signal (peut être une promotion normale)
    Trie par priorité haute en premier.
    """
    dir_report = audit_matricule_direction_mismatch(data)
    fonction_report = audit_matricule_fonction_mismatch(data)

    dir_by_mat = {r["matricule"]: r for r in dir_report["mismatches"]}
    fonction_by_mat = {r["matricule"]: r for r in fonction_report["mismatches"]}

    all_matricules = set(dir_by_mat) | set(fonction_by_mat)
    combined = []
    for m in all_matricules:
        signaux = []
        if m in dir_by_mat:
            signaux.append({"type": "direction", **{
                k: v for k, v in dir_by_mat[m].items() if k != "matricule"
            }})
        if m in fonction_by_mat:
            signaux.append({"type": "fonction", **{
                k: v for k, v in fonction_by_mat[m].items() if k != "matricule"
            }})
        combined.append({
            "matricule": m,
            "nb_signaux": len(signaux),
            "confiance": "haute" if len(signaux) >= 2 else "moderee",
            "signaux": signaux,
        })

    combined.sort(key=lambda c: -c["nb_signaux"])
    return combined
