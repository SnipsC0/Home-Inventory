import sqlite3, logging, os
from aiohttp import web
from homeassistant.components.http import HomeAssistantView

DOMAIN = "home_inventar"
_LOGGER = logging.getLogger(__name__)

class HomeInventarOrganizersView(HomeAssistantView):
    url = f"/api/{DOMAIN}/organizers"
    name = f"api:{DOMAIN}_organizers"
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
        """Obține organizatoare pentru un raft + itemele fără organizator"""
        room = request.query.get("room")
        cupboard = request.query.get("cupboard")
        shelf = request.query.get("shelf")
        
        if not room or not cupboard or not shelf:
            return web.json_response({"error": "Room, cupboard and shelf required"}, status=400)

        def fetch():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # Obține organizatoarele cu numărul de items și imagine
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
            
            # Obține numărul de items fără organizator
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
        """Adaugă un organizator nou"""
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
            
            # Insert organizer cu imagine
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
        """Update organizer name și/sau imagine"""
        try:
            data = await request.json()
            _LOGGER.info(f"PATCH organizers - received data: {data}")
            
            organizer_id = data.get("id")
            name = data.get("name")
            new_image = data.get("image")

            if not organizer_id:
                _LOGGER.error("PATCH organizers - missing organizer ID")
                return web.json_response({"error": "Organizer ID required"}, status=400)

            def update_organizer():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                # Obținem imaginea veche pentru a o șterge dacă se schimbă
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
                
                if not updates:
                    conn.close()
                    return 0, None
                
                params.append(organizer_id)
                sql = f"UPDATE organizers SET {', '.join(updates)} WHERE id = ?"
                
                _LOGGER.info(f"Executing: {sql} with params: {params}")
                cur.execute(sql, params)
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                # Returnă imaginea veche doar dacă s-a schimbat efectiv
                return count, old_image if (new_image is not None and old_image and old_image != new_image) else None

            count, old_image = await request.app["hass"].async_add_executor_job(update_organizer)
            
            if count == 0:
                _LOGGER.error(f"Organizer not found with ID: {organizer_id}")
                return web.json_response({"error": "Organizer not found"}, status=404)
            
            # Ștergem imaginea veche dacă s-a schimbat
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
        """Delete organizer and all its items (cascading delete) + cleanup images"""
        try:
            data = await request.json()
            organizer_id = data.get("id")

            if not organizer_id:
                return web.json_response({"error": "Organizer ID required"}, status=400)

            def delete_organizer():
                conn = sqlite3.connect(self.db_path)
                cur = conn.cursor()
                
                # Colectăm imaginea organizatorului și imaginile de la items care vor fi șterse
                cur.execute("SELECT image FROM organizers WHERE id = ?", (organizer_id,))
                org_row = cur.fetchone()
                organizer_image = org_row[0] if org_row else None
                
                cur.execute('''
                    SELECT image FROM items 
                    WHERE organizer_id = ? AND image IS NOT NULL AND image != ''
                ''', (organizer_id,))
                item_images = [row[0] for row in cur.fetchall()]
                
                # Ștergem organizatorul (foreign keys ON DELETE CASCADE vor șterge automat items)
                cur.execute("DELETE FROM organizers WHERE id = ?", (organizer_id,))
                conn.commit()
                count = cur.rowcount
                conn.close()
                
                return count, organizer_image, item_images

            count, organizer_image, item_images = await request.app["hass"].async_add_executor_job(delete_organizer)
            
            if count == 0:
                return web.json_response({"error": "Organizer not found"}, status=404)
            
            # Ștergem imaginea organizatorului
            if organizer_image:
                self._delete_image_file(organizer_image)
            
            # Ștergem imaginile items-urilor
            for image in item_images:
                self._delete_image_file(image)
            
            total_images = (1 if organizer_image else 0) + len(item_images)
            _LOGGER.info(f"Organizer {organizer_id} deleted successfully (cleaned {total_images} images)")
            return web.json_response({"message": "Deleted", "images_deleted": total_images})
            
        except Exception as e:
            _LOGGER.error(f"Error deleting organizer: {e}", exc_info=True)
            return web.json_response({"error": str(e)}, status=500)