#!/usr/bin/env python3
"""Generate /en/ pages from bilingual HTML using only Python's stdlib.

After editing source pages or their data-lang="en" text, run:
    python3 scripts/build-english.py
Commit the generated en/ files along with the source changes. GitHub Pages can
serve them directly; no build service or browser-side translation is required.
"""

import json
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://www.crossdesk.cn"
PAGES = {
    "index.html": {
        "title": "CrossDesk - Free, Open-Source Remote Desktop Software",
        "description": "Free, open-source remote desktop for Windows, macOS, Linux, iOS, Android, and the web. Connect with hardware acceleration, self-hosting, and multi-device management.",
    },
    "privacy.html": {
        "title": "CrossDesk Privacy Policy - Data and Network Services",
        "description": "Learn how the CrossDesk desktop client and default network services handle information, network communications, data storage, user choices, and privacy inquiries.",
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
        "description": "Explore CrossDesk remote desktop features: cross-platform connections, browser and mobile access, DeskHub device management, hardware acceleration, and self-hosting.",
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


def main():
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
