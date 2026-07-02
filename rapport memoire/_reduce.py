# -*- coding: utf-8 -*-
"""Reduction de taille du memoire : v7 -> v8.
Phase A : suppression des paragraphes boilerplate auto-generes.
Phase B : suppression / conversion en prose de tableaux.
Phase C : reduction des captures d'ecran (20 -> ~12).
Le script repart TOUJOURS d'une copie fraiche de la v7 (idempotent)."""
import shutil
import sys
import docx
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding="utf-8")

SRC = "memoire de fin detude Master - FORMATE v7.docx"
DST = "memoire de fin detude Master - FORMATE v8.docx"
XMLSPACE = "{http://www.w3.org/XML/1998/namespace}space"


def ptext(p):
    return "".join(t.text or "" for t in p.findall(".//" + qn("w:t")))


def style_of(p):
    pPr = p.find(qn("w:pPr"))
    if pPr is None:
        return "Normal"
    s = pPr.find(qn("w:pStyle"))
    return s.get(qn("w:val")) if s is not None else "Normal"


def is_p(el):
    return el.tag.split("}")[-1] == "p"


def is_tbl(el):
    return el.tag.split("}")[-1] == "tbl"


def has_drawing(p):
    return bool(p.findall(".//" + qn("w:drawing")) or p.findall(".//" + qn("w:pict")))


def make_para(text, style="Normal", jc="both", italic=False):
    p = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    st = OxmlElement("w:pStyle")
    st.set(qn("w:val"), style)
    pPr.append(st)
    if jc:
        j = OxmlElement("w:jc")
        j.set(qn("w:val"), jc)
        pPr.append(j)
    p.append(pPr)
    r = OxmlElement("w:r")
    if italic:
        rPr = OxmlElement("w:rPr")
        rPr.append(OxmlElement("w:i"))
        r.append(rPr)
    t = OxmlElement("w:t")
    t.set(XMLSPACE, "preserve")
    t.text = text
    r.append(t)
    p.append(r)
    return p


def rebuild_para(p, newtext):
    """Remplace tout le contenu runs d'un paragraphe par un texte unique."""
    for r in p.findall(qn("w:r")):
        p.remove(r)
    rr = OxmlElement("w:r")
    t = OxmlElement("w:t")
    t.set(XMLSPACE, "preserve")
    t.text = newtext
    rr.append(t)
    p.append(rr)


def caption_before(tbl):
    """Renvoie le paragraphe de legende (style Lgende) precedant le tableau."""
    prev = tbl.getprevious()
    while prev is not None and is_p(prev) and not ptext(prev).strip():
        prev = prev.getprevious()
    if prev is not None and is_p(prev) and style_of(prev) == "Lgende":
        return prev
    return None


# ---------------------------------------------------------------------------
shutil.copy2(SRC, DST)
doc = docx.Document(DST)
body = doc.element.body

# === PHASE A : suppression des paragraphes boilerplate ====================
BOILER = [
    "passe en revue",
    "afin d'en restituer le contenu",
    "récapitule les éléments essentiels",
    "met en regard plusieurs solutions",
    "décrit pas à pas un scénario",
    "formalise les règles de gestion",
    "recense les exigences",
    "relie deux ensembles d'éléments",
    "constitue le glossaire",
]
BOILER_PREFIX = (
    "Un diagramme",
    "Cette capture d'écran",
    "Ces captures d'écran",
    "Cette figure",
    "Ici on",
    "Cette matrice de traçabilité",
    "Ce tableau comparatif met",
)
removed_boiler = 0
for child in list(body.iterchildren()):
    if not is_p(child):
        continue
    if style_of(child) in ("Titre1", "Titre2", "Titre3", "Lgende"):
        continue
    txt = ptext(child).strip()
    if not txt:
        continue
    if any(b in txt for b in BOILER) or txt.startswith(BOILER_PREFIX):
        body.remove(child)
        removed_boiler += 1

# === PHASE B : suppression / conversion de tableaux =======================
# Suppression pure (le texte equivalent existe deja a proximite)
DELETE = [
    "Organisation du mémoire — Chapitres et contenu",
    "Scénario 1 — Inscription, KYC et première",
    "Scénario 2 — Création de mission et paiement escrow",
    "Scénario 3 — Candidature, acceptation et caution",
    "Scénario 4 — Exécution, preuves et suivi",
    "Scénario 5 — Validation client et libération",
    "Scénario 6 — Litige et arbitrage administrateur",
    "Scénario 7 — Gestion entreprise (B2B)",
    "Scénario manuel SC2",
    "Scénario manuel SC3",
    "Scénario manuel SC4",
    "Scénario manuel SC5",
    "Scénario manuel SC6",
    "Scénario manuel SC7",
]
# Conversion en prose : caption-substr -> paragraphe(s) de remplacement
CONVERT = {
    "Outils et technologies de développement": [
        "Les principaux outils retenus sont Python/Django (backend), TypeScript/Angular "
        "(frontend), Solidity/Hardhat (smart contracts), PostgreSQL (données), Redis et "
        "Django Channels (temps réel), Docker (conteneurisation), pytest et Hardhat "
        "(tests), ainsi que Git pour le versionnement. Ils sont détaillés au chapitre 4."
    ],
    "Composants matériels et logiciels — Versions minimales": [
        "Le développement requiert au minimum Python 3.11+, Node.js 18+, PostgreSQL 14+, "
        "Redis 6+ et Git, sur un poste de travail standard sous Windows 10/11."
    ],
    "Bibliothèques smart contracts": [
        "Côté smart contracts, le projet s'appuie sur Hardhat (compilation, tests et "
        "déploiement), OpenZeppelin Contracts 4.9 (briques de sécurité réutilisables) et "
        "dotenv (gestion des variables d'environnement)."
    ],
    "Fonctions EscrowContract Solidity": [
        "Le contrat EscrowContract expose cinq fonctions principales reflétant le cycle "
        "métier : createMission (création et financement), acceptMission (acceptation par "
        "le prestataire), submitProof (soumission de preuve), validateMission (validation "
        "et libération des fonds) et cancelMission (annulation)."
    ],
    "API d'enregistrement blockchain": [
        "Côté backend, des endpoints d'enregistrement (record-mission, record-proof, "
        "record-validation, etc.) tracent off-chain les transactions on-chain afin de "
        "synchroniser l'état Django avec la blockchain et d'alimenter le tableau de bord "
        "administrateur."
    ],
    "Configuration blockchain par environnement": [
        "Trois environnements blockchain sont supportés : Hardhat local (développement et "
        "tests rapides), le testnet Sepolia (démonstration réaliste) et la VM Remix "
        "(prototypage), la propagation des adresses de contrats étant automatisée par le "
        "script apply-config.js."
    ],
    "Fixtures communes (conftest.py)": [
        "Des fixtures communes (conftest.py) fournissent un client, un prestataire et une "
        "mission financée prêts à l'emploi, sur une base SQLite en mémoire pour garantir "
        "l'isolation et la rapidité des tests."
    ],
    "Tests du flux MVP (pytest)": [],  # detail deja en prose juste apres
    "Tests KYC et accès plateforme": [
        "Les tests KYC vérifient que l'accès à la plateforme est correctement conditionné "
        "au statut d'identité : un compte non vérifié (incomplet, en attente ou rejeté) "
        "est bloqué, tandis qu'un compte vérifié accède aux fonctionnalités. Ils valident "
        "EF02, ENF02 et la règle RG06."
    ],
    "Tests rôles doubles": [
        "Les tests de rôles doubles confirment qu'un prestataire reçoit automatiquement le "
        "rôle secondaire client, qu'il peut basculer vers l'espace client, et qu'un client "
        "peut activer le rôle prestataire. Ils valident EF01 (gestion multi-rôles)."
    ],
    "Tests EscrowContract (Hardhat)": [
        "Les cinq tests EscrowContract valident le cycle escrow on-chain : création de "
        "mission, acceptation, soumission de preuve, validation avec libération des fonds "
        "et annulation, ainsi que les contrôles d'accès associés."
    ],
    "Tests ReputationContract (Hardhat)": [
        "Les cinq tests ReputationContract vérifient l'enregistrement et la mise à jour des "
        "scores de réputation on-chain, la cohérence des moyennes et la résistance aux "
        "appels non autorisés."
    ],
    "Tests LitigationContract (Hardhat)": [
        "Les cinq tests LitigationContract couvrent l'ouverture d'un litige, l'interdiction "
        "de deux litiges pour une même mission, la soumission de preuves, la décision de "
        "l'arbitre et la détection d'un litige actif. Ils valident EF12 et la cohérence "
        "avec le modèle de réputation (RG09)."
    ],
    "Environnement de test": [
        "L'environnement de test combine une base SQLite en mémoire (backend), le réseau "
        "Hardhat local (contrats), le mode sandbox Mobile Money (OTP 1234) et le frontend "
        "Angular en mode développement."
    ],
    "Mesures de sécurité — Authentification": [
        "L'authentification repose sur le hachage des mots de passe (PBKDF2 de Django), une "
        "API stateless par jetons JWT à durée limitée (access 1 h, refresh 7 j avec "
        "rotation), l'historisation des connexions et une 2FA préparée pour une évolution "
        "future."
    ],
    "Mécanismes de sécurité des smart contracts": [
        "Les contrats héritent des briques OpenZeppelin : ReentrancyGuard (modificateur "
        "nonReentrant) contre la réentrance, Ownable pour restreindre les actions "
        "sensibles, Pausable pour l'arrêt d'urgence, un plafond de commission et une "
        "fonction emergencyWithdraw."
    ],
    "Services Docker Compose": [
        "Le fichier docker-compose.yml orchestre cinq services : la base PostgreSQL (db), "
        "le cache Redis, le backend Django, le frontend Angular et le worker Celery."
    ],
    "Langages de programmation utilisés": [
        "Le projet mobilise plusieurs langages, chacun sur la couche la plus adaptée : "
        "Python 3.11 (backend Django), TypeScript (frontend Angular), Solidity 0.8 "
        "(smart contracts), JavaScript (scripts Hardhat et Web3), SQL (PostgreSQL) et "
        "HTML/SCSS (interfaces)."
    ],
    "Pages administrateur Angular": [
        "L'espace administrateur regroupe sept pages Angular : tableau de bord, gestion "
        "des utilisateurs, validation des dossiers KYC, gestion des litiges, supervision "
        "blockchain, paramètres de la plateforme et analytics."
    ],
    "Modèle hybride Mali — Flux et implémentation": [
        "Concrètement, le paiement réel s'effectue en FCFA via Orange Money / Moov Money "
        "(sandbox), la logique métier et la caution sont gérées off-chain, l'ancrage "
        "blockchain reste optionnel, et la configuration marché (devise, indicatif, villes) "
        "ainsi que les paramètres administrables adaptent la plateforme au contexte malien."
    ],
}

del_titles = list(DELETE)
conv_titles = dict(CONVERT)
removed_tbl = 0
converted_tbl = 0
for tbl in list(body.findall(qn("w:tbl"))):
    cap = caption_before(tbl)
    captxt = ptext(cap) if cap is not None else ""
    # suppression pure ?
    matched = next((d for d in del_titles if d in captxt), None)
    if matched:
        if cap is not None:
            body.remove(cap)
        body.remove(tbl)
        removed_tbl += 1
        continue
    # conversion en prose ?
    convkey = next((k for k in conv_titles if k in captxt), None)
    if convkey is not None:
        for para_txt in conv_titles[convkey]:
            tbl.addprevious(make_para(para_txt))
        if cap is not None:
            body.remove(cap)
        body.remove(tbl)
        converted_tbl += 1

# === PHASE C : reduction des captures d'ecran =============================
SS_KEEP = [
    "Page d'accueil publique",
    "Inscription en trois étapes",
    "Tableau de bord du client",
    "Création d'une mission via l'assistant",
    "Tableau de bord prestataire — revenus",
    "Détail d'une mission assignée",
    "Itinéraire, sécurisation escrow",
    "Tableau de bord de l'administrateur",
    "validation des dossiers KYC",
    "transactions blockchain et escrow",
]
SS_ALL = [
    "Page d'accueil publique", "Comment ça marche", "Inscription en trois",
    "Page de connexion", "Tableau de bord du client", "Création d'une mission",
    "Attribution directe", "Centre de notifications", "Profil utilisateur et vérification",
    "Tableau de bord prestataire", "Liste des missions assignées",
    "Détail d'une mission assignée", "Itinéraire, sécurisation escrow",
    "Tableau de bord de l'administrateur", "gestion des utilisateurs",
    "supervision des missions", "validation des dossiers KYC",
    "paramètres de la plateforme", "transactions blockchain et escrow",
]
removed_ss = 0
for cap in list(body.findall(qn("w:p"))):
    if style_of(cap) != "Lgende":
        continue
    txt = ptext(cap)
    if not any(s in txt for s in SS_ALL):
        continue
    if any(k in txt for k in SS_KEEP):
        continue
    # supprimer : la legende + le paragraphe image precedent + un eventuel label ":"
    img = cap.getprevious()
    while img is not None and is_p(img) and not ptext(img).strip() and not has_drawing(img):
        img = img.getprevious()
    label = None
    if img is not None and is_p(img) and has_drawing(img):
        prev = img.getprevious()
        if prev is not None and is_p(prev):
            ptxt = ptext(prev).strip()
            if ptxt.endswith(":") and len(ptxt) < 60:
                label = prev
    body.remove(cap)
    if img is not None and has_drawing(img):
        body.remove(img)
    if label is not None:
        body.remove(label)
    removed_ss += 1

# === PHASE D : consolidation des sauts de page ===========================
# Retirer TOUS les sauts de page manuels (br type=page) et pageBreakBefore...
removed_br = 0
for br in list(body.findall(".//" + qn("w:br"))):
    if br.get(qn("w:type")) == "page":
        par = br.getparent()
        par.remove(br)
        removed_br += 1
for pbb in list(body.findall(".//" + qn("w:pageBreakBefore"))):
    pbb.getparent().remove(pbb)

# ... puis n'en remettre QU'avant les chapitres et les sections liminaires.
LIMINAIRE = (
    "DÉDICACE", "REMERCIEMENTS", "RÉSUMÉ", "ABSTRACT",
    "LISTE DES ABREVIATION", "LISTE DES FIGURES", "LISTE DES TABLEAUX",
)


def set_pbb(p):
    pPr = p.find(qn("w:pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        p.insert(0, pPr)
    if pPr.find(qn("w:pageBreakBefore")) is None:
        pPr.insert(0, OxmlElement("w:pageBreakBefore"))


added_pb = 0
first_para_seen = False
for child in body.iterchildren():
    if not is_p(child):
        continue
    txt = ptext(child).strip()
    if not txt:
        continue
    up = txt.upper().replace("\xa0", " ")
    is_break_target = style_of(child) == "Titre1" or any(up.startswith(l) for l in LIMINAIRE)
    if not first_para_seen:
        first_para_seen = True
        continue  # jamais de saut avant le tout premier paragraphe (DEDICACE)
    if is_break_target:
        set_pbb(child)
        added_pb += 1

# === PHASE E : redimensionnement des images surdimensionnees =============
from docx.shared import Cm

MAXH = int(Cm(12))
MAXW = int(Cm(15.5))
resized = 0
for dr in body.findall(".//" + qn("w:drawing")):
    ext = dr.find(".//" + qn("wp:extent"))
    if ext is None:
        continue
    cx = int(ext.get("cx"))
    cy = int(ext.get("cy"))
    scale = 1.0
    if cy > MAXH:
        scale = min(scale, MAXH / cy)
    if cx * scale > MAXW:
        scale = min(scale, MAXW / cx)
    if scale >= 0.999:
        continue
    targets = dr.findall(".//" + qn("wp:extent")) + dr.findall(".//" + qn("a:ext"))
    for e in targets:
        ecx, ecy = e.get("cx"), e.get("cy")
        if ecx is None or ecy is None:
            continue
        e.set("cx", str(int(int(ecx) * scale)))
        e.set("cy", str(int(int(ecy) * scale)))
    resized += 1

# === PHASE F : corrections de fond (niveau run, preserve les exposants) ===
SUBST = [
    ("**", ""),
    ("ofBlockTask", "of BlockTask"),
    ("evaluation ofBlockTask", "evaluation of BlockTask"),
    ("le très haut", "le Très-Haut"),
    ("MAIGA ,", "MAIGA,"),
    ("ITMA ,", "ITMA,"),
    ("ce jour .", "ce jour."),
    ("Dr Oumar MAIGA ,", "Dr Oumar MAIGA,"),
    ("selon le budget et la réputation", "selon la réputation du prestataire"),
    ("Chainlink (Benetton et al., 2020)", "Chainlink (Ellis, Juels & Nazarov, 2017)"),
    ("l'échelle nationale maliennes", "l'échelle nationale malienne"),
    ("ne invalident pas", "n'invalident pas"),
    ("LISTE DES ABREVIATION", "LISTE DES ABRÉVIATIONS"),
]
subst_count = 0
for t in body.findall(".//" + qn("w:t")):
    if not t.text:
        continue
    for old, new in SUBST:
        if old in t.text:
            t.text = t.text.replace(old, new)
            subst_count += 1

# Reference Chainlink/Benetton -> Ellis et al. (runs fragmentes : niveau paragraphe)
for child in body.iterchildren():
    if is_p(child) and "Benetton" in ptext(child):
        full = ptext(child)
        new = full.replace("Benetton et al., 2020", "Ellis, Juels & Nazarov, 2017")
        if new != full:
            rebuild_para(child, new)
        break

# Ajout de la reference Chainlink dans la bibliographie (apres Caldarelli)
for child in body.iterchildren():
    if is_p(child) and "Caldarelli, G., et al. (2022)" in ptext(child):
        ref = make_para(
            "Ellis, S., Juels, A., & Nazarov, S. (2017). ChainLink: A Decentralized "
            "Oracle Network. https://chain.link/whitepaper"
        )
        child.addnext(ref)
        break


# === PHASE G : condensation de l'introduction (suppression de redites) ====
INTRO_DELETE = [
    "Parallèlement, les technologies de registre distribué",
    "Zone horaire et localisation",
]
intro_del = 0
for child in list(body.iterchildren()):
    if not is_p(child):
        continue
    txt = ptext(child).strip()
    if any(k in txt for k in INTRO_DELETE):
        body.remove(child)
        intro_del += 1

# === PHASE H : sous-section concise expiration / remboursement ============
expiry_added = 0
EXP_ANCHOR = "Règle des 4 heures"
EXP_TEXT = (
    "Expiration et remboursements (RG10). Lorsqu'une mission atteint son échéance sans "
    "avoir été menée à terme, deux cas sont distingués. Si aucun prestataire n'a été "
    "accepté, les fonds bloqués en escrow sont automatiquement remboursés au client et la "
    "mission passe à l'état « Expirée ». Si un prestataire est déjà assigné, le client "
    "dispose d'un délai pour prolonger l'échéance ou annuler ; en cas d'annulation (ou "
    "d'absence de décision), le fonds du client est remboursé, la caution du prestataire "
    "lui est restituée et la mission est clôturée. Cette logique est implémentée dans "
    "missions/services.py (process_expired_missions) et exécutée périodiquement par la "
    "commande de gestion expire_missions."
)
for child in body.iterchildren():
    if is_p(child) and EXP_ANCHOR in ptext(child):
        child.addnext(make_para(EXP_TEXT))
        expiry_added = 1
        break

# === PHASE I : interligne simple (1,0) en conservant un espace inter-paragraphe
def set_spacing(p, line="240", after="120"):
    pPr = p.find(qn("w:pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        p.insert(0, pPr)
    sp = pPr.find(qn("w:spacing"))
    if sp is None:
        sp = OxmlElement("w:spacing")
        pPr.append(sp)
    sp.set(qn("w:line"), line)
    sp.set(qn("w:lineRule"), "auto")
    sp.set(qn("w:after"), after)


# defaut du document (impacte aussi le texte des tableaux)
styles_el = doc.styles.element
dd = styles_el.find(qn("w:docDefaults"))
if dd is not None:
    pprd = dd.find(qn("w:pPrDefault"))
    if pprd is not None:
        ppr = pprd.find(qn("w:pPr"))
        if ppr is not None:
            sp = ppr.find(qn("w:spacing"))
            if sp is not None:
                sp.set(qn("w:line"), "240")
                sp.set(qn("w:lineRule"), "auto")
                sp.set(qn("w:after"), "120")

spaced = 0
for child in body.iterchildren():
    if not is_p(child):
        continue
    if style_of(child) in ("Titre1", "Titre2", "Titre3", "Lgende"):
        continue
    set_spacing(child)
    spaced += 1
# texte dans les tableaux
for tbl in body.findall(qn("w:tbl")):
    for p in tbl.findall(".//" + qn("w:p")):
        set_spacing(p)

doc.save(DST)
print("Phase A - paragraphes boilerplate supprimes :", removed_boiler)
print("Phase B - tableaux supprimes :", removed_tbl, "| convertis en prose :", converted_tbl)
print("Phase C - captures supprimees :", removed_ss)
print("Phase D - sauts de page retires :", removed_br, "| reinseres :", added_pb)
print("Phase E - images redimensionnees :", resized)
print("Phase F - corrections texte :", subst_count)
print("Phase G - paragraphes intro supprimes :", intro_del)
print("Phase H - section expiration ajoutee :", expiry_added)
print("Phase I - paragraphes interligne simple :", spaced)
print("Tableaux restants :", len(doc.tables))
print("Fichier :", DST)
