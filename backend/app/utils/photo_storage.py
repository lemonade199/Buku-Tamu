import os
import io
import base64
import uuid
import re
from datetime import datetime, timezone
from PIL import Image
from flask import current_app

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def get_upload_dir() -> str:
    upload_dir = current_app.config.get('UPLOAD_FOLDER') if current_app else None
    if not upload_dir:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        upload_dir = os.path.join(base_dir, 'storage', 'photos')
    if not os.path.isabs(upload_dir):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        upload_dir = os.path.join(base_dir, upload_dir)
    return os.path.abspath(upload_dir)

def _validate_and_decode_image(photo_base64: str, min_bytes: int = 500) -> tuple[bytes, str]:
    """
    Decodes and strictly validates base64 image data using Pillow.
    Ensures magic bytes, dimensions, and image format are legitimate.
    """
    if not photo_base64 or not isinstance(photo_base64, str):
        raise ValueError("Data foto tidak ditemukan.")

    # Strip data URL prefix if present (e.g., 'data:image/jpeg;base64,...')
    if ',' in photo_base64:
        photo_base64 = photo_base64.split(',', 1)[1]

    clean_base64 = re.sub(r'[^A-Za-z0-9+/=]', '', photo_base64)
    try:
        image_bytes = base64.b64decode(clean_base64)
    except Exception:
        raise ValueError("Format data foto base64 tidak valid.")

    if len(image_bytes) < min_bytes:
        raise ValueError("Ukuran data foto terlalu kecil atau tidak valid.")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img_format = (img.format or '').upper()
        if img_format not in ['JPEG', 'JPG', 'PNG', 'WEBP']:
            raise ValueError(f"Format gambar '{img_format}' tidak didukung. Harap gunakan format JPEG atau PNG.")

        # Re-check dimensions and integrity
        width, height = img.size
        if width < 10 or height < 10:
            raise ValueError("Dimensi gambar terlalu kecil untuk verifikasi identitas.")
        if width > 6000 or height > 6000:
            raise ValueError("Dimensi gambar melebihi batas wajar.")
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError("File korup atau bukan citra gambar yang valid.")

    ext = 'jpg' if img_format in ['JPEG', 'JPG'] else img_format.lower()
    return image_bytes, ext

def save_visitor_photo(photo_base64: str) -> str:
    """
    Decodes base64 image string, validates integrity, and saves securely.
    Returns relative filename (e.g. 'visitor_20261117_120000_abcd1234.jpg').
    """
    image_bytes, ext = _validate_and_decode_image(photo_base64, min_bytes=500)

    upload_dir = get_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)

    date_str = utc_now().strftime('%Y%m%d_%H%M%S')
    unique_suffix = uuid.uuid4().hex[:8]
    filename = f"visitor_{date_str}_{unique_suffix}.{ext}"
    full_path = os.path.join(upload_dir, filename)

    with open(full_path, 'wb') as f:
        f.write(image_bytes)

    return filename

def get_photo_path(filename: str) -> str:
    upload_dir = get_upload_dir()
    clean_filename = os.path.basename(filename)
    return os.path.abspath(os.path.join(upload_dir, clean_filename))

def save_user_avatar(photo_base64: str) -> str:
    image_bytes, ext = _validate_and_decode_image(photo_base64, min_bytes=100)

    upload_dir = get_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)

    date_str = utc_now().strftime('%Y%m%d_%H%M%S')
    unique_suffix = uuid.uuid4().hex[:8]
    filename = f"avatar_{date_str}_{unique_suffix}.{ext}"
    full_path = os.path.join(upload_dir, filename)

    with open(full_path, 'wb') as f:
        f.write(image_bytes)

    return filename

def save_institution_logo(photo_base64: str) -> str:
    image_bytes, ext = _validate_and_decode_image(photo_base64, min_bytes=100)

    upload_dir = get_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)

    date_str = utc_now().strftime('%Y%m%d_%H%M%S')
    unique_suffix = uuid.uuid4().hex[:8]
    filename = f"logo_{date_str}_{unique_suffix}.{ext}"
    full_path = os.path.join(upload_dir, filename)

    with open(full_path, 'wb') as f:
        f.write(image_bytes)

    return filename
