import os
import uuid
import logging
import re
from io import BytesIO
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from PIL import Image

DOMAIN = "home_inventar"
_LOGGER = logging.getLogger(__name__)

# Configurare redimensionare
MAX_WIDTH = 1600
MAX_HEIGHT = 1200
JPEG_QUALITY = 85


def sanitize_filename(text: str) -> str:
    """Convertește text în nume de fișier valid, fără diacritice."""
    if not text:
        return "unknown"
    
    # Înlocuiește diacriticele românești
    replacements = {
        'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't',
        'Ă': 'A', 'Â': 'A', 'Î': 'I', 'Ș': 'S', 'Ț': 'T'
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Păstrează doar caractere alfanumerice, spații și underscore
    text = re.sub(r'[^a-zA-Z0-9\s_-]', '', text)
    # Înlocuiește spațiile cu underscore
    text = re.sub(r'\s+', '_', text.strip())
    # Limitează lungimea
    text = text[:50]
    
    return text.lower() if text else "unknown"


class HomeInventarUpload(HomeAssistantView):
    url = f"/api/{DOMAIN}/upload"
    name = f"api:{DOMAIN}_upload"
    requires_auth = True

    def __init__(self, hass: HomeAssistant):
        self.hass = hass

    def _resize_image(self, image_data: bytes) -> bytes:
        """Redimensionează imaginea păstrând aspect ratio-ul."""
        try:
            img = Image.open(BytesIO(image_data))
            
            try:
                from PIL import ImageOps
                img = ImageOps.exif_transpose(img)
            except Exception as e:
                _LOGGER.warning(f"Could not apply EXIF rotation: {e}")
            
            original_width, original_height = img.size
            _LOGGER.debug(f"Original image size: {original_width}x{original_height}")
            
            if original_width <= MAX_WIDTH and original_height <= MAX_HEIGHT:
                _LOGGER.debug("Image is already small enough, no resize needed")
                return image_data
            
            img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.Resampling.LANCZOS)
            new_width, new_height = img.size
            
            _LOGGER.debug(f"Resized image to: {new_width}x{new_height}")
            
            output = BytesIO()
            
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            img.save(output, format='JPEG', quality=JPEG_QUALITY, optimize=True)
            return output.getvalue()
            
        except Exception as e:
            _LOGGER.error(f"Error resizing image: {e}", exc_info=True)
            return image_data

    async def post(self, request: web.Request) -> web.Response:
        """Primește un fișier și îl salvează cu nume sugestiv."""
        try:
            reader = await request.multipart()
            field = await reader.next()
            if not field:
                return web.json_response({"error": "No file"}, status=400)

            # Citește datele imaginii
            image_data = await field.read()
            
            # Redimensionează imaginea
            resized_data = self._resize_image(image_data)
            
            # Obține parametrii pentru denumire din query string
            room = request.query.get('room', '')
            cupboard = request.query.get('cupboard', '')
            shelf = request.query.get('shelf', '')
            organizer = request.query.get('organizer', '')  # <-- ADĂUGAT
            item = request.query.get('item', '')
            old_image = request.query.get('old_image', '')
            
            # Construiește numele fișierului
            name_parts = []
            if room:
                name_parts.append(sanitize_filename(room))
            if cupboard:
                name_parts.append(sanitize_filename(cupboard))
            if shelf:
                name_parts.append(sanitize_filename(shelf))
            # ADĂUGAT: Adaugă organizatorul dacă există
            if organizer and organizer != 'null':
                name_parts.append(sanitize_filename(organizer))
            if item:
                name_parts.append(sanitize_filename(item))
            
            if name_parts:
                # Nume sugestiv: camera_dulap_raft_organizator_obiect.jpg
                base_name = '_'.join(name_parts)
                # Adaugă un UUID scurt pentru unicitate
                short_uuid = str(uuid.uuid4())[:8]
                filename = f"{base_name}_{short_uuid}.jpg"
            else:
                # Fallback la UUID dacă nu avem context
                filename = f"{uuid.uuid4()}.jpg"
            
            # Path către imagine
            base_path = self.hass.config.path(f"data/{DOMAIN}/images")
            os.makedirs(base_path, exist_ok=True)
            storage_path = os.path.join(base_path, filename)

            # Salvează imaginea nouă
            with open(storage_path, "wb") as f:
                f.write(resized_data)

            original_size = len(image_data) / 1024
            final_size = len(resized_data) / 1024
            _LOGGER.debug(
                f"[HomeInventar] 📸 Image uploaded: {filename} "
                f"(original: {original_size:.1f}KB, final: {final_size:.1f}KB)"
            )
            
            # Șterge imaginea veche dacă există
            if old_image and old_image != filename:
                self._delete_old_image(old_image)
            
            return web.json_response({"path": filename})

        except Exception as e:
            _LOGGER.error(f"[HomeInventar] Upload error: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    def _delete_old_image(self, image_path: str):
        """Șterge imaginea veche de pe disk."""
        if not image_path:
            return
        
        try:
            # Extrage filename
            if image_path.startswith('/api/home_inventar/images/'):
                filename = image_path.split('/')[-1].split('?')[0]
            elif image_path.startswith('/local/'):
                # Imagini vechi, nu le ștergem
                return
            else:
                filename = image_path
            
            full_path = self.hass.config.path(f"data/{DOMAIN}/images/{filename}")
            
            if os.path.exists(full_path):
                os.remove(full_path)
                _LOGGER.debug(f"[HomeInventar] 🗑️ Deleted old image: {filename}")
            
        except Exception as e:
            _LOGGER.error(f"[HomeInventar] Error deleting old image: {e}", exc_info=True)


class HomeInventarImageView(HomeAssistantView):
    """Servește imagini securizat, acceptând token din header sau query string."""

    url = f"/api/{DOMAIN}/images/{{filename}}"
    name = f"api:{DOMAIN}_image"
    requires_auth = False

    def __init__(self, hass: HomeAssistant):
        self.hass = hass

    def _authenticate(self, request: web.Request) -> bool:
        """Validează tokenul Home Assistant folosind metoda oficială (sincron)."""
        try:
            token = None

            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:].strip()
                _LOGGER.debug(f"Header token: {token[:20]}...")

            if not token:
                token = request.query.get("access_token")
                if token:
                    _LOGGER.debug(f"Query token: {token[:20]}...")

            if not token:
                _LOGGER.warning("❌ No access token found in request")
                return False

            try:
                refresh_token = self.hass.auth.async_validate_access_token(token)
                if refresh_token:
                    username = refresh_token.user.name if refresh_token.user else "Unknown"
                    _LOGGER.debug(f"✅ Token valid for user: {username}")
                    return True
                else:
                    _LOGGER.warning("❌ Invalid token (validation returned None)")
                    return False
            except Exception as e:
                _LOGGER.warning(f"❌ Token validation failed: {e}")
                return False

        except Exception as e:
            _LOGGER.error(f"Auth error: {e}", exc_info=True)
            return False

    async def get(self, request: web.Request, filename: str) -> web.Response:
        """Servește imaginea doar dacă utilizatorul este autentificat."""
        try:
            _LOGGER.debug(f"[HomeInventar] Image request for: {filename}")

            if not self._authenticate(request):
                _LOGGER.warning(f"[HomeInventar] ❌ Unauthorized: {filename}")
                return web.Response(status=401, text="Unauthorized")

            if not filename or ".." in filename or "/" in filename:
                _LOGGER.warning(f"[HomeInventar] Invalid filename: {filename}")
                return web.Response(status=400, text="Invalid filename")

            image_path = self.hass.config.path(f"data/{DOMAIN}/images/{filename}")

            if not os.path.exists(image_path):
                _LOGGER.warning(f"[HomeInventar] Image not found: {image_path}")
                return web.Response(status=404, text="Image not found")

            _LOGGER.debug(f"[HomeInventar] ✅ Serving image: {filename}")
            with open(image_path, "rb") as f:
                image_data = f.read()

            return web.Response(
                body=image_data,
                content_type="image/jpeg",
                headers={"Cache-Control": "private, max-age=31536000"},
            )

        except Exception as e:
            _LOGGER.error(f"[HomeInventar] Error serving image {filename}: {e}", exc_info=True)
            return web.Response(status=500, text="Internal error")