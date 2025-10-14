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
                    i.aliases,
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
                "aliases": r[6],
                "room": r[7],
                "cupboard": r[8],
                "shelf": r[9],
                "location": f"{r[7]} / {r[8]} / {r[9]}"
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
        
        def check_low_stock():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            cur.execute('''
                SELECT i.id, i.name, i.quantity, i.min_quantity, i.track_quantity, i.aliases,
                       r.name as room_name, c.name as cupboard_name, s.name as shelf_name
                FROM items i
                JOIN shelves s ON i.shelf_id = s.id
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                WHERE i.id = ?
            ''', (item_id,))
            
            row = cur.fetchone()
            conn.close()
            
            if not row:
                return None
            
            item_id_db, name, qty, min_qty, track_qty, aliases, room, cupboard, shelf = row
            
            if track_qty and qty is not None and min_qty is not None and qty > 0:
                if qty <= min_qty:
                    return {
                        "item_id": item_id_db,
                        "name": name,
                        "aliases": aliases,
                        "quantity": qty,
                        "min_quantity": min_qty,
                        "room": room,
                        "cupboard": cupboard,
                        "shelf": shelf,
                        "location": f"{room} › {cupboard} › {shelf}"
                    }
            return None
        
        low_stock_data = await request.app["hass"].async_add_executor_job(check_low_stock)
        
        if low_stock_data:
            _LOGGER.warning(
                f"🔔 Low stock detected for item {low_stock_data['item_id']}: "
                f"{low_stock_data['name']} ({low_stock_data['quantity']}/{low_stock_data['min_quantity']}) "
                f"at {low_stock_data['location']}"
            )
            request.app["hass"].bus.async_fire(
                "home_inventar_low_stock",
                low_stock_data
            )
        
        return web.json_response({"message": "Updated"})