"""
Extract MediaPipe Hands 21-point landmarks from sign images.

Uses the modern `mediapipe.tasks` HandLandmarker API (the legacy `mp.solutions`
module isn't shipped for Python 3.12 on Windows).

Usage (from project root):
    python "img_to_handsign/extract_landmarks.py" --classes 1-9
    python "img_to_handsign/extract_landmarks.py" --classes A-Z
    python "img_to_handsign/extract_landmarks.py" --classes 1-9,A-Z

For each input image it writes:
  img_to_handsign/<group>/<class>.json            structured landmarks
  img_to_handsign/<group>/<class>_annotated.jpg   visualization
  img_to_handsign/<group>_landmarks.csv           flat CSV for training
       columns: class,image,handedness,x0..x20,y0..y20,z0..z20  (63 features)

"world" landmarks (default in the CSV) are in real-world meters, hand-centric —
invariant to image size / hand position, which is what you want for training.
"image" landmarks are normalized to [0, 1] of the source image.

The model file `hand_landmarker.task` must live next to this script.
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Iterable

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data train_test" / "Combined"
OUT_DIR = PROJECT_ROOT / "img_to_handsign"
MODEL_PATH = OUT_DIR / "hand_landmarker.task"

# Standard MediaPipe Hands topology (21 points).
HAND_CONNECTIONS: tuple[tuple[int, int], ...] = (
    # Thumb
    (0, 1), (1, 2), (2, 3), (3, 4),
    # Index
    (0, 5), (5, 6), (6, 7), (7, 8),
    # Middle
    (9, 10), (10, 11), (11, 12),
    # Ring
    (13, 14), (14, 15), (15, 16),
    # Pinky
    (0, 17), (17, 18), (18, 19), (19, 20),
    # Palm
    (5, 9), (9, 13), (13, 17),
)


def parse_classes(spec: str) -> list[str]:
    """Parse a spec like '1-9,A-Z,K' into a list of class folder names."""
    result: list[str] = []
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk and len(chunk) == 3:
            start, end = chunk[0], chunk[2]
            if start.isdigit() and end.isdigit():
                result.extend(str(i) for i in range(int(start), int(end) + 1))
            elif start.isalpha() and end.isalpha():
                result.extend(
                    chr(c) for c in range(ord(start.upper()), ord(end.upper()) + 1)
                )
            else:
                raise ValueError(f"Cannot expand range: {chunk}")
        else:
            result.append(chunk)
    return result


def group_for(classes: Iterable[str]) -> str:
    classes = list(classes)
    if all(c.isdigit() for c in classes):
        return "numbers"
    if all(c.isalpha() for c in classes):
        return "alphabets"
    return "mixed"


def find_images(class_dir: Path, limit: int = 25) -> list[Path]:
    """Return up to ``limit`` candidate images from ``class_dir``.

    Preference order: a file literally named ``<class>.jpg/.jpeg/.png`` (the
    canonical reference for that class), then everything else alphabetically.
    Helps when the alphabetical "first" image is a tricky two-hand pose; the
    extractor will then try the next candidates until one yields a detection.
    """
    canonical = []
    for ext in (".jpg", ".jpeg", ".png"):
        p = class_dir / f"{class_dir.name}{ext}"
        if p.is_file():
            canonical.append(p)

    others: list[Path] = []
    for ext in ("*.jpg", "*.jpeg", "*.png"):
        for p in sorted(class_dir.glob(ext)):
            if p not in canonical:
                others.append(p)
            if len(others) + len(canonical) >= limit:
                break
    return (canonical + others)[:limit]


def draw_landmarks(image_bgr, landmarks, width: int, height: int):
    """Draw the 21-point skeleton on a BGR image in-place."""
    pts = [(int(lm.x * width), int(lm.y * height)) for lm in landmarks]
    for a, b in HAND_CONNECTIONS:
        cv2.line(image_bgr, pts[a], pts[b], (255, 255, 255), 2, cv2.LINE_AA)
    for i, (x, y) in enumerate(pts):
        cv2.circle(image_bgr, (x, y), 5, (0, 0, 255), -1, cv2.LINE_AA)
        cv2.circle(image_bgr, (x, y), 5, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(
            image_bgr,
            str(i),
            (x + 6, y - 6),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.35,
            (0, 255, 0),
            1,
            cv2.LINE_AA,
        )


def extract_for_class(
    class_name: str, landmarker: "mp_vision.HandLandmarker", out_dir: Path
) -> dict | None:
    """Try each candidate image in the class folder until MediaPipe detects a
    hand. Stores landmarks from the first detected hand (dominant)."""
    class_dir = DATA_DIR / class_name
    if not class_dir.is_dir():
        print(f"  [skip] {class_name}: folder not found ({class_dir})")
        return None
    candidates = find_images(class_dir)
    if not candidates:
        print(f"  [skip] {class_name}: no images found in {class_dir}")
        return None

    tried = 0
    for img_path in candidates:
        tried += 1
        image_bgr = cv2.imread(str(img_path))
        if image_bgr is None:
            continue
        h, w = image_bgr.shape[:2]
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        result = landmarker.detect(mp_image)
        if not result.hand_landmarks:
            continue

        img_lms = result.hand_landmarks[0]
        world_lms = (
            result.hand_world_landmarks[0] if result.hand_world_landmarks else None
        )
        handedness = (
            result.handedness[0][0].category_name if result.handedness else "Unknown"
        )
        n_hands = len(result.hand_landmarks)

        image_landmarks = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in img_lms]
        world_landmarks = (
            [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in world_lms]
            if world_lms is not None
            else None
        )

        annotated = image_bgr.copy()
        draw_landmarks(annotated, img_lms, w, h)

        out_dir.mkdir(parents=True, exist_ok=True)
        json_path = out_dir / f"{class_name}.json"
        ann_path = out_dir / f"{class_name}_annotated.jpg"
        record = {
            "class": class_name,
            "source_image": img_path.name,
            "width": w,
            "height": h,
            "handedness": handedness,
            "hands_detected": n_hands,
            "image_landmarks": image_landmarks,
            "world_landmarks": world_landmarks,
        }
        json_path.write_text(json.dumps(record, indent=2))
        cv2.imwrite(str(ann_path), annotated)
        note = "" if tried == 1 else f"  (took {tried} attempts)"
        two_hand_note = "  [two-hand sign]" if n_hands > 1 else ""
        print(
            f"  [ok]   {class_name}: {img_path.name}  ->  "
            f"{json_path.name}, {ann_path.name}  ({handedness}){note}{two_hand_note}"
        )
        return record

    print(
        f"  [warn] {class_name}: no hand detected after trying {tried} image(s); skipping"
    )
    return None


def write_csv(records: list[dict], csv_path: Path, use_world: bool = True) -> None:
    feature_key = "world_landmarks" if use_world else "image_landmarks"
    header = ["class", "image", "handedness"]
    for i in range(21):
        header.extend([f"x{i}", f"y{i}", f"z{i}"])

    with csv_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for r in records:
            lms = r.get(feature_key) or r["image_landmarks"]
            row = [r["class"], r["source_image"], r["handedness"]]
            for lm in lms:
                row.extend([lm["x"], lm["y"], lm["z"]])
            writer.writerow(row)
    print(f"\nWrote CSV ({len(records)} rows, features={feature_key}): {csv_path}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--classes",
        default="1-9",
        help="Class spec, e.g. '1-9', 'A-Z', '1-9,A-Z', or 'A,B,1,2'.",
    )
    parser.add_argument(
        "--features",
        choices=["world", "image"],
        default="world",
        help="Which coordinate system to write into the flat CSV.",
    )
    args = parser.parse_args()

    if not MODEL_PATH.is_file():
        print(f"Missing model file: {MODEL_PATH}")
        print(
            "Download it with:\n  Invoke-WebRequest "
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
            "hand_landmarker/float16/1/hand_landmarker.task "
            f"-OutFile '{MODEL_PATH}'"
        )
        return 2

    classes = parse_classes(args.classes)
    group = group_for(classes)
    out_dir = OUT_DIR / group

    print(f"Extracting MediaPipe hand landmarks for: {classes}")
    print(f"Output folder: {out_dir}")
    print()

    options = mp_vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(MODEL_PATH)),
        running_mode=mp_vision.RunningMode.IMAGE,
        # Allow up to 2 hands so we still extract the dominant hand from
        # two-handed reference signs (e.g. ISL S). We only persist the first
        # detected hand to keep downstream features at 21x3 = 63 dims.
        num_hands=2,
        min_hand_detection_confidence=0.25,
        min_hand_presence_confidence=0.25,
        min_tracking_confidence=0.25,
    )

    records: list[dict] = []
    with mp_vision.HandLandmarker.create_from_options(options) as landmarker:
        for cls in classes:
            rec = extract_for_class(cls, landmarker, out_dir)
            if rec is not None:
                records.append(rec)

    if not records:
        print("\nNo hands detected in any image — nothing to write.")
        return 1

    csv_path = OUT_DIR / f"{group}_landmarks.csv"
    write_csv(records, csv_path, use_world=(args.features == "world"))
    print(f"Annotated visualizations + JSON in: {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
