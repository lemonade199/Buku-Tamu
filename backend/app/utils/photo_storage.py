import os
import base64
import uuid
import re
from datetime import datetime
from flask import current_app

def get_upload_dir() -> str:
    upload_dir = current_app.config.get('UPLOAD_FOLDER') if current_app else None
    if not upload_dir:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        upload_dir = os.path.join(base_dir, 'storage', 'photos')
    if not os.path.isabs(upload_dir):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        upload_dir = os.path.join(base_dir, upload_dir)
    return os.path.abspath(upload_dir)

def save_visitor_photo(photo_base64: str) -> str:
    """
    Decodes base64 image string and saves it securely into the storage/photos directory.
    Returns relative filename/path (e.g. 'visitor_20261117_abcd1234.jpg').
    """
    # Strip data URL prefix if present (e.g., 'data:image/jpeg;base64,...')
    if ',' in photo_base64:
        photo_base64 = photo_base64.split(',', 1)[1]

    # Validate clean base64
    clean_base64 = re.sub(r'[^A-Za-z0-9+/=]', '', photo_base64)
    image_bytes = base64.b64decode(clean_base64)

    if len(image_bytes) < 500:
        raise ValueError("Data foto tidak valid atau ukuran gambar terlalu kecil.")

    # Determine storage directory
    upload_dir = get_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)

    date_str = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    unique_suffix = uuid.uuid4().hex[:8]
    filename = f"visitor_{date_str}_{unique_suffix}.jpg"
    full_path = os.path.join(upload_dir, filename)

    with open(full_path, 'wb') as f:
        f.write(image_bytes)

    return filename

def get_photo_path(filename: str) -> str:
    upload_dir = get_upload_dir()
    return os.path.abspath(os.path.join(upload_dir, filename))
