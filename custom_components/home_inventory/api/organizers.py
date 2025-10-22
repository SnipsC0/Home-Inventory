import sqlite3, logging, os
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

class HomeInventarOrganizersView(HomeAssistantView):
    url = f"/api/{DOMAIN}/organizers"
    name = f"api:{DOMAIN}_organizers"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    def _delete_image_file(self, image_path):
        if not image_path:
            return
        
        try:
            if image_path.startswith(f'/api/{DOMAIN}/images/'):
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
        shelf = request.query.get("shelf")
        
        if not room or not cupboard or not shelf:
            return web.json_response({"error": "Room, cupboard and shelf required"}, status=400)

        def fetch():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            cur.execute('''
                SELECT o.id, o.name, o.image, COUNT(DISTINCT i.id)
                FROM organizers o
                JOIN shelves s ON o.shelf_id = s.id
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                LEFT JOIN items i ON o.id = i.organizer_id
                WHERE r.name = ? AND c.name = ? AND s.name = ?
                GROUP BY o.id, o.name, o.image
                ORDER BY o.name
            ''', (room, cupboard, shelf))
            
            organizers = []
            for r in cur.fetchall():
                image = r[2] if r[2] else ""
                organizers.append({
                    "id": r[0], 
                    "name": r[1], 
                    "image": image,
                    "itemCount": r[3]
                })
            
            cur.execute('''
                SELECT COUNT(i.id)
                FROM items i
                JOIN shelves s ON i.shelf_id = s.id
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                WHERE r.name = ? AND c.name = ? AND s.name = ? 
                AND i.organizer_id IS NULL
            ''', (room, cupboard, shelf))
            
            items_without_organizer = cur.fetchone()[0]
            conn.close()
            
            return {
                "organizers": organizers,
                "itemsWithoutOrganizer": items_without_organizer
            }

        data = await request.app["hass"].async_add_executor_job(fetch)
        return web.json_response(data)

    async def post(self, request):
        data = await request.json()
        room = data.get("room", "").strip()
        cupboard = data.get("cupboard", "").strip()
        shelf = data.get("shelf", "").strip()
        name = data.get("name", "").strip()
        image = data.get("image", "")
        
        if not room or not cupboard or not shelf or not name:
            return web.json_response({"error": "All fields required"}, status=400)

        _LOGGER.info(f"Creating organizer - Name: {name}, Image: '{image}'")

        def insert_organizer():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
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
            
            cur.execute("INSERT INTO organizers (name, image, shelf_id) VALUES (?, ?, ?)", 
                       (name, image, shelf_id))
            conn.commit()
            organizer_id = cur.lastrowid
            conn.close()
            return organizer_id

        try:
            organizer_id = await request.app["hass"].async_add_executor_job(insert_organizer)
            if organizer_id is None:
                return web.json_response({"error": "Shelf not found"}, status=404)
            return web.json_response({"id": organizer_id, "name": name})
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Organizer already exists"}, status=400)

    async def patch(self, request):
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH organizers - received data: {data}")
            
            organizer_id = data.get("id")
            name = data.get("name")
            new_image = data.get("image")
            
            new_room = data.get("room")
            new_cupboard = data.get("cupboard")
            new_shelf = data.get("shelf")

            if not organizer_id:
                _LOGGER.error("PATCH organizers - missing organizer ID")
                return web.json_response({"error": "Organizer ID required"}, status=400)

            def update_organizer():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                old_image = None
                if new_image is not None:
                    cur.execute("SELECT image FROM organizers WHERE id = ?", (organizer_id,))
                    row = cur.fetchone()
                    if row:
                        old_image = row[0]
                
                updates = []
                params = []
                
                if name is not None:
                    updates.append("name = ?")
                    params.append(name)
                
                if new_image is not None:
                    updates.append("image = ?")
                    params.append(new_image)
                    _LOGGER.info(f"Updating organizer image to: '{new_image}'")
                
                if new_room and new_cupboard and new_shelf:
                    _LOGGER.info(f"Moving organizer {organizer_id} to: {new_room}/{new_cupboard}/{new_shelf}")
                    
                    cur.execute('''
                        SELECT s.id FROM shelves s
                        JOIN cupboards c ON s.cupboard_id = c.id
                        JOIN rooms r ON c.room_id = r.id
                        WHERE r.name = ? AND c.name = ? AND s.name = ?
                    ''', (new_room, new_cupboard, new_shelf))
                    
                    shelf_row = cur.fetchone()
                    if not shelf_row:
                        conn.close()
                        return 0, None, "Destination shelf not found"
                    
                    new_shelf_id = shelf_row[0]
                    updates.append("shelf_id = ?")
                    params.append(new_shelf_id)
                    
                    _LOGGER.info(f"Moving all items from organizer {organizer_id} to shelf_id {new_shelf_id}")
                    cur.execute('''
                        UPDATE items 
                        SET shelf_id = ? 
                        WHERE organizer_id = ?
                    ''', (new_shelf_id, organizer_id))
                    items_moved = cur.rowcount
                    _LOGGER.info(f"Moved {items_moved} items to new shelf")

                if not updates:
                    conn.close()
                    return 0, None, None
                
                params.append(organizer_id)
                sql = f"UPDATE organizers SET {', '.join(updates)} WHERE id = ?"
                
                _LOGGER.info(f"Executing: {sql} with params: {params}")
                cur.execute(sql, params)
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                return count, old_image if (new_image is not None and old_image and old_image != new_image) else None, None

            count, old_image, error = await request.app["hass"].async_add_executor_job(update_organizer)
            
            if error:
                return web.json_response({"error": error}, status=404)
            
            if count == 0:
                _LOGGER.error(f"Organizer not found with ID: {organizer_id}")
                return web.json_response({"error": "Organizer not found"}, status=404)
            
            if old_image:
                self._delete_image_file(old_image)
                _LOGGER.info(f"Old organizer image cleaned: {old_image}")
            
            _LOGGER.info(f"Organizer {organizer_id} updated successfully")
            return web.json_response({"message": "Updated"})
            
        except sqlite3.IntegrityError:
            return web.json_response({"error": "Organizer name already exists"}, status=400)
        except Exception as e:
            _LOGGER.error(f"Error updating organizer: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)

    async def delete(self, request):
        try:
            data = await request.json()
            organizer_id = data.get("id")

            if not organizer_id:
                return web.json_response({"error": "Organizer ID required"}, status=400)

            def hard_delete_organizer():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()

                cur.execute("SELECT image FROM organizers WHERE id = ?", (organizer_id,))
                org_row = cur.fetchone()
                organizer_image = org_row[0] if org_row else None

                cur.execute("SELECT id, image FROM items WHERE organizer_id = ?", (organizer_id,))
                items_to_delete = cur.fetchall()

                cur.execute("DELETE FROM items WHERE organizer_id = ?", (organizer_id,))

                cur.execute("DELETE FROM organizers WHERE id = ?", (organizer_id,))
                conn.commit()
                deleted_organizer = cur.rowcount > 0

                conn.close()

                item_images = [img for (_, img) in items_to_delete]
                return deleted_organizer, organizer_image, item_images, len(items_to_delete)

            deleted_organizer, organizer_image, item_images, items_deleted = (
                await request.app["hass"].async_add_executor_job(hard_delete_organizer)
            )

            if not deleted_organizer:
                return web.json_response({"error": "Organizer not found"}, status=404)

            images_deleted_count = 0
            if organizer_image:
                self._delete_image_file(organizer_image)
                images_deleted_count += 1

            for image in item_images:
                if image:
                    self._delete_image_file(image)
                    images_deleted_count += 1

            _LOGGER.info(f"[HomeInventar] Organizer {organizer_id} HARD DELETED — {items_deleted} items and {images_deleted_count} images cleaned.")
            return web.json_response({
                "message": "Deleted",
                "items_deleted": items_deleted,
                "images_deleted": images_deleted_count
            })

        except Exception as e:
            _LOGGER.error(f"Error deleting organizer: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)