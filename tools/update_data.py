#!/usr/bin/env python3
"""Build the offline affix payload from paired PoE2DB locale pages."""

from __future__ import annotations

import html
import argparse
import json
import re
import tempfile
import urllib.request
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES = ROOT / "cache"
OUT = ROOT.parent / "affixes-data.js"

INCLUDED_CATEGORIES = {
    "Amulets", "Belts", "Body_Armours_dex", "Body_Armours_dex_int",
    "Body_Armours_int", "Body_Armours_str", "Body_Armours_str_dex",
    "Body_Armours_str_int", "Boots_dex", "Boots_dex_int", "Boots_int",
    "Boots_str", "Boots_str_dex", "Boots_str_int", "Bows", "Bucklers",
    "Claws", "Crossbows", "Daggers", "Flails", "Foci", "Gloves_dex",
    "Gloves_dex_int", "Gloves_int", "Gloves_str", "Gloves_str_dex",
    "Gloves_str_int", "Helmets_dex", "Helmets_dex_int", "Helmets_int",
    "Helmets_str", "Helmets_str_dex", "Helmets_str_int", "One_Hand_Axes",
    "One_Hand_Maces", "One_Hand_Swords", "Quarterstaves", "Quivers",
    "Rings", "Sceptres", "Shields_str", "Shields_str_dex",
    "Shields_str_int", "Spears", "Staves", "Two_Hand_Axes",
    "Two_Hand_Maces", "Two_Hand_Swords", "Wands",
}

SKIPPED_DOMAINS = {"socketable", "bonded"}
SIDE_NAMES = {"1": "prefix", "2": "suffix", "3": "special", "5": "special"}
DOMAIN_ORDER = [
    "normal", "desecrated", "essence", "abyss", "perfect_essence",
    "breach_otherworldly", "breach_minion", "breach_caster",
    "chronomancy", "marksman", "decay", "soul", "destruction", "berserking",
    "corruption_upgrade", "corrupted",
]
DOMAIN_LABELS = {
    "normal": ("基礎通貨詞綴", "一般增幅、富豪、混沌等基礎詞綴池"),
    "desecrated": ("褻瀆詞綴（深淵）", "深淵褻瀆機制的隨機專屬詞綴池"),
    "essence": ("精髓詞綴", "低階、一般與高階精髓的指定詞綴"),
    "abyss": ("深淵精髓詞綴", "深淵精髓指定的深淵領主印記；屬於必出詞綴"),
    "perfect_essence": ("完美精髓／合金詞綴", "完美精髓與合金可賦予的專屬詞綴"),
    "breach_otherworldly": ("異界裂痕詞綴", "Otherworldly 裂痕來源"),
    "breach_minion": ("裂痕召喚物詞綴", "Genesis Tree 召喚物分支"),
    "breach_caster": ("裂痕施法詞綴", "Genesis Tree 施法分支"),
    "chronomancy": ("時序系列詞綴", "特殊符文／合金來源"),
    "marksman": ("神射系列詞綴", "特殊符文／合金來源"),
    "decay": ("腐朽系列詞綴", "特殊符文／合金來源"),
    "soul": ("靈魂系列詞綴", "特殊符文／合金來源"),
    "destruction": ("毀滅系列詞綴", "特殊符文／合金來源"),
    "berserking": ("狂戰系列詞綴", "特殊符文／合金來源"),
    "corruption_upgrade": ("奉獻寶珠升級詞綴", "奉獻寶珠（Orb of Sacrifice）的特殊升級結果"),
    "corrupted": ("瓦爾腐化附魔", "瓦爾寶珠可能產生的附魔"),
}


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


class WhiteItemExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.capturing = False
        self.href = ""
        self.parts: list[str] = []
        self.items: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if not self.capturing and tag == "a" and "whiteitem" in (values.get("class") or "").lower().split():
            self.capturing = True
            self.href = values.get("href") or ""
            self.parts = []

    def handle_endtag(self, tag: str) -> None:
        if self.capturing and tag == "a":
            text = normalize(html.unescape("".join(self.parts)))
            if self.href and text:
                self.items.append((self.href, text))
            self.capturing = False

    def handle_data(self, data: str) -> None:
        if self.capturing:
            self.parts.append(data)


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().replace("–", "—")


def plain(markup: str | None) -> str:
    parser = TextExtractor()
    parser.feed(markup or "")
    return normalize(html.unescape("".join(parser.parts)))


def load_mods_view(path: Path) -> dict:
    source = path.read_text(encoding="utf-8")
    marker = "new ModsView("
    start = source.index(marker) + len(marker)
    return json.JSONDecoder().raw_decode(source[start:])[0]


def pattern_text(value: str) -> str:
    value = re.sub(r"\([^)]*\d[^)]*\)", "#", value)
    value = re.sub(r"[+-]?\d+(?:\.\d+)?(?:—-?\d+(?:\.\d+)?)?", "#", value)
    return normalize(value)


def safe_number(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def paired_anchors(us_path: Path, tw_path: Path) -> dict[str, str]:
    us_parser, tw_parser = WhiteItemExtractor(), WhiteItemExtractor()
    us_parser.feed(us_path.read_text(encoding="utf-8"))
    tw_parser.feed(tw_path.read_text(encoding="utf-8"))
    tw_by_href: dict[str, list[str]] = defaultdict(list)
    for href, text in tw_parser.items:
        tw_by_href[href].append(text)
    seen: dict[str, int] = defaultdict(int)
    result = {}
    for href, text in us_parser.items:
        position = seen[href]
        seen[href] += 1
        translations = tw_by_href.get(href, [])
        if position < len(translations) and text != translations[position]:
            result.setdefault(text, translations[position])
    return result


def source_name(record: dict) -> str:
    return plain(record.get("Name")) or plain(record.get("name"))


def effective_domain(domain: str, us_record: dict) -> str:
    if domain in {"essence", "perfect_essence"}:
        blob = " ".join([
            source_name(us_record),
            " ".join(us_record.get("ModFamilyList") or []),
            str(us_record.get("Code") or ""),
        ])
        if re.search(r"Abyss", blob, re.I):
            return "abyss"
    return domain


def build_category(category: str) -> tuple[dict[str, list[dict]], dict, dict[str, str]]:
    us_path, tw_path = PAGES / f"{category}-us.html", PAGES / f"{category}-tw.html"
    us, tw = load_mods_view(us_path), load_mods_view(tw_path)
    class_label = {
        "en": plain(us.get("baseitem", {}).get("link_name")) or category.replace("_", " "),
        "zh": plain(tw.get("baseitem", {}).get("link_name")) or category.replace("_", " "),
    }
    base_translations = paired_anchors(us_path, tw_path)
    grouped: dict[tuple, list[dict]] = defaultdict(list)

    for domain, us_records in us.items():
        if domain in SKIPPED_DOMAINS or not isinstance(us_records, list) or not us_records:
            continue
        tw_records = tw.get(domain)
        if not isinstance(tw_records, list) or len(us_records) != len(tw_records):
            continue
        for us_record, tw_record in zip(us_records, tw_records):
            side = SIDE_NAMES.get(str(us_record.get("ModGenerationTypeID")))
            if not side:
                continue
            actual_domain = effective_domain(domain, us_record)
            translated_text = plain(tw_record.get("str")) or plain(us_record.get("str"))
            family = "/".join(us_record.get("ModFamilyList") or []) or str(us_record.get("Code") or "")
            key = (actual_domain, side, family, pattern_text(translated_text))
            grouped[key].append({
                "ilvl": safe_number(us_record.get("Level")),
                "name": source_name(tw_record) or source_name(us_record),
                "text": translated_text,
                "textEn": plain(us_record.get("str")),
                "weight": safe_number(us_record.get("DropChance")),
            })

    domains: dict[str, list[dict]] = defaultdict(list)
    for (domain, side, family, pattern), tiers in grouped.items():
        tiers.sort(key=lambda tier: (tier["ilvl"], tier["text"], tier["name"]))
        unique, seen = [], set()
        for tier in tiers:
            identity = (tier["ilvl"], tier["text"], tier["textEn"], tier["name"], tier["weight"])
            if identity not in seen:
                seen.add(identity)
                unique.append(tier)
        for position, tier in enumerate(unique):
            tier["tier"] = len(unique) - position
        domains[domain].append({
            "side": side, "family": family, "text": pattern, "tiers": unique,
        })
    for groups in domains.values():
        groups.sort(key=lambda group: (group["side"], group["text"]))
    return dict(domains), class_label, base_translations


def download_pages(target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    total = len(INCLUDED_CATEGORIES) * 2
    completed = 0
    for category in sorted(INCLUDED_CATEGORIES):
        for locale in ("us", "tw"):
            completed += 1
            url = f"https://poe2db.tw/{locale}/{category}"
            print(f"[{completed:02d}/{total}] {url}")
            request = urllib.request.Request(url, headers={"User-Agent": "POE2-TW-Affix-Viewer/1.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read()
            if b"new ModsView(" not in content:
                raise RuntimeError(f"PoE2DB 頁面格式不符，已停止更新：{url}")
            (target / f"{category}-{locale}.html").write_bytes(content)


def main() -> None:
    global PAGES
    parser = argparse.ArgumentParser(description="更新 POE2 繁中詞綴查看器資料")
    parser.add_argument("--source-dir", type=Path, help="使用已下載的 PoE2DB 頁面（開發／離線驗證用）")
    args = parser.parse_args()
    if args.source_dir:
        PAGES = args.source_dir.resolve()
        build_payload()
        return
    print("正在下載 PoE2DB 最新的英文／繁中詞綴頁面…")
    with tempfile.TemporaryDirectory(prefix="poe2-affix-update-") as temporary:
        PAGES = Path(temporary)
        download_pages(PAGES)
        build_payload()


def build_payload() -> None:
    categories, class_labels, base_translations = {}, {}, {}
    domain_counts = defaultdict(int)
    tier_count = 0
    for category in sorted(INCLUDED_CATEGORIES):
        domains, label, bases = build_category(category)
        categories[category] = domains
        class_labels[category] = label
        base_translations.update(bases)
        for domain, groups in domains.items():
            domain_counts[domain] += len(groups)
            tier_count += sum(len(group["tiers"]) for group in groups)

    labels = {}
    ordered_domains = DOMAIN_ORDER + sorted(set(domain_counts) - set(DOMAIN_ORDER))
    for domain in ordered_domains:
        if domain not in domain_counts:
            continue
        title, description = DOMAIN_LABELS.get(domain, (domain.replace("_", " ").title(), "特殊來源詞綴"))
        labels[domain] = {"title": title, "description": description}

    payload = {
        "meta": {
            "source": "XileHUD parser/category model + PoE2DB paired US/TW ModsView data",
            "classLabels": class_labels,
            "baseTranslations": base_translations,
            "domainLabels": labels,
            "domainOrder": [name for name in ordered_domains if name in domain_counts],
            "totalTiers": tier_count,
        },
        "categories": categories,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    temporary_output = OUT.with_suffix(".js.new")
    temporary_output.write_text(
        "/* Generated from paired PoE2DB US/TW records. */\nwindow.POE2_AFFIX_DATA="
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    temporary_output.replace(OUT)
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024 / 1024:.2f} MiB)")
    print(f"Categories: {len(categories)}; tiers: {tier_count}; base translations: {len(base_translations)}")
    print("Domains:", dict(domain_counts))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"\n更新失敗：{error}")
        print("原本的 affixes-data.js 不會被覆蓋。")
        raise SystemExit(1)
