# -*- coding: utf-8 -*-
"""
Post-traitement du mémoire : ajoute sous CHAQUE figure et CHAQUE tableau un
paragraphe d'explication PÉDAGOGIQUE répondant à 3 questions :
  1. Qu'est-ce que c'est ? (ex. ce qu'est un diagramme de contexte)
  2. Pourquoi est-il présenté ici ?
  3. Que contient-il ?

Travaille sur la version éditée à la main (v6) et produit v7
(ne régénère PAS depuis l'original, afin de préserver les modifications).
"""
import re
import shutil
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SRC = Path(r"C:\Users\PC\Documents\blocktask_myself\rapport memoire\memoire de fin detude Master - FORMATE v6.docx")
DST = SRC.with_name("memoire de fin detude Master - FORMATE v7.docx")

NORMAL = "Normal"
CAPTION_STYLE = "Lgende"

SKIP_HEADERS = {"n°", "no", "n", "id", "#", "uc", "code", "réf", "ref", "n0", "nº"}

# Ouvertures reconnues -> permet de ne pas réinsérer une explication (idempotence)
FIG_OPENERS = ("Un diagramme", "Cette figure", "Cette capture", "Ce schéma")


def w_tag(tag):
    return qn(f"w:{tag}")


def make_run(text="", italic=False):
    r = OxmlElement("w:r")
    if italic:
        rPr = OxmlElement("w:rPr")
        rPr.append(OxmlElement("w:i"))
        r.append(rPr)
    t = OxmlElement("w:t")
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    r.append(t)
    return r


def get_style(el):
    pPr = el.find(w_tag("pPr"))
    if pPr is None:
        return NORMAL
    ps = pPr.find(w_tag("pStyle"))
    return ps.get(w_tag("val")) if ps is not None else NORMAL


def set_style(el, style_id):
    pPr = el.find(w_tag("pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        el.insert(0, pPr)
    ps = pPr.find(w_tag("pStyle"))
    if ps is None:
        ps = OxmlElement("w:pStyle")
        pPr.insert(0, ps)
    ps.set(w_tag("val"), style_id)


def set_jc(el, val):
    pPr = el.find(w_tag("pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        el.insert(0, pPr)
    jc = pPr.find(w_tag("jc"))
    if jc is None:
        jc = OxmlElement("w:jc")
        pPr.append(jc)
    jc.set(w_tag("val"), val)


def ptext(el):
    return "".join(t.text or "" for t in el.findall(".//" + w_tag("t"))).strip()


def is_p(el):
    return el.tag.split("}")[-1] == "p"


def is_tbl(el):
    return el.tag.split("}")[-1] == "tbl"


def make_para(text, italic=False):
    el = OxmlElement("w:p")
    set_style(el, NORMAL)
    set_jc(el, "both")
    el.append(make_run(text, italic=italic))
    return el


# ---------------------------------------------------------------------------
# Helpers tableau (réutilisés du script principal)
# ---------------------------------------------------------------------------
def _cell_text(tc):
    parts = []
    for p in tc.findall(".//" + w_tag("p")):
        t = "".join(x.text or "" for x in p.findall(".//" + w_tag("t"))).strip()
        if t:
            parts.append(t)
    return " ".join(parts)


def _table_rows(tbl):
    trs = tbl.findall(w_tag("tr"))
    if len(trs) == 1:
        tcs = trs[0].findall(w_tag("tc"))
        if len(tcs) == 1:
            inner = tcs[0].find(w_tag("tbl"))
            if inner is not None:
                return _table_rows(inner)
    return [[_cell_text(tc) for tc in tr.findall(w_tag("tc"))] for tr in trs]


def _french_join(items):
    items = [i for i in items if i]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " et " + items[-1]


def _french_enum(items, limit=10):
    if len(items) <= limit:
        return _french_join(items)
    return ", ".join(items[:limit]) + ", etc."


def _pluralize(word):
    w = word.strip()
    if not w or w.endswith(("s", "x", "z")):
        return w
    if w.endswith(("eau", "au", "eu")):
        return w + "x"
    return w + "s"


def _lower_first(s):
    s = s.strip()
    if not s:
        return s
    if s[:2].isupper():
        return s
    return s[0].lower() + s[1:]


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _is_codey(vals):
    if not vals:
        return True
    c = sum(1 for v in vals if re.fullmatch(r"[\d.\-–—/]+", v) or len(v) <= 3)
    return c / len(vals) > 0.6


def table_listing(tbl_elem, title, lead):
    """Phrase décrivant le contenu réel du tableau (éléments couverts)."""
    rows = _table_rows(tbl_elem)
    headers = rows[0] if rows else []
    data = rows[1:] if len(rows) > 1 else []
    ncols = len(headers)

    candidates = [
        i for i, h in enumerate(headers) if h.strip().lower() not in SKIP_HEADERS
    ] or list(range(ncols))
    label_idx = candidates[0]
    for i in candidates:
        vals = [r[i].strip() for r in data if len(r) > i and r[i].strip()]
        if not _is_codey(vals):
            label_idx = i
            break

    items = _dedupe(
        r[label_idx].strip()
        for r in data
        if len(r) > label_idx and r[label_idx].strip()
        and not re.fullmatch(r"[\d.\-–—/\s]+", r[label_idx].strip())
    )
    subj = (headers[label_idx].strip().lower() if headers else "élément") or "élément"
    others = [
        headers[i].strip().lower()
        for i in range(ncols)
        if i != label_idx
        and headers[i].strip()
        and headers[i].strip().lower() not in SKIP_HEADERS
    ]
    n = len(items)
    avglen = (sum(len(x) for x in items) / n) if n else 0

    if n >= 1 and avglen <= 34:
        listing = _french_enum(items, 10)
        if others:
            return (
                f"{lead} passe en revue {n} {_pluralize(subj)} — {listing} — "
                f"en précisant à chaque fois {_french_join(others)}."
            )
        return f"{lead} énumère {n} {_pluralize(subj)} : {listing}."
    if others:
        return (
            f"{lead} détaille, pour chaque {subj}, {_french_join(others)}, "
            "afin d'en restituer le contenu sans avoir à le parcourir ligne à ligne."
        )
    return f"{lead} récapitule les éléments essentiels abordés dans cette section."


def table_type_intro(title):
    """Renvoie (intro, pronom) — « ce que c'est + pourquoi » selon le type.
    Le pronom (Il/Elle) sert à enchaîner la phrase de contenu sans répéter
    « tableau » et en respectant l'accord."""
    t = title.lower()
    if "comparais" in t or "comparatif" in t:
        return ("Ce tableau comparatif met en regard plusieurs solutions selon des "
                "critères communs afin d'en faire ressortir les différences et de "
                "situer BlockTask par rapport à elles. ", "Il")
    if "traçabilité" in t or "tracabilite" in t or "matrice" in t:
        return ("Cette matrice de traçabilité relie deux ensembles d'éléments afin "
                "de vérifier que chacun est bien couvert par l'autre. ", "Elle")
    if "exigences non" in t:
        return ("Ce tableau recense les exigences non fonctionnelles, c'est-à-dire "
                "les contraintes de qualité attendues du système (performance, "
                "sécurité, fiabilité, etc.). ", "Il")
    if "exigences" in t:
        return ("Ce tableau recense les exigences fonctionnelles, c'est-à-dire les "
                "services que le système doit rendre à ses utilisateurs. ", "Il")
    if "scénario" in t or "scenario" in t:
        return ("Ce tableau décrit pas à pas un scénario d'utilisation du système, "
                "en détaillant l'enchaînement des actions et des résultats attendus. ",
                "Il")
    if "règles de gestion" in t or "regles de gestion" in t:
        return ("Ce tableau formalise les règles de gestion, c'est-à-dire les "
                "contraintes métier que le système doit respecter. ", "Il")
    if "glossaire" in t:
        return ("Ce tableau constitue le glossaire : il définit les principaux "
                "termes techniques employés dans le mémoire. ", "Il")
    return ("", "Il")  # type générique : pas d'introduction conceptuelle


# ---------------------------------------------------------------------------
# Explications de figures (selon le type)
# ---------------------------------------------------------------------------
def figure_explanation(caption_full):
    m = re.match(r"^Figure\s+[\d.]+\s*[—-]\s*(.+)$", caption_full)
    desc = (m.group(1) if m else caption_full).strip()
    low = desc.lower()
    parts = [s.strip() for s in desc.split("—") if s.strip()]
    subject = parts[-1] if len(parts) > 1 else ""
    desc_flat = desc.replace(" — ", ", ")

    if "contexte" in low:
        return ("Un diagramme de contexte correspond au premier niveau du modèle "
                "C4 : il représente le système étudié comme une seule boîte et le "
                "place au centre de son environnement, entouré des acteurs et des "
                "systèmes externes avec lesquels il échange. Il est présenté ici "
                "pour délimiter clairement le périmètre de BlockTask avant d'en "
                "détailler le fonctionnement interne. La figure fait apparaître la "
                "plateforme au centre, les différents profils d'utilisateurs ainsi "
                "que les services externes (Mobile Money, réseau blockchain, "
                "notifications) et les principaux flux qui les relient.")
    if "conteneurs" in low:
        return ("Un diagramme de conteneurs constitue le deuxième niveau du modèle "
                "C4 : il décompose le système en grandes unités exécutables "
                "(applications, services, bases de données) et précise les "
                "technologies utilisées ainsi que les modes de communication entre "
                "elles. Il intervient ici pour donner une vue technique d'ensemble "
                "de l'architecture de BlockTask. On y distingue notamment "
                "l'application frontend, l'API backend, la base de données et la "
                "couche blockchain, reliées par leurs protocoles d'échange.")
    if "composants" in low:
        return ("Un diagramme de composants correspond au troisième niveau du "
                "modèle C4 : il ouvre l'un des conteneurs pour montrer les modules "
                "internes qui le composent et leurs dépendances. Il est utilisé ici "
                "pour exposer l'organisation interne du backend Django. La figure "
                "présente les principaux modules applicatifs (utilisateurs, "
                "missions, paiements, etc.) et la façon dont ils s'appuient les uns "
                "sur les autres.")
    if "utilisation" in low:
        return ("Un diagramme de cas d'utilisation est un diagramme UML qui "
                "recense, du point de vue des utilisateurs, les fonctionnalités "
                "offertes par le système sans en décrire la réalisation technique. "
                "Il sert ici à formaliser les besoins fonctionnels et à rattacher "
                "chaque acteur aux actions qu'il peut effectuer. La figure relie les "
                "acteurs de BlockTask (client, prestataire, entreprise, "
                "administrateur) aux cas d'utilisation qui leur sont accessibles.")
    if "classes" in low:
        return ("Un diagramme de classes est un diagramme UML qui décrit la "
                "structure statique du système : les classes, leurs attributs et "
                "les relations qui les unissent (association, héritage, "
                "composition). Il figure ici pour présenter le modèle de données du "
                "domaine métier. On y retrouve les entités centrales de BlockTask "
                "(utilisateur, mission, paiement, preuve, etc.) et les liens qui les "
                "associent.")
    if "quence" in low:  # séquence
        cible = f" « {subject} »" if subject else " le scénario considéré"
        return ("Un diagramme de séquence est un diagramme UML qui montre, dans "
                "l'ordre chronologique, les messages échangés entre les "
                f"participants d'un scénario. Il est employé ici pour détailler{cible}. "
                "La figure ordonne les interactions entre les acteurs et les "
                "composants concernés, depuis le déclenchement de l'action jusqu'à "
                "son aboutissement.")
    if "activit" in low:  # activité
        return ("Un diagramme d'activité est un diagramme UML qui représente un "
                "processus sous la forme d'un enchaînement d'actions, avec ses "
                "choix, ses conditions et ses points de synchronisation. Il est "
                "présenté ici pour décrire le processus complet d'une mission. La "
                "figure suit le cheminement des étapes et des décisions, du début à "
                "la fin du flux.")
    if "états" in low or "etats" in low:
        return ("Un diagramme d'états est un diagramme UML qui modélise les "
                "différents états successifs que peut prendre un objet et les "
                "événements qui provoquent le passage de l'un à l'autre. Il "
                "intervient ici pour représenter le cycle de vie d'une mission. La "
                "figure énumère les états (publiée, acceptée, en cours, preuves, "
                "terminée, etc.) et les transitions déclenchées par les actions des "
                "utilisateurs.")
    if "ploiement" in low:  # déploiement
        return ("Un diagramme de déploiement est un diagramme UML qui montre la "
                "répartition des composants logiciels sur l'infrastructure "
                "matérielle (serveurs, conteneurs, nœuds) et les liaisons réseau "
                "entre eux. Il est utilisé ici pour décrire l'environnement "
                "d'exécution du prototype. La figure positionne les différents "
                "artefacts logiciels sur leurs supports matériels respectifs.")
    if "architecture globale" in low:
        return ("Cette figure propose une vue d'ensemble de l'architecture du "
                "projet BlockTask. Elle est présentée pour offrir une "
                "représentation synthétique de l'organisation générale du système "
                "avant d'en détailler chaque couche. On y distingue les grands blocs "
                "fonctionnels (frontend, backend, blockchain, services externes) et "
                "la manière dont ils s'articulent.")
    if "arborescence" in low or "structure du" in low or "organisation par" in low:
        quoi = _lower_first(subject) if subject else "l'arborescence du projet"
        return (f"Cette figure présente l'organisation du code source ({quoi}). "
                "Elle est incluse pour rendre concrète la structuration retenue et "
                "faciliter la lecture de la base de code. On y voit la hiérarchie des "
                "dossiers et des fichiers ainsi que leur regroupement par "
                "responsabilité.")
    if "schéma" in low or "schema" in low or "récapitulatif" in low:
        return ("Cette figure récapitule sous forme de schéma les éléments abordés "
                "dans la section. Elle est proposée pour offrir une synthèse "
                "visuelle qui facilite la compréhension et la mémorisation. On y "
                "retrouve les points clés et les liens qui les unissent.")
    if "capture" in low:
        if any(k in low for k in ("upwork", "fiverr", "taskrabbit", "plateforme", "interface")):
            return ("Cette capture d'écran présente l'interface réelle de la "
                    "plateforme concernée. Elle est reproduite ici à titre "
                    "d'illustration pour appuyer l'analyse comparative des solutions "
                    "existantes. On y observe les éléments d'interface et les "
                    "fonctionnalités discutés dans le texte.")
        return ("Cette capture présente les résultats d'exécution de la suite de "
                "tests automatisés. Elle est fournie comme preuve d'exécution à "
                "l'appui des résultats annoncés. On y lit le détail des tests "
                "exécutés ainsi que leur statut global.")
    # Sinon : capture d'écran de l'application (chapitre 4)
    return (f"Cette capture d'écran montre l'écran « {desc_flat} » de "
            "l'application BlockTask. Elle est présentée pour illustrer "
            "concrètement la mise en œuvre des fonctionnalités décrites dans cette "
            "section. On y observe l'interface réelle telle qu'elle apparaît à "
            "l'utilisateur.")


def main():
    if not SRC.exists():
        raise SystemExit(f"Introuvable : {SRC}")
    shutil.copy2(SRC, DST)
    doc = Document(str(DST))
    body = doc.element.body
    children = list(body.iterchildren())

    fig_added = fig_skipped = 0
    tbl_done = tbl_inserted = 0

    for i, el in enumerate(children):
        if not is_p(el) or get_style(el) != CAPTION_STYLE:
            continue
        txt = ptext(el)

        if txt.startswith("Figure"):
            nxt = children[i + 1] if i + 1 < len(children) else None
            nxt_txt = ptext(nxt) if (nxt is not None and is_p(nxt)) else ""
            if nxt_txt.startswith(FIG_OPENERS):
                fig_skipped += 1
                continue
            el.addnext(make_para(figure_explanation(txt)))
            fig_added += 1

        elif txt.startswith("Tableau"):
            m = re.match(r"^Tableau\s+[\d.]+\s*[—-]\s*(.+)$", txt)
            title = (m.group(1) if m else txt).strip()
            tbl = None
            for j in range(i + 1, min(i + 3, len(children))):
                if is_tbl(children[j]):
                    tbl = children[j]
                    tbl_index = j
                    break
            if tbl is None:
                continue
            intro, pron = table_type_intro(title)
            if intro:
                content = intro + table_listing(tbl, title, pron)
            else:
                content = table_listing(tbl, title, f"Le tableau « {title} »")

            # Cherche le paragraphe d'explication existant après le tableau
            expl = None
            for j in range(tbl_index + 1, min(tbl_index + 3, len(children))):
                e2 = children[j]
                if is_p(e2) and (
                    ptext(e2).startswith("Le tableau «")
                    or ptext(e2).startswith("Ce tableau")
                    or ptext(e2).startswith("Cette matrice")
                ):
                    expl = e2
                    break
            if expl is not None:
                for r in expl.findall(w_tag("r")):
                    expl.remove(r)
                set_style(expl, NORMAL)
                set_jc(expl, "both")
                expl.append(make_run(content))
                tbl_done += 1
            else:
                tbl.addnext(make_para(content))
                tbl_inserted += 1

    doc.save(str(DST))
    print("=== TERMINE ===")
    print(f"Fichier : {DST}")
    print(f"Figures expliquees : {fig_added} (deja faites : {fig_skipped})")
    print(f"Tableaux : {tbl_done} explications mises a jour, {tbl_inserted} inserees")


if __name__ == "__main__":
    main()
