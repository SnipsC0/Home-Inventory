import sqlite3, logging, os
from aiohttp import web
from homeassistant.components.http import HomeAssistantView

DOMAIN = "home_inventar"
_LOGGER = logging.getLogger(__name__)

class HomeInventarRoomsView(HomeAssistantView):
    url = f"/api/{DOMAIN}/rooms"
    name = f"api:{DOMAIN}_rooms"
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
        def fetch_rooms():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute('''
                SELECT r.id, r.name, COUNT(DISTINCT i.id)
                FROM rooms r
                LEFT JOIN cupboards c ON r.id = c.room_id
                LEFT JOIN shelves s ON c.id = s.cupboard_id
                LEFT JOIN items i ON s.id = i.shelf_id
                GROUP BY r.id, r.name
                ORDER BY r.name
            ''')
            rows = cur.fetchall()
            conn.close()
            return [{"id": r[0], "name": r[1], "itemCount": r[2]} for r in rows]

        data = await request.app["hass"].async_add_executor_job(fetch_rooms)
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        name = data.get("name", "").strip()
        if not name:
            return web.json_response({"error": "Name required"}, status=400)

        def insert_room():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute("INSERT INTO rooms (name) VALUES (?)", (name,))
            conn.commit()
            rid = cur.lastrowid
            conn.close()
            return rid

        try:
            rid = await request.app["hass"].async_add_executor_job(insert_room)
            return web.json_response({"id": rid, "name": name})
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Room already exists"}, status=400)

    async def patch(self, request):
        """Update room name"""
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH rooms - received data: {data}")
            
            room_id = data.get("id")
            name = data.get("name")

            if not room_id:
                _LOGGER.error("PATCH rooms - missing room ID")
                return web.json_response({"error": "Room ID required"}, status=400)
            
            if not name:
                _LOGGER.error("PATCH rooms - missing room name")
                return web.json_response({"error": "Room name required"}, status=400)

            def update_room():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                _LOGGER.info(f"Updating room {room_id} to name: {name}")
                cur.execute("UPDATE rooms SET name = ? WHERE id = ?", (name, room_id))
                conn.commit()
                count = cur.rowcount
                conn.close()
                return count

            count = await request.app["hass"].async_add_executor_job(update_room)
            if count == 0:
                _LOGGER.error(f"Room not found with ID: {room_id}")
                return web.json_response({"error": "Room not found"}, status=404)
            
            _LOGGER.info(f"Room {room_id} updated successfully")
            return web.json_response({"message": "Updated"})
            
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Room name already exists"}, status=400)
        except Exception as e:
            _LOGGER.error(f"Error updating room: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        """Delete room and all its contents (cascading delete) + cleanup images"""
        try:
            data = await request.json()
            room_id = data.get("id")

            if not room_id:
                return web.json_response({"error": "Room ID required"}, status=400)

            def delete_room():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                # Colectăm toate imaginile care vor fi șterse
                images_to_delete = []
                
                # Imagini de la dulapuri
                cur.execute('''
                    SELECT image FROM cupboards 
                    WHERE room_id = ? AND image IS NOT NULL AND image != ''
                ''', (room_id,))
                images_to_delete.extend([row[0] for row in cur.fetchall()])
                
                # Imagini de la items
                cur.execute('''
                    SELECT i.image FROM items i
                    JOIN shelves s ON i.shelf_id = s.id
                    JOIN cupboards c ON s.cupboard_id = c.id
                    WHERE c.room_id = ? AND i.image IS NOT NULL AND i.image != ''
                ''', (room_id,))
                images_to_delete.extend([row[0] for row in cur.fetchall()])
                
                # Ștergem camera (foreign keys ON DELETE CASCADE vor șterge restul)
                cur.execute("DELETE FROM rooms WHERE id = ?", (room_id,))
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                return count, images_to_delete

            count, images_to_delete = await request.app["hass"].async_add_executor_job(delete_room)
            
            if count == 0:
                return web.json_response({"error": "Room not found"}, status=404)
            
            # Ștergem imaginile fizic
            for image in images_to_delete:
                self._delete_image_file(image)
            
            _LOGGER.info(f"Room {room_id} deleted successfully (cleaned {len(images_to_delete)} images)")
            return web.json_response({"message": "Deleted", "images_deleted": len(images_to_delete)})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting room: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)