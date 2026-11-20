"""phrases.json の英語フレーズから音声ファイル（audio/<id>.mp3, audio/<id>-alt.mp3）を作る。

サイレントモードでも音が出るよう、アプリはこの音声ファイルを再生する。
音声ファイルがないフレーズは、端末の読み上げ機能で代わりに読む（サイレントでは鳴らない）。

使い方:
  pip install kokoro-onnx soundfile
  python tools/make_audio.py <kokoro の onnx モデル> <voices.npz>   # ffmpeg が必要
  既にある音声は作り直さない。作り直すときは --force
"""
import json, os, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

VOICE = "af_heart"  # アメリカ英語の女性の声
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    model, voices = sys.argv[1], sys.argv[2]
    force = "--force" in sys.argv
    k = Kokoro(model, voices)
    data = json.load(open(os.path.join(ROOT, "phrases.json"), encoding="utf-8"))
    out_dir = os.path.join(ROOT, "audio")
    os.makedirs(out_dir, exist_ok=True)
    made = 0
    for p in data["phrases"]:
        for suffix, text in (("", p["en"]), ("-alt", p.get("alt"))):
            if not text:
                continue
            path = os.path.join(out_dir, f"{p['id']}{suffix}.mp3")
            if os.path.exists(path) and not force:
                continue
            samples, sr = k.create(text, voice=VOICE, speed=1.0, lang="en-us")
            with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
                sf.write(tmp.name, samples, sr)
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name,
                                "-af", "silenceremove=start_periods=1:start_threshold=-50dB,apad=pad_dur=0.15",
                                "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "48k", path], check=True)
            made += 1
            print(path)
    print(f"{made} files")

if __name__ == "__main__":
    main()
