"""ממזג את qa-PP.json ל-qa-final.json אחרי הגהת נאמנות; שאלות שסומנו אצל המגיה נמחקות.
הרצה: python -I -X utf8 tools/merge_giur_shut.py <תיקיית giur-shut>"""
import json, sys, os

DROP = {
    '01': [3, 7, 11, 13],
    '02': [1, 3, 8],
    '03': [0, 2, 3, 4, 5],
    '04': [4, 5, 7, 10, 13],
    '05': [2, 4, 7, 8, 9, 20, 21, 23, 25, 26, 29, 30],
    '06': [0, 1, 4, 6, 7, 8, 9],
    '07': [2, 5, 6, 7, 10],
    '08': [0, 1, 2, 4, 5, 11, 15, 16, 20, 22, 23, 24],
    '09': [2, 8, 10, 14, 19, 20, 21, 22, 23],
}


def main(folder):
    out = []
    for p, drop in DROP.items():
        d = json.load(open(os.path.join(folder, 'qa-%s.json' % p), encoding='utf-8'))
        keep = [x for i, x in enumerate(d) if i not in drop]
        print(p, len(d), '->', len(keep))
        out.extend(keep)
    json.dump(out, open(os.path.join(folder, 'qa-final.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('TOTAL', len(out))


if __name__ == '__main__':
    main(sys.argv[1])
