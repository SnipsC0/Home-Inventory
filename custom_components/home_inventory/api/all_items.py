import sqlite3, logging
from datetime import date
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

class HomeInventarAllItemsView(HomeAssistantView):
    """Returnează toate itemele cu toate locațiile lor"""
    url = f"/api/{DOMAIN}/all_items"
    name = f"api:{DOMAIN}_all_items"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def get(self, request):
        """Obține toate itemele cu locațiile lor"""
        search = request.query.get("search", "").strip()
        barcode = request.query.get("barcode", "").strip()
        low_stock_only = request.query.get("low_stock_only", "false").lower() == "true"
        expired_only = request.query.get("expired_only", "false").lower() == "true"
        
        def fetch():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            query = '''
                SELECT 
                    im.id as item_id,
                    im.name,
                    im.default_image,
                    im.barcode,
                    im.min_quantity,
                    im.track_quantity,
                    im.aliases,
                    il.id as location_id,
                    il.quantity,
                    il.expiration_dates,
                    il.image as location_image,
                    r.name as room_name,
                    c.name as cupboard_name,
                    s.name as shelf_name,
                    o.name as organizer_name
                FROM items_master im
                LEFT JOIN item_locations il ON im.id = il.item_id
                LEFT JOIN shelves s ON il.shelf_id = s.id
                LEFT JOIN cupboards c ON s.cupboard_id = c.id
                LEFT JOIN rooms r ON c.room_id = r.id
                LEFT JOIN organizers o ON il.organizer_id = o.id
            '''
            
            params = []
            conditions = []
            
            if search:
                conditions.append("(im.name LIKE ? OR im.aliases LIKE ?)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])
            
            if barcode:
                conditions.append("im.barcode = ?")
                params.append(barcode)
            
            if low_stock_only:
                conditions.append("im.track_quantity = 1 AND il.quantity IS NOT NULL AND im.min_quantity IS NOT NULL AND il.quantity <= im.min_quantity")
            
            if expired_only:
                conditions.append("il.expiration_dates IS NOT NULL")
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " ORDER BY im.name, il.created_at DESC"
            
            cur.execute(query, params)
            rows = cur.fetchall()
            conn.close()
            
            # Grupăm rezultatele după item
            items_dict = {}
            for r in rows:
                item_id = r[0]
                
                if item_id not in items_dict:
                    items_dict[item_id] = {
                        "id": item_id,
                        "name": r[1],
                        "default_image": r[2] if r[2] else None,
                        "barcode": r[3],
                        "min_quantity": r[4],
                        "track_quantity": bool(r[5]),
                        "aliases": r[6],
                        "locations": [],
                        "total_quantity": 0
                    }
                
                # Adăugăm locația dacă există
                if r[7] is not None:  # location_id
                    location = f"{r[11]} / {r[12]} / {r[13]}"
                    if r[14]:
                        location += f" / {r[14]}"
                    
                    expiration_dates_json = r[9]
                    has_expired = False
                    if expiration_dates_json and expired_only:
                        try:
                            import json
                            batches = json.loads(expiration_dates_json)
                            today = date.today().isoformat()
                            has_expired = any(
                                batch.get("date", "") <= today 
                                for batch in batches if isinstance(batch, dict)
                            )
                        except:
                            pass
                    
                    # Skip this location if filtering for expired and none are expired
                    if expired_only and not has_expired:
                        continue
                    
                    location_data = {
                        "location_id": r[7],
                        "quantity": r[8],
                        "expiration_dates": r[9], 
                        "image": r[10] if r[10] else None,  
                        "room": r[11],
                        "cupboard": r[12],
                        "shelf": r[13],
                        "organizer": r[14],
                        "location": location,
                        "is_low_stock": bool(r[5] and r[8] is not None and r[4] is not None and r[8] <= r[4]),
                        "is_expired": has_expired  # ✅ FIX: Check if any batch is expired
                    }
                    
                    items_dict[item_id]["locations"].append(location_data)
                    
                    if r[8] is not None:
                        items_dict[item_id]["total_quantity"] += r[8]
            
            return list(items_dict.values())

        data = await request.app["hass"].async_add_executor_job(fetch)
        return web.json_response(data)


class HomeInventarUpdateItemQuantityView(HomeAssistantView):
    """Actualizează cantitatea unui item într-o locație specifică"""
    url = f"/api/{DOMAIN}/items/{'{item_id}'}/quantity"
    name = f"api:{DOMAIN}_item_quantity"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def patch(self, request, item_id):
        data = await request.json()
        location_id = data.get("location_id")
        quantity = data.get("quantity")
        min_quantity = data.get("min_quantity")
        track_quantity = data.get("track_quantity")
        expiration_dates = data.get("expiration_dates")

        if not location_id:
            return web.json_response({"error": "location_id required"}, status=400)

        def update():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            # Update pentru item_locations
            loc_updates = []
            loc_params = []
            
            if quantity is not None:
                loc_updates.append("quantity = ?")
                loc_params.append(quantity)
            
            if expiration_dates is not None:  # ✅ FIX: Use expiration_dates
                loc_updates.append("expiration_dates = ?")
                loc_params.append(expiration_dates)
            
            if loc_updates:
                loc_params.append(location_id)
                loc_sql = f"UPDATE item_locations SET {', '.join(loc_updates)} WHERE id = ?"
                cur.execute(loc_sql, loc_params)
            
            # Update pentru items_master
            master_updates = []
            master_params = []
            
            if min_quantity is not None:
                master_updates.append("min_quantity = ?")
                master_params.append(min_quantity)
            
            if track_quantity is not None:
                master_updates.append("track_quantity = ?")
                master_params.append(1 if track_quantity else 0)
            
            if master_updates:
                master_params.append(item_id)
                master_sql = f"UPDATE items_master SET {', '.join(master_updates)} WHERE id = ?"
                cur.execute(master_sql, master_params)
            
            conn.commit()
            count = cur.rowcount
            conn.close()
            return count

        count = await request.app["hass"].async_add_executor_job(update)
        if count == 0:
            return web.json_response({"error": "Item location not found"}, status=404)
        
        # Verificăm low stock
        def check_low_stock():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            cur.execute('''
                SELECT 
                    im.id, im.name, im.min_quantity, im.track_quantity, im.aliases,
                    il.quantity,
                    r.name as room_name, c.name as cupboard_name, s.name as shelf_name
                FROM item_locations il
                JOIN items_master im ON il.item_id = im.id
                JOIN shelves s ON il.shelf_id = s.id
                JOIN cupboards c ON s.cupboard_id = c.id
                JOIN rooms r ON c.room_id = r.id
                WHERE il.id = ?
            ''', (location_id,))
            
            row = cur.fetchone()
            conn.close()
            
            if not row:
                return None
            
            item_id_db, name, min_qty, track_qty, aliases, qty, room, cupboard, shelf = row
            
            if track_qty and qty is not None and min_qty is not None:
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
                        "location": f"{room} / {cupboard} / {shelf}"
                    }
            return None
        
        low_stock_data = await request.app["hass"].async_add_executor_job(check_low_stock)
        
        if low_stock_data:
            _LOGGER.debug(
                f"🔔 Low stock detected for item {low_stock_data['item_id']}: "
                f"{low_stock_data['name']} ({low_stock_data['quantity']}/{low_stock_data['min_quantity']}) "
                f"at {low_stock_data['location']}"
            )
            request.app["hass"].bus.async_fire(
                "home_inventory_low_stock",
                low_stock_data
            )
        
        return web.json_response({"message": "Updated"})


class HomeInventarItemSearchView(HomeAssistantView):
    """Căutare avansată de items"""
    url = f"/api/{DOMAIN}/items/search"
    name = f"api:{DOMAIN}_items_search"
    requires_auth = True

    def __init__(self, db_path):
        self.db_path = db_path

    async def get(self, request):
        """Căutare items după nume, alias, sau barcode"""
        query = request.query.get("q", "").strip()
        barcode = request.query.get("barcode", "").strip()
        
        if not query and not barcode:
            return web.json_response({"error": "Query or barcode required"}, status=400)
        
        def search():
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            
            if barcode:
                # Căutare exactă după barcode
                cur.execute('''
                    SELECT 
                        im.id, im.name, im.default_image, im.barcode, im.aliases,
                        COUNT(DISTINCT il.id) as location_count,
                        COALESCE(SUM(il.quantity), 0) as total_quantity
                    FROM items_master im
                    LEFT JOIN item_locations il ON im.id = il.item_id
                    WHERE im.barcode = ?
                    GROUP BY im.id
                ''', (barcode,))
            else:
                # Căutare fuzzy după nume sau alias
                search_param = f"%{query}%"
                cur.execute('''
                    SELECT 
                        im.id, im.name, im.default_image, im.barcode, im.aliases,
                        COUNT(DISTINCT il.id) as location_count,
                        COALESCE(SUM(il.quantity), 0) as total_quantity
                    FROM items_master im
                    LEFT JOIN item_locations il ON im.id = il.item_id
                    WHERE im.name LIKE ? OR im.aliases LIKE ?
                    GROUP BY im.id
                    ORDER BY im.name
                    LIMIT 50
                ''', (search_param, search_param))
            
            rows = cur.fetchall()
            conn.close()
            
            return [{
                "id": r[0],
                "name": r[1],
                "image": r[2] if r[2] else "",
                "barcode": r[3],
                "aliases": r[4],
                "location_count": r[5],
                "total_quantity": r[6]
            } for r in rows]

        data = await request.app["hass"].async_add_executor_job(search)
        return web.json_response(data)