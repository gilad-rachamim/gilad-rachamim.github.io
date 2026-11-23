"""מייצר את כל דפי חנוכה פלוס. הרצה: python -X utf8 tools/chanuka_plus/gen.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import p_games, p_yetzira, p_shirim, p_megila, p_mekabim

if __name__ == '__main__':
    out = list(p_games.all_pages() or [])
    out += [p_yetzira.page(), p_shirim.page(), p_megila.page(), p_mekabim.page()]
    for o in out:
        print(o)
