import sqlite3, logging, os
from aiohttp import web
from homeassistant.components.http import HomeAssistantView

DOMAIN = "home_inventar"
_LOGGER = logging.getLogger(__name__)

class HomeInventarCupboardsView(HomeAssistantView):
    url = f"/api/{DOMAIN}/cupboards"
    name = f"api:{DOMAIN}_cupboards"
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
        if not room:
            return web.json_response({"error": "Room required"}, status=400)

        def fetch():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute('''
                SELECT c.id, c.name, c.image, COUNT(DISTINCT i.id)
                FROM cupboards c
                JOIN rooms r ON c.room_id = r.id
                LEFT JOIN shelves s ON c.id = s.cupboard_id
                LEFT JOIN items i ON s.id = i.shelf_id
                WHERE r.name = ?
                GROUP BY c.id, c.name, c.image
                ORDER BY c.name
            ''', (room,))
            rows = cur.fetchall()
            conn.close()
            
            result = []
            for r in rows:
                image = r[2] if r[2] else ""
                cupboard = {
                    "id": r[0], 
                    "name": r[1], 
                    "image": image,
                    "itemCount": r[3]
                }
                _LOGGER.debug(f"Cupboard fetched - ID: {r[0]}, Name: {r[1]}, Image: '{image}'")
                result.append(cupboard)
            
            return result

        data = await request.app["hass"].async_add_executor_job(fetch)
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        room = data.get("room", "").strip()
        name = data.get("name", "").strip()
        image = data.get("image", "")
        
        if not room or not name:
            return web.json_response({"error": "Room and name required"}, status=400)

        _LOGGER.info(f"Creating cupboard - Room: {room}, Name: {name}, Image: {image}")

        def insert_cupboard():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # Get room_id
            cur.execute("SELECT id FROM rooms WHERE name = ?", (room,))
            row = cur.fetchone()
            if not row:
                conn.close()
                return None
            
            room_id = row[0]
            
            # Insert cupboard
            cur.execute("INSERT INTO cupboards (name, room_id, image) VALUES (?, ?, ?)", (name, room_id, image))
            conn.commit()
            cupboard_id = cur.lastrowid
            conn.close()
            return cupboard_id

        try:
            cupboard_id = await request.app["hass"].async_add_executor_job(insert_cupboard)
            if cupboard_id is None:
                return web.json_response({"error": "Room not found"}, status=404)
            return web.json_response({"id": cupboard_id, "name": name})
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Cupboard already exists"}, status=400)

    async def patch(self, request):
        """Update cupboard - acceptă date direct din JSON body"""
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH cupboards - received data: {data}")
            
            cupboard_id = data.get("id")
            name = data.get("name")
            new_image = data.get("image")

            if not cupboard_id:
                _LOGGER.error("PATCH cupboards - missing cupboard ID")
                return web.json_response({"error": "Cupboard ID required"}, status=400)

            def update_cupboard():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                # Obținem imaginea veche pentru a o șterge dacă se schimbă
                old_image = None
                if new_image is not None:
                    cur.execute("SELECT image FROM cupboards WHERE id = ?", (cupboard_id,))
                    row = cur.fetchone()
                    if row:
                        old_image = row[0]
                
                updates = []
                params = []
                
                if name is not None:
                    updates.append("name = ?")
                    params.append(name)
                    _LOGGER.info(f"Updating name to: {name}")
                
                if new_image is not None:
                    updates.append("image = ?")
                    params.append(new_image)
                    _LOGGER.info(f"Updating image to: '{new_image}'")
                
                if not updates:
                    conn.close()
                    _LOGGER.warning("No updates provided")
                    return 0, None
                
                params.append(cupboard_id)
                sql = f"UPDATE cupboards SET {', '.join(updates)} WHERE id = ?"
                
                _LOGGER.info(f"Executing SQL: {sql} with params: {params}")
                cur.execute(sql, params)
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                # Returnăm și imaginea veche pentru a o șterge
                return count, old_image if (new_image is not None and old_image != new_image) else None

            count, old_image = await request.app["hass"].async_add_executor_job(update_cupboard)
            
            if count == 0:
                _LOGGER.error(f"Cupboard not found with ID: {cupboard_id}")
                return web.json_response({"error": "Cupboard not found"}, status=404)
            
            # Ștergem imaginea veche dacă s-a schimbat
            if old_image:
                self._delete_image_file(old_image)
            
            _LOGGER.info(f"Cupboard {cupboard_id} updated successfully")
            return web.json_response({"message": "Updated"})
            
        except Exception as e:
            _LOGGER.error(f"Error updating cupboard: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        """Delete cupboard and all its contents (cascading delete) + cleanup images"""
        try:
            data = await request.json()
            cupboard_id = data.get("id")

            if not cupboard_id:
                return web.json_response({"error": "Cupboard ID required"}, status=400)

            def delete_cupboard():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                # Colectăm toate imaginile care vor fi șterse
                images_to_delete = []
                
                # Imaginea dulapului
                cur.execute('''
                    SELECT image FROM cupboards 
                    WHERE id = ? AND image IS NOT NULL AND image != ''
                ''', (cupboard_id,))
                row = cur.fetchone()
                if row:
                    images_to_delete.append(row[0])
                
                # Imagini de la items din acest dulap
                cur.execute('''
                    SELECT i.image FROM items i
                    JOIN shelves s ON i.shelf_id = s.id
                    WHERE s.cupboard_id = ? AND i.image IS NOT NULL AND i.image != ''
                ''', (cupboard_id,))
                images_to_delete.extend([row[0] for row in cur.fetchall()])
                
                # Ștergem dulapul (foreign keys ON DELETE CASCADE vor șterge restul)
                cur.execute("DELETE FROM cupboards WHERE id = ?", (cupboard_id,))
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                return count, images_to_delete

            count, images_to_delete = await request.app["hass"].async_add_executor_job(delete_cupboard)
            
            if count == 0:
                return web.json_response({"error": "Cupboard not found"}, status=404)
            
            # Ștergem imaginile fizic
            for image in images_to_delete:
                self._delete_image_file(image)
            
            _LOGGER.info(f"Cupboard {cupboard_id} deleted successfully (cleaned {len(images_to_delete)} images)")
            return web.json_response({"message": "Deleted", "images_deleted": len(images_to_delete)})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting cupboard: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)