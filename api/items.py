import sqlite3, logging, os
from aiohttp import web
from homeassistant.components.http import HomeAssistantView

DOMAIN = "home_inventar"
_LOGGER = logging.getLogger(__name__)

class HomeInventarItemsView(HomeAssistantView):
    url = f"/api/{DOMAIN}/items"
    name = f"api:{DOMAIN}_items"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        """Șterge fizic fișierul imaginii de pe disk"""
        if not image_path:
            return
        
        try:
            # Extrage doar filename-ul (UUID)
            if image_path.startswith('/api/home_inventar/images/'):
                filename = image_path.split('/')[-1].split('?')[0]
            elif image_path.startswith('/local/'):
                # Imagini vechi, nu le ștergem
                return
            else:
                filename = image_path
            
            # Path complet către imagine
            full_path = self.hass.config.path(f"data/{DOMAIN}/images/{filename}")
            
            if os.path.exists(full_path):
                os.remove(full_path)
                _LOGGER.info(f"[HomeInventar] 🗑️ Deleted image file: {full_path}")
            else:
                _LOGGER.debug(f"[HomeInventar] Image file not found: {full_path}")
                
        except Exception as e:
            _LOGGER.error(f"[HomeInventar] Error deleting image file: {e}", exc_info=True)

    async def get(self, request):
        room = request.query.get("room")
        cupboard = request.query.get("cupboard")
        shelf = request.query.get("shelf")
        organizer = request.query.get("organizer")  # Poate fi None pentru items fără organizator
        
        if not room or not cupboard or not shelf:
            return web.json_response({"error": "Missing params"}, status=400)

        def fetch():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            if organizer:
                # Items dintr-un organizator specific
                cur.execute('''
                    SELECT i.id, i.name, i.image, i.quantity, i.min_quantity, i.track_quantity, i.aliases
                    FROM items i
                    JOIN organizers o ON i.organizer_id = o.id
                    JOIN shelves s ON i.shelf_id = s.id
                    JOIN cupboards c ON s.cupboard_id = c.id
                    JOIN rooms r ON c.room_id = r.id
                    WHERE r.name = ? AND c.name = ? AND s.name = ? AND o.name = ?
                    ORDER BY i.created_at DESC
                ''', (room, cupboard, shelf, organizer))
            else:
                # Items fără organizator (direct pe raft)
                cur.execute('''
                    SELECT i.id, i.name, i.image, i.quantity, i.min_quantity, i.track_quantity, i.aliases
                    FROM items i
                    JOIN shelves s ON i.shelf_id = s.id
                    JOIN cupboards c ON s.cupboard_id = c.id
                    JOIN rooms r ON c.room_id = r.id
                    WHERE r.name = ? AND c.name = ? AND s.name = ? AND i.organizer_id IS NULL
                    ORDER BY i.created_at DESC
                ''', (room, cupboard, shelf))
            
            rows = cur.fetchall()
            conn.close()
            
            result = []
            for r in rows:
                image = r[2] if r[2] else ""
                item = {
                    "id": r[0], 
                    "name": r[1], 
                    "image": image,
                    "quantity": r[3],
                    "min_quantity": r[4],
                    "track_quantity": bool(r[5]),
                    "aliases": r[6]
                }
                _LOGGER.debug(f"Item fetched - ID: {r[0]}, Name: {r[1]}, Image: '{image}'")
                result.append(item)
            
            return result

        data = await request.app["hass"].async_add_executor_job(fetch)
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        room = data.get("room", "").strip()
        cupboard = data.get("cupboard", "").strip()
        shelf = data.get("shelf", "").strip()
        organizer = data.get("organizer", "").strip() if data.get("organizer") else None  # <- ADĂUGAT
        name = data.get("name", "").strip()
        image = data.get("image", "")
        quantity = data.get("quantity")
        min_quantity = data.get("min_quantity")
        track_quantity = data.get("track_quantity", False)

        if not all([room, cupboard, shelf, name]):
            return web.json_response({"error": "Missing required params"}, status=400)

        _LOGGER.info(f"Creating item - Name: {name}, Image: '{image}', Organizer: '{organizer}'")

        def insert():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # Get shelf_id
            cur.execute('''
                SELECT s.id FROM shelves s
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                WHERE r.name = ? AND c.name = ? AND s.name = ?
            ''', (room, cupboard, shelf))
            
            row = cur.fetchone()
            if not row:
                conn.close()
                return None
            
            shelf_id = row[0]
            
            # Get organizer_id dacă există organizator  <- ADĂUGAT
            organizer_id = None
            if organizer:
                cur.execute('''
                    SELECT o.id FROM organizers o
                    JOIN shelves s ON o.shelf_id = s.id
                    JOIN cupboards c ON s.cupboard_id = c.id
                    JOIN rooms r ON c.room_id = r.id
                    WHERE r.name = ? AND c.name = ? AND s.name = ? AND o.name = ?
                ''', (room, cupboard, shelf, organizer))
                
                org_row = cur.fetchone()
                if org_row:
                    organizer_id = org_row[0]
                    _LOGGER.info(f"Found organizer_id: {organizer_id} for '{organizer}'")
                else:
                    _LOGGER.warning(f"Organizer '{organizer}' not found!")
            
            # Insert item cu organizer_id  <- MODIFICAT
            cur.execute('''
                INSERT INTO items (name, image, shelf_id, organizer_id, quantity, min_quantity, track_quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (name, image, shelf_id, organizer_id, quantity, min_quantity, 1 if track_quantity else 0))
            
            conn.commit()
            item_id = cur.lastrowid
            conn.close()
            return item_id

        try:
            item_id = await request.app["hass"].async_add_executor_job(insert)
            if item_id is None:
                return web.json_response({"error": "Shelf not found"}, status=404)
            return web.json_response({"id": item_id, "name": name})
        except Exception as e:
            _LOGGER.error(f"Error adding item: {e}")
            return web.json_response({"error": str(e)}, status=500)


class HomeInventarItemView(HomeAssistantView):
    url = f"/api/{DOMAIN}/items/{'{item_id}'}"
    name = f"api:{DOMAIN}_item"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        """Șterge fizic fișierul imaginii de pe disk"""
        if not image_path:
            return
        
        try:
            # Extrage doar filename-ul (UUID)
            if image_path.startswith('/api/home_inventar/images/'):
                filename = image_path.split('/')[-1].split('?')[0]
            elif image_path.startswith('/local/'):
                # Imagini vechi, nu le ștergem
                return
            else:
                filename = image_path
            
            # Path complet către imagine
            full_path = self.hass.config.path(f"data/{DOMAIN}/images/{filename}")
            
            if os.path.exists(full_path):
                os.remove(full_path)
                _LOGGER.info(f"[HomeInventar] 🗑️ Deleted image file: {full_path}")
            else:
                _LOGGER.debug(f"[HomeInventar] Image file not found: {full_path}")
                
        except Exception as e:
            _LOGGER.error(f"[HomeInventar] Error deleting image file: {e}", exc_info=True)

    async def patch(self, request, item_id):
        """Update item details - cu cleanup imagine veche"""
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH item {item_id} - received data: {data}")
            
            name = data.get("name")
            aliases = data.get("aliases")
            new_image = data.get("image")
            quantity = data.get("quantity")
            min_quantity = data.get("min_quantity")
            track_quantity = data.get("track_quantity")

            def update_item():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                # Obținem imaginea veche pentru a o șterge dacă se schimbă
                old_image = None
                if new_image is not None:
                    cur.execute("SELECT image FROM items WHERE id = ?", (item_id,))
                    row = cur.fetchone()
                    if row:
                        old_image = row[0]
                
                updates = []
                params = []
                
                if name is not None:
                    updates.append("name = ?")
                    params.append(name)
                
                if aliases is not None:
                    updates.append("aliases = ?")
                    params.append(aliases)
                
                if new_image is not None:
                    updates.append("image = ?")
                    params.append(new_image)
                    _LOGGER.info(f"Updating item image to: '{new_image}'")
                
                if quantity is not None:
                    updates.append("quantity = ?")
                    params.append(quantity)
                
                if min_quantity is not None:
                    updates.append("min_quantity = ?")
                    params.append(min_quantity)
                
                if track_quantity is not None:
                    updates.append("track_quantity = ?")
                    params.append(1 if track_quantity else 0)
                
                if not updates:
                    conn.close()
                    return 0, None
                
                params.append(item_id)
                sql = f"UPDATE items SET {', '.join(updates)} WHERE id = ?"
                
                _LOGGER.info(f"Executing: {sql} with params: {params}")
                cur.execute(sql, params)
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                # Returnăm imaginea veche doar dacă s-a schimbat efectiv
                return count, old_image if (new_image is not None and old_image and old_image != new_image) else None

            count, old_image = await request.app["hass"].async_add_executor_job(update_item)
            
            if count == 0:
                return web.json_response({"error": "Item not found"}, status=404)
            
            # Ștergem imaginea veche dacă s-a schimbat
            if old_image:
                self._delete_image_file(old_image)
                _LOGGER.info(f"Old image cleaned: {old_image}")
            
            return web.json_response({"message": "Updated"})
            
        except Exception as e:
            _LOGGER.error(f"Error updating item: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request, item_id):
        """Delete item + cleanup image"""
        try:
            def delete_item():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                # Obținem imaginea înainte de a șterge
                cur.execute("SELECT image FROM items WHERE id = ?", (item_id,))
                row = cur.fetchone()
                old_image = row[0] if row else None
                
                # Ștergem item-ul
                cur.execute("DELETE FROM items WHERE id = ?", (item_id,))
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                return count, old_image

            count, old_image = await request.app["hass"].async_add_executor_job(delete_item)
            
            if count == 0:
                return web.json_response({"error": "Item not found"}, status=404)
            
            # Ștergem imaginea fizic
            if old_image:
                self._delete_image_file(old_image)
            
            _LOGGER.info(f"Item {item_id} deleted successfully" + (" (image cleaned)" if old_image else ""))
            return web.json_response({"message": "Deleted"})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting item: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)