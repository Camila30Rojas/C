"""
Download a TFJS model.json and its binary weight shards from a TFHub / remote URL
Usage (PowerShell / cmd):
  python scripts\download_tfhub_model.py "https://tfhub.dev/mediapipe/tfjs-model/face_landmarks_detection/face_mesh/1/model.json?tfjs-format=file" models/face_mesh

This will create the output directory and save `model.json` plus all referenced weight files.
"""
import sys
import os
import json
from urllib.parse import urlparse, urljoin

try:
    import requests
except ImportError:
    print("The 'requests' library is required. Install with: pip install requests")
    sys.exit(1)


def download_file(url, out_path):
    resp = requests.get(url, stream=True)
    resp.raise_for_status()
    with open(out_path, 'wb') as f:
        for chunk in resp.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)


def main():
    if len(sys.argv) < 3:
        print('Usage: python scripts/download_tfhub_model.py <model.json URL> <output_dir>')
        return

    model_url = sys.argv[1]
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)

    print(f'Downloading model.json from: {model_url}')
    resp = requests.get(model_url)
    resp.raise_for_status()
    model_json = resp.text

    model_path = os.path.join(out_dir, 'model.json')
    with open(model_path, 'w', encoding='utf-8') as f:
        f.write(model_json)

    data = json.loads(model_json)

    # Determine base URL for weights (model.json's directory)
    parsed = urlparse(model_url)
    base = model_url
    if base.endswith('model.json') or 'model.json' in base:
        base = base[: base.rfind('/') + 1]
    # Strip query when joining
    base = base.split('?')[0]

    # Collect all shard paths from weightsManifest
    shards = []
    if 'weightsManifest' in data:
        for manifest in data['weightsManifest']:
            paths = manifest.get('paths', [])
            for p in paths:
                shards.append(p)

    if not shards:
        print('No weight shards found in model.json; done saving model.json only.')
        return

    print(f'Found {len(shards)} shard(s). Downloading...')
    for shard in shards:
        shard_url = urljoin(base, shard)
        out_file = os.path.join(out_dir, os.path.basename(shard))
        print(f'  - {shard_url} -> {out_file}')
        try:
            download_file(shard_url, out_file)
        except Exception as err:
            print(f'Failed to download {shard_url}: {err}')
            print('You can try to download the files manually if this fails.')

    print('Download complete. Update your code to load the model from the local path:')
    print(f"  './{os.path.relpath(out_dir).replace('\\\\','/')}\/model.json'")


if __name__ == '__main__':
    main()
