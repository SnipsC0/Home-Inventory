import sqlite3, logging, os
from aiohttp import web
from homeassistant.components.http import HomeAssistantView

DOMAIN = "home_inventar"
_LOGGER = logging.getLogger(__name__)

class HomeInventarShelvesView(HomeAssistantView):
    url = f"/api/{DOMAIN}/shelves"
    name = f"api:{DOMAIN}_shelves"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        if not image_path:
            return
        
        try:
            if image_path.startswith('/api/home_inventar/images/'):
                filename = image_path.split('/')[-1].split('?')[0]
            elif image_path.startswith('/local/'):
                return
            else:
                filename = image_path
            
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
        if not room or not cupboard:
            return web.json_response({"error": "Room and cupboard required"}, status=400)

        def fetch():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute('''
                SELECT s.id, s.name, COUNT(DISTINCT o.id), COUNT(DISTINCT i.id)
                FROM shelves s
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                LEFT JOIN organizers o ON s.id = o.shelf_id
                LEFT JOIN items i ON s.id = i.shelf_id
                WHERE r.name = ? AND c.name = ?
                GROUP BY s.id, s.name
                ORDER BY s.name
            ''', (room, cupboard))
            rows = cur.fetchall()
            conn.close()
            return [{"id": r[0], "name": r[1], "organizerCount": r[2], "itemCount": r[3]} for r in rows]

        data = await request.app["hass"].async_add_executor_job(fetch)
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        room = data.get("room", "").strip()
        cupboard = data.get("cupboard", "").strip()
        name = data.get("name", "").strip()
        
        if not room or not cupboard or not name:
            return web.json_response({"error": "Room, cupboard and name required"}, status=400)

        def insert_shelf():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            cur.execute('''
                SELECT c.id FROM cupboards c
                JOIN rooms r ON c.room_id = r.id
                WHERE r.name = ? AND c.name = ?
            ''', (room, cupboard))
            
            row = cur.fetchone()
            if not row:
                conn.close()
                return None
            
            cupboard_id = row[0]
            
            cur.execute("INSERT INTO shelves (name, cupboard_id) VALUES (?, ?)", (name, cupboard_id))
            conn.commit()
            shelf_id = cur.lastrowid
            conn.close()
            return shelf_id

        try:
            shelf_id = await request.app["hass"].async_add_executor_job(insert_shelf)
            if shelf_id is None:
                return web.json_response({"error": "Cupboard not found"}, status=404)
            return web.json_response({"id": shelf_id, "name": name})
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Shelf already exists"}, status=400)

    async def patch(self, request):
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH shelves - received data: {data}")
            
            shelf_id = data.get("id")
            name = data.get("name")

            if not shelf_id:
                _LOGGER.error("PATCH shelves - missing shelf ID")
                return web.json_response({"error": "Shelf ID required"}, status=400)
            
            if not name:
                _LOGGER.error("PATCH shelves - missing shelf name")
                return web.json_response({"error": "Shelf name required"}, status=400)

            def update_shelf():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                _LOGGER.info(f"Updating shelf {shelf_id} to name: {name}")
                cur.execute("UPDATE shelves SET name = ? WHERE id = ?", (name, shelf_id))
                conn.commit()
                count = cur.rowcount
                conn.close()
                return count

            count = await request.app["hass"].async_add_executor_job(update_shelf)
            if count == 0:
                _LOGGER.error(f"Shelf not found with ID: {shelf_id}")
                return web.json_response({"error": "Shelf not found"}, status=404)
            
            _LOGGER.info(f"Shelf {shelf_id} updated successfully")
            return web.json_response({"message": "Updated"})
            
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Shelf name already exists"}, status=400)
        except Exception as e:
            _LOGGER.error(f"Error updating shelf: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        try:
            data = await request.json()
            shelf_id = data.get("id")

            if not shelf_id:
                return web.json_response({"error": "Shelf ID required"}, status=400)

            def delete_shelf():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                cur.execute('''
                    SELECT image FROM items 
                    WHERE shelf_id = ? AND image IS NOT NULL AND image != ''
                ''', (shelf_id,))
                images_to_delete = [row[0] for row in cur.fetchall()]
                
                cur.execute("DELETE FROM shelves WHERE id = ?", (shelf_id,))
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                return count, images_to_delete

            count, images_to_delete = await request.app["hass"].async_add_executor_job(delete_shelf)
            
            if count == 0:
                return web.json_response({"error": "Shelf not found"}, status=404)
            
            for image in images_to_delete:
                self._delete_image_file(image)
            
            _LOGGER.info(f"Shelf {shelf_id} deleted successfully (cleaned {len(images_to_delete)} images)")
            return web.json_response({"message": "Deleted", "images_deleted": len(images_to_delete)})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting shelf: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)