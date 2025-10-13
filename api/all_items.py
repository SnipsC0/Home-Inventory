import sqlite3, logging
from aiohttp import web
from homeassistant.components.http import HomeAssistantView

DOMAIN = "home_inventar"
_LOGGER = logging.getLogger(__name__)

class HomeInventarAllItemsView(HomeAssistantView):
    url = f"/api/{DOMAIN}/all_items"
    name = f"api:{DOMAIN}_all_items"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def get(self, request):
        """Returnează toate obiectele cu locația completă"""
        def fetch():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute('''
                SELECT 
                    i.id, 
                    i.name, 
                    i.image,
                    i.quantity,
                    i.min_quantity,
                    i.track_quantity,
                    r.name as room_name,
                    c.name as cupboard_name,
                    s.name as shelf_name
                FROM items i
                JOIN shelves s ON i.shelf_id = s.id
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                ORDER BY i.created_at DESC
            ''')
            rows = cur.fetchall()
            conn.close()
            
            return [{
                "id": r[0],
                "name": r[1],
                "image": r[2],
                "quantity": r[3],
                "min_quantity": r[4],
                "track_quantity": bool(r[5]),
                "room": r[6],
                "cupboard": r[7],
                "shelf": r[8],
                "location": f"{r[6]} / {r[7]} / {r[8]}"
            } for r in rows]

        data = await request.app["hass"].async_add_executor_job(fetch)
        return web.json_response(data)

class HomeInventarUpdateItemQuantityView(HomeAssistantView):
    url = f"/api/{DOMAIN}/items/{'{item_id}'}/quantity"
    name = f"api:{DOMAIN}_item_quantity"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def patch(self, request, item_id):
        """Actualizează cantitatea unui obiect"""
        data = await request.json()
        quantity = data.get("quantity")
        min_quantity = data.get("min_quantity")
        track_quantity = data.get("track_quantity")

        def update():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            updates = []
            params = []
            
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
                return None
            
            params.append(item_id)
            sql = f"UPDATE items SET {', '.join(updates)} WHERE id = ?"
            
            cur.execute(sql, params)
            conn.commit()
            count = cur.rowcount
            conn.close()
            return count

        count = await request.app["hass"].async_add_executor_job(update)
        if count == 0:
            return web.json_response({"error": "Item not found"}, status=404)
        
        return web.json_response({"message": "Updated"})