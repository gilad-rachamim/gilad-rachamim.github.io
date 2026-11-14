"""מוזיקת רקע לסרטוני ההדמיה – מסונתזת כאן בקוד, ולכן בלי זכויות יוצרים של אף אחד.
לופ אופטימי: אקורדים I-V-vi-IV, פד רך, ארפג'ו פריטה, בס, תוף רך ושייקר, וצליל "דינג" עדין בכל מעבר סצנה.
שימוש: write_music(path, seconds, cuts=[0, 3.5, ...], mood="bright"|"calm")
"""
import wave
import numpy as np

SR = 44100
MOODS = {
    # (טמפו, טוניקה במידי, אקורדים כמרווחים מהטוניקה)
    "bright": (100, 62, [(0, 4, 7), (7, 11, 14), (9, 12, 16), (5, 9, 12)]),   # D: I V vi IV
    "calm": (84, 60, [(0, 4, 7), (9, 12, 16), (5, 9, 12), (7, 11, 14)]),      # C: I vi IV V
}


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.01, r=0.3):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
    return e


def tone(f, n, harm=(1, .5, .25), detune=0.0):
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k, amp in enumerate(harm, 1):
        s += amp * np.sin(2 * np.pi * f * k * t)
        if detune:
            s += amp * .6 * np.sin(2 * np.pi * f * k * (1 + detune) * t)
    return s


def add(buf, start, sig):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def write_music(path, seconds, cuts=(), mood="bright", seed=7):
    bpm, root, prog = MOODS[mood]
    beat = 60 / bpm
    n = int(seconds * SR) + SR
    pad, arp, bass, drums, fx = (np.zeros(n) for _ in range(5))
    rng = np.random.default_rng(seed)
    bar = 4 * beat
    nbars = int(seconds / bar) + 2
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    for b in range(nbars):
        t0 = b * bar
        ch = prog[b % len(prog)]
        # פד: אקורד מלא לאורך התיבה, עם כניסה ויציאה רכות
        L = int(bar * SR)
        e = np.minimum(1, np.arange(L) / (0.25 * SR)) * np.minimum(1, (L - np.arange(L)) / (0.3 * SR))
        for iv in ch:
            add(pad, t0, tone(hz(root + iv - 12), L, (1, .3, .1), detune=.003) * e * .09)
        # בס
        for k, bt in enumerate((0, 2, 2.5)):
            Lb = int(beat * 1.2 * SR)
            add(bass, t0 + bt * beat, tone(hz(root + ch[0] - 24), Lb, (1, .4)) * env(Lb, .01, .35) * (.32 if k == 0 else .22))
        # ארפג'ו (פותח בתיבה השנייה)
        if b >= 1:
            for k in range(8):
                note = root + ch[arp_pat[k]] + (12 if k % 4 == 3 else 0)
                La = int(beat * SR)
                add(arp, t0 + k * beat / 2, tone(hz(note), La, (1, .35, .12, .05)) * env(La, .004, .22) * .13)
        # תופים רכים (מהתיבה השלישית)
        if b >= 2:
            for bt in range(4):
                if bt in (0, 2):
                    Lk = int(.25 * SR)
                    tk = np.arange(Lk) / SR
                    kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 14)
                    add(drums, t0 + bt * beat, kick * .45)
                else:
                    Ls = int(.18 * SR)
                    sn = rng.standard_normal(Ls) * np.exp(-np.arange(Ls) / SR * 28)
                    add(drums, t0 + bt * beat, sn * .06)
                for h in (0, .5):
                    Lh = int(.05 * SR)
                    hh = rng.standard_normal(Lh)
                    hh = np.diff(hh, prepend=0) * np.exp(-np.arange(Lh) / SR * 90)
                    add(drums, t0 + (bt + h) * beat, hh * .05)
    # דינג במעברים (שתי נקודות גבוהות, פעמון רך)
    for c in cuts[1:]:
        Lf = int(.9 * SR)
        add(fx, c, (tone(hz(root + 24), Lf, (1, .2)) + .6 * tone(hz(root + 31), Lf, (1,))) * env(Lf, .003, .25) * .07)
    mix = pad + arp + bass + drums + fx
    mix = mix[: int(seconds * SR)]
    # כניסה ויציאה
    fi, fo = int(.8 * SR), int(2.2 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)
    mix[-fo:] *= np.linspace(1, 0, fo)
    # מעט "רוחב": ערוץ ימני מושהה קצת
    left = mix
    right = np.concatenate([np.zeros(int(.012 * SR)), mix])[: len(mix)] * .9 + mix * .1
    st = np.stack([left, right], 1)
    st /= max(1e-9, np.abs(st).max()) / .8
    pcm = (st * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return path


if __name__ == "__main__":
    import sys
    write_music(sys.argv[1] if len(sys.argv) > 1 else "music.wav", 20, cuts=[0, 5, 10, 15])
