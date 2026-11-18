# -*- coding: utf-8 -*-
"""Build the ready-made iPhone shortcuts offered on /kelim/iphone/kizurei-derech/ and sign them.

Each shortcut is a tiny property list (open one of our pages; one of them first reads the clipboard).
Signing ("anyone" mode) is done by the public HubSign service of RoutineHub, the same one the open-source
Cherri compiler uses, so no Apple account of ours is involved. Only the shortcut itself is sent there.
Run:  python -X utf8 tools/iphone_shortcuts.py     -> assets/kitzurim/<slug>.shortcut
The list below is also imported by tools/iphone_pages_data/06_kizurei_derech.py.
"""
import json, os, plistlib, sys, time, urllib.request, uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "kitzurim")
SIGN = "https://hubsign.routinehub.services/sign"
SITE = "https://hakelim.com"

# slug, Hebrew name (what you say to Siri), emoji, what it does, target path, reads clipboard?
SHORTCUTS = [
    ("mi-mitkasher", "מי מתקשר", "📞", "מעתיקים מספר לא מוכר, מפעילים את הקיצור, ורואים של מי הקידומת ואם זה נראה כמו ספאם.", "/kelim/machshev/mi-mitkasher/", True),
    ("tamlul", "תמלול הקלטה", "🎙", "פותח ישר את התמלול: בוחרים הקלטה או הודעה קולית ומקבלים טקסט.", "/kelim/tamlul/", False),
    ("sricha", "סריקת מסמך", "📄", "פותח את הסורק: מצלמים דף ושומרים PDF.", "/kelim/iphone/sricat-mismachim/", False),
    ("hakltat-sicha", "הקלטת שיחה", "⏺", "פותח את המדריך להקלטת שיחה, עם תמלול וסיכום.", "/kelim/iphone/hakltat-sichot/", False),
    ("nikud", "ניקוד", "✍️", "פותח את מקלדת הניקוד: מקלידים, מנקדים ומעתיקים.", "/kelim/iphone/nikud/", False),
    ("hakelim", "הכלים שלי", "🧰", "פותח את כל הכלים לאייפון במקום אחד.", "/kelim/iphone/", False),
]


def plist(path, clip):
    acts = []
    if clip:
        u1, u2 = str(uuid.uuid4()).upper(), str(uuid.uuid4()).upper()
        pre = SITE + path + "#"
        n = len(pre.encode("utf-16-le")) // 2
        acts = [
            {"WFWorkflowActionIdentifier": "is.workflow.actions.getclipboard", "WFWorkflowActionParameters": {"UUID": u1}},
            {"WFWorkflowActionIdentifier": "is.workflow.actions.url", "WFWorkflowActionParameters": {"UUID": u2, "WFURLActionURL": {
                "Value": {"string": pre + "￼", "attachmentsByRange": {"{%d, 1}" % n: {"OutputName": "Clipboard", "OutputUUID": u1, "Type": "ActionOutput"}}},
                "WFSerializationType": "WFTextTokenString"}}},
            {"WFWorkflowActionIdentifier": "is.workflow.actions.openurl", "WFWorkflowActionParameters": {
                "WFInput": {"Value": {"OutputName": "URL", "OutputUUID": u2, "Type": "ActionOutput"}, "WFSerializationType": "WFTextTokenAttachment"}}},
        ]
    else:
        acts = [{"WFWorkflowActionIdentifier": "is.workflow.actions.openurl", "WFWorkflowActionParameters": {"WFInput": SITE + path}}]
    return {
        "WFWorkflowClientVersion": "2302.0.4", "WFWorkflowMinimumClientVersion": 900, "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": 4282601983, "WFWorkflowIconGlyphNumber": 59511},
        "WFWorkflowImportQuestions": [], "WFWorkflowTypes": [], "WFWorkflowInputContentItemClasses": ["WFStringContentItem"],
        "WFWorkflowActions": acts,
    }


def sign(name, xml):
    body = json.dumps({"shortcutName": name, "shortcut": xml}).encode("utf-8")
    for i in range(4):
        try:
            rq = urllib.request.Request(SIGN, data=body, headers={"Content-Type": "application/json", "User-Agent": "cherri/2.0"})
            data = urllib.request.urlopen(rq, timeout=90).read()
            if data[:4] == b"AEA1":
                return data
            raise RuntimeError("not a signed file: %r" % data[:60])
        except Exception as e:  # network hiccup: wait and retry
            err = e; time.sleep(4 * (i + 1))
    raise SystemExit("signing failed for %s: %s" % (name, err))


def main():
    os.makedirs(OUT, exist_ok=True)
    for slug, name, _e, _d, path, clip in SHORTCUTS:
        xml = plistlib.dumps(plist(path, clip), fmt=plistlib.FMT_XML).decode("utf-8")
        data = sign(slug, xml)
        open(os.path.join(OUT, slug + ".shortcut"), "wb").write(data)
        print("signed", slug, len(data))


if __name__ == "__main__":
    main()
