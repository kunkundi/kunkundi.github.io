#!/usr/bin/env python3
"""Generate /en/ pages from bilingual HTML using only Python's stdlib.

After editing source pages, their data-lang="en" text, or src/sponsors.json, run:
    python3 scripts/build-english.py
Commit the generated en/ files along with the source changes. GitHub Pages can
serve them directly; no build service or browser-side translation is required.
"""

import json
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from textwrap import indent

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://www.crossdesk.cn"
PAGES = {
    "index.html": {
        "title": "CrossDesk - Free, Open-Source Remote Desktop with AI Assistance",
        "description": "Free, open-source remote desktop for computers, phones, and browsers. Manage devices, self-host your services, and use MCP to give AI remote tasks in plain language.",
    },
    "privacy.html": {
        "title": "CrossDesk Privacy Policy - Data and Network Services",
        "description": "Learn how CrossDesk desktop, iOS, Android and HarmonyOS clients and default services handle information, local storage, mobile permissions, consent and data deletion requests.",
    },
    "code-signing-policy.html": {
        "title": "CrossDesk Code Signing Policy - Windows Releases",
        "description": "Read the code signing policy for official CrossDesk Windows releases, including SignPath services, certificates, signature verification, and approval responsibilities.",
    },
    "download/index.html": {
        "title": "Download CrossDesk - Windows, macOS, Linux, iOS and Android",
        "description": "Download free CrossDesk remote desktop clients for Windows, macOS, Linux, iOS and Android. Choose your installer, check system requirements, and start a connection.",
        "label": "Download",
    },
    "features/index.html": {
        "title": "CrossDesk Features - Remote Desktop, Web Access and DeskHub",
        "description": "Explore CrossDesk cross-platform connections, browser and mobile access, DeskHub, hardware acceleration, self-hosting, and Agent / MCP assistance.",
        "label": "Features",
    },
    "self-hosting/index.html": {
        "title": "Self-Host CrossDesk - Server Deployment and Client Setup",
        "description": "Set up your own CrossDesk signaling and TURN relay services. Follow the deployment steps, configure certificates, and connect your remote desktop clients.",
        "label": "Self-hosting",
    },
}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


def page_path(name):
    return "/" + name.removesuffix("index.html")


PAGE_PATHS = {page_path(name) for name in PAGES}


def english_image(value):
    return value.replace("-zh.webp", "-en.webp")


def translate_schema(schema, metadata, url):
    nodes = schema.get("@graph", [schema])
    for node in nodes:
        kind = node.get("@type")
        if kind in {"WebPage", "SoftwareApplication", "WebSite"}:
            node["description"] = metadata["description"]
        if kind == "WebPage":
            node.update({"@id": url + "#webpage", "url": url,
                         "name": metadata["title"], "inLanguage": "en"})
            if "breadcrumb" in node:
                node["breadcrumb"]["@id"] = url + "#breadcrumb"
        if kind == "BreadcrumbList":
            node["@id"] = url + "#breadcrumb"
            for item in node["itemListElement"]:
                item["name"] = "Home" if item["position"] == 1 else metadata["label"]
                item["item"] = BASE + "/en/" if item["position"] == 1 else url
        if kind == "SoftwareApplication":
            node["url"] = url
            node["downloadUrl"] = BASE + "/en/download/"
            node["image"] = english_image(node["image"])
            node["screenshot"] = [english_image(image) for image in node["screenshot"]]
    return schema


class EnglishPage(HTMLParser):
    def __init__(self, metadata, url):
        super().__init__(convert_charrefs=False)
        self.metadata = metadata
        self.url = url
        self.output = []
        self.skip_depth = 0

    def render_start(self, tag, attributes, closed=False):
        attrs = dict(attributes)
        if self.skip_depth or attrs.get("data-lang") == "zh":
            if not closed and tag not in VOID_TAGS:
                self.skip_depth += 1
            return

        if tag == "html":
            attrs["lang"] = "en"
        elif tag == "meta":
            key = attrs.get("property", attrs.get("name"))
            if key in {"og:title", "twitter:title"}:
                attrs["content"] = self.metadata["title"]
            elif key in {"description", "og:description", "twitter:description"}:
                attrs["content"] = self.metadata["description"]
            elif key in {"og:url", "twitter:url"}:
                attrs["content"] = self.url
            elif key == "og:locale":
                attrs["content"] = "en_US"
            elif key == "og:locale:alternate":
                attrs["content"] = "zh_CN"
            elif key in {"og:image", "og:image:secure_url", "twitter:image"}:
                attrs["content"] = english_image(attrs["content"])
            elif key in {"og:image:alt", "twitter:image:alt"}:
                attrs["content"] = "CrossDesk remote desktop clients across desktop, mobile, and web"
        elif tag == "link" and attrs.get("rel") == "canonical":
            attrs["href"] = self.url
        elif tag == "img":
            attrs["src"] = attrs.get("data-src-en", attrs.get("src", ""))
            if "srcset" in attrs:
                attrs["srcset"] = english_image(attrs["srcset"])
            attrs["alt"] = attrs.get("data-alt-en", attrs.get("alt", ""))
        elif tag == "a":
            classes = attrs.get("class", "").split()
            if "lang-zh" in classes:
                attrs.pop("aria-current", None)
            elif "lang-en" in classes:
                attrs["aria-current"] = "page"
            else:
                href = attrs.get("href", "")
                if href.split("#", 1)[0] in PAGE_PATHS:
                    attrs["href"] = "/en" + href

        labels = {
            "打开菜单 / Open menu": "Open menu",
            "CrossDesk 首页": "CrossDesk home",
            "功能特点 / Features": "Features",
            "界面预览 / Product previews": "Product previews",
            "Language / 语言": "Language",
            "政策导航 / Policy navigation": "Policy navigation",
            "本页目录 / On this page": "On this page",
        }
        if attrs.get("aria-label") in labels:
            attrs["aria-label"] = labels[attrs["aria-label"]]
        rendered = "".join(
            " " + key if value is None else f' {key}="{escape(value, quote=True)}"'
            for key, value in attrs.items()
        )
        self.output.append(f"<{tag}{rendered}{' /' if closed else ''}>")

    def handle_starttag(self, tag, attrs):
        self.render_start(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self.render_start(tag, attrs, closed=True)

    def handle_endtag(self, tag):
        if self.skip_depth:
            self.skip_depth -= 1
        else:
            self.output.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.skip_depth:
            self.output.append(data)

    def handle_entityref(self, name):
        self.handle_data(f"&{name};")

    def handle_charref(self, name):
        self.handle_data(f"&#{name};")

    def handle_comment(self, data):
        self.handle_data(f"<!--{data}-->")

    def handle_decl(self, decl):
        self.handle_data(f"<!{decl}>")


SPONSOR_TIERS = {
    "special": ("特别赞助", "Special sponsors"),
    "gold": ("金牌赞助", "Gold sponsors"),
    "silver": ("银牌赞助", "Silver sponsors"),
    "community": ("社区支持", "Community supporters"),
}


def tier_label(tier):
    zh, en = SPONSOR_TIERS[tier]
    return f'<span data-lang="zh">{zh}</span><span data-lang="en">{en}</span>'


def sponsor_group(tier, cards, heading_level):
    title = f"h{heading_level}"
    content = indent("\n".join(cards), "    ")
    return f'''<section class="sponsor-tier" data-tier="{tier}">
  <{title} class="sponsor-tier-title">{tier_label(tier)}</{title}>
  <div class="sponsor-tier-cards">
{content}
  </div>
</section>'''


def sponsor_name(sponsor):
    name = escape(sponsor["name"])
    if sponsor.get("name_zh"):
        name += f' <span lang="zh-CN">{escape(sponsor["name_zh"])}</span>'
    return name


def sponsor_description(sponsor):
    return "\n".join(
        f'<p data-lang="{lang}">{escape(paragraph)}</p>'
        for lang in ("zh", "en")
        for paragraph in sponsor[lang]["description"]
    )


def sponsor_card(sponsor, single, preview):
    name = sponsor_name(sponsor)
    url = escape(sponsor["url"])
    logo = escape(sponsor["logo"])
    profile_id = ' id="sponsor-profiles"' if single else ""
    preview_attr = " data-preview" if preview else ""
    return f'''<article class="project-sponsor"{preview_attr}>
  <a class="project-sponsor-identity"{profile_id} href="{url}" target="_blank" rel="sponsored noopener noreferrer">
    <img src="{logo}" width="72" height="72" alt="" loading="lazy" />
    <h5>{name}&nbsp;<span aria-hidden="true">↗</span></h5>
  </a>
  <div class="project-sponsor-description">
{indent(sponsor_description(sponsor), "    ")}
  </div>
</article>'''


def homepage_primary_sponsors(primary):
    if not primary:
        return ""
    links = []
    for sponsor in primary:
        full_name = escape(f'{sponsor["name"]} {sponsor.get("name_zh") or ""}'.strip())
        links.append(f'''<a class="hero-sponsor" href="{escape(sponsor["url"])}" target="_blank" rel="sponsored noopener noreferrer" title="{full_name}">
  <img src="{escape(sponsor["logo"])}" width="48" height="48" alt="" />
  <strong>{sponsor_name(sponsor)}</strong>
</a>''')
    cards = indent("\n".join(links), "        ")
    return f'''<section class="hero-sponsors page-shell" aria-labelledby="hero-sponsors-title">
  <h2 id="hero-sponsors-title">{tier_label("special")}</h2>
  <div class="hero-sponsor-track">
    <div id="hero-sponsor-list">
      <div class="hero-sponsor-group">
{cards}
      </div>
    </div>
  </div>
</section>'''


def homepage_sponsor_card(sponsor):
    return f'''<article class="home-sponsor-card">
  <a class="home-sponsor-brand" href="{escape(sponsor["url"])}" target="_blank" rel="sponsored noopener noreferrer">
    <img src="{escape(sponsor["logo"])}" width="120" height="120" alt="" loading="lazy" decoding="async" />
    <h4>{sponsor_name(sponsor)}&nbsp;<span aria-hidden="true">↗</span></h4>
  </a>
  <div class="home-sponsor-description">
{indent(sponsor_description(sponsor), "    ")}
  </div>
</article>'''


def homepage_sponsor_wall(preview, total):
    if not total:
        return ""
    groups = [sponsor_group(tier, map(homepage_sponsor_card, members), 3)
              for tier, members in preview.items()]
    brands = indent("\n".join(groups), "  ")
    directory = ""
    if total > 1:
        directory = f'''
  <a class="text-link home-sponsors-more" data-open-sponsors href="/download/#sponsor-profiles">
    <span data-lang="zh">查看全部 {total} 家赞助商</span><span data-lang="en">View all {total} sponsors</span><span aria-hidden="true">→</span>
  </a>'''
    return f'''<section class="home-sponsors" aria-labelledby="home-sponsor-title">
  <h2 id="home-sponsor-title"><span data-lang="zh">项目赞助商</span><span data-lang="en">Project sponsors</span></h2>
{brands}{directory}
</section>'''


def replace_sponsor_block(page, content, marker="<!-- Generated from src/sponsors.json -->"):
    source = page.read_text(encoding="utf-8")
    marker_start = source.index(marker)
    padding = source[source.rfind("\n", 0, marker_start) + 1:marker_start]
    start = marker_start + len(marker) + 1
    end = source.index(padding + "<!-- End project sponsors -->", start)
    updated = source[:start] + indent(content, padding) + "\n" + source[end:]
    if updated != source:
        page.write_text(updated, encoding="utf-8")


def sync_sponsor_catalog():
    sponsors = json.loads((ROOT / "src/sponsors.json").read_text(encoding="utf-8"))
    groups = {tier: [] for tier in SPONSOR_TIERS}
    for sponsor in sponsors:
        tier = sponsor.get("tier", "special" if sponsor.get("primary") else "community")
        if tier not in groups:
            raise ValueError(f"Unknown sponsor tier {tier!r} for {sponsor['name']}")
        groups[tier].append(sponsor)

    # Give each populated tier a place in the four-card preview.
    preview = {}
    extra_slots = 4 - sum(bool(members) for members in groups.values())
    for tier, members in groups.items():
        if members:
            preview[tier] = members[:1 + extra_slots]
            extra_slots -= len(preview[tier]) - 1

    home = ROOT / "index.html"
    replace_sponsor_block(home, homepage_primary_sponsors(groups["special"]), "<!-- Primary sponsors from src/sponsors.json -->")
    replace_sponsor_block(home, homepage_sponsor_wall(preview, len(sponsors)))
    parts = []
    if len(sponsors) > 1:
        parts.append(f'''<details class="sponsor-directory">
  <summary aria-controls="project-sponsor-list">
    <span class="directory-open"><span data-lang="zh">查看全部 {len(sponsors)} 家赞助商 →</span><span data-lang="en">View all {len(sponsors)} sponsors →</span></span>
    <span class="directory-back"><span data-lang="zh">← 返回下载选项</span><span data-lang="en">← Back to downloads</span></span>
  </summary>
  <div id="sponsor-profiles" tabindex="-1">
    <label class="sponsor-search" hidden>
      <span data-lang="zh">按名称搜索赞助商</span><span data-lang="en">Search sponsors by name</span>
      <input type="search" autocomplete="off" />
    </label>
    <p role="status" class="sponsor-results"></p>
  </div>
</details>''')
    directory_groups = []
    for tier, shown in preview.items():
        cards = [sponsor_card(member, len(sponsors) == 1, i < len(shown))
                 for i, member in enumerate(groups[tier])]
        directory_groups.append(sponsor_group(tier, cards, 4))
    directory = indent("\n".join(directory_groups), "  ")
    parts.append(f'<div class="project-sponsor-list" id="project-sponsor-list">\n{directory}\n</div>')
    replace_sponsor_block(ROOT / "download/index.html", "\n".join(parts))


def main():
    sync_sponsor_catalog()
    destination = ROOT / "en"
    destination.mkdir(exist_ok=True)
    for name, metadata in PAGES.items():
        url = BASE + "/en" + page_path(name)
        source = (ROOT / name).read_text(encoding="utf-8")
        source = re.sub(r"<title>.*?</title>",
                        "<title>" + escape(metadata["title"]) + "</title>", source, count=1)

        def schema_script(match):
            schema = translate_schema(json.loads(match[1]), metadata, url)
            return '<script type="application/ld+json">\n' + json.dumps(schema, ensure_ascii=False, indent=2) + '\n    </script>'

        source = re.sub(r'<script type="application/ld\+json">(.*?)</script>',
                        schema_script, source, flags=re.S)
        parser = EnglishPage(metadata, url)
        parser.feed(source)
        parser.close()
        output = "".join(parser.output)
        output = re.sub(r"(?m)^[ \t]+$", "", output)
        output = output.replace("<!doctype html>",
                                '<!doctype html>\n<!-- Generated by scripts/build-english.py; edit the root HTML source. -->', 1)
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(output, encoding="utf-8")
        print(f"Generated en/{name}")


if __name__ == "__main__":
    main()
