# Plan: teste pytest pentru backend + extragerea logicii SQL din `api/items.py`

## Status (pentru reluare într-o sesiune nouă)
Branch: `feature/backend-tests`, creat din `dev`, doar local (fără push).

**Făcut:**
- Pas 0: branch-ul și acest PLAN.md (commit `0d30195`).
- Pas 1: scaffolding pytest (commit `af6eb2f`):
  - `tests/conftest.py` cu stub de pachet `home_inventory` și fixture-urile `db_path`, `seed`, `q`;
  - `pyproject.toml`, `requirements_test.txt`;
  - `.gitignore` (+ `.venv/`, `.pytest_cache/`). Am reparat și linia `CLAUDE.md`, care se lipise de `.venv/`.
  - venv-ul local `.venv/` e creat și are pytest și pyflakes instalate.
- Pas 2: `tests/test_schema.py`, 12 teste, toate trec (commit `0b08a7f`).
- Pas 3, partea de refactor (commit `a6ff881`):
  - `db/repository.py` are funcțiile `normalize_batch_input`, `_load_exp_list`, `_norm_date`, `create_item_location`, `update_item` și `get_low_stock_info`.
  - Codul a fost mutat verbatim cu un script, cu `self.db_path` → `db_path` și `locals().get("location_id")` → `location_id`.
  - În `api/items.py`, `post`/`patch` apelează funcțiile prin `functools.partial`; numele variabilelor locale (`insert`, `update_item`, `check_low_stock`) au rămas aceleași.
  - pyflakes nu raportează nume nedefinite. Avertismentele rămase existau și înainte: importuri nefolosite și un f-string fără placeholder.

- Pas 3, partea de teste (commit `81a6e65`): `tests/test_batch_input.py` și `tests/test_repository.py`. În total 49 de teste, toate trec. `item_id` e pasat ca string la `update_item`, ca în producție.
- `CLAUDE.md` (local, e în `.gitignore`): secțiunea „Testing” are comenzile pytest.
- Verificări statice: compileall ok, pyflakes fără nume nedefinite, `repository.py` nu importă HA/aiohttp.

**Instrucțiune pentru agent la reluare:** când utilizatorul spune să continui, **cere întâi confirmarea că a rulat testele manuale din HA** (punctul 1 de mai jos: restart, loguri, flow-ul din UI) și ce rezultat au avut. Nu continua și nu închide pasul 1 fără confirmarea lui.

**Rămas:**
**TODO utilizator:** de rulat testele manuale în HA înainte de sesiunea următoare.
1. Verificarea în HA-ul de dev (secțiunea „Verificare” de mai jos, punctele 3 și 4). Refactorul **nu** a fost încă testat în HA real: `docker` nu era disponibil în shell-urile agentului, deci restartul și testul în UI le face utilizatorul.
   - Dacă apare o eroare în HA, repară-o în `api/items.py` sau `db/repository.py` și adaugă un test care o acoperă.
2. După verificare: marchez pasul 1 ca făcut. Decizia de merge în `dev` e a utilizatorului (branch-ul e doar local, fără push).
3. Opțional, în sesiuni viitoare: extrage restul endpointurilor (`delete`, `HomeInventarItemMasterView`, `consume.py`) în `repository.py`, doar când ajungem să le modificăm.

Comenzi: `.venv/Scripts/python -m pytest -q` (din `home_inventar/`).

## Context
Backendul nu are teste automate. Fiecare modificare în Python se verifică doar prin restartul lui HA (20-60 s) și testare manuală în UI. Riscul cel mai mare e pe migrări (`db/schema.py`) și pe logica de creare/editare a itemelor (`api/items.py`, 1435 de linii, SQL în closure-uri din handlerele HTTP). Scopul e o buclă de feedback sub o secundă cu `pytest`, fără HA instalat, plus un prim refactor incremental, fără schimbare de comportament.

Toată munca se face pe un branch separat. Tu decizi apoi dacă se face merge în `dev`.

## Pas 0: branch + PLAN.md
- În `home_inventar/` (repo git, pe `dev`, working tree curat): `git switch -c feature/backend-tests`.
- Copiez acest plan în `home_inventar/PLAN.md`. Commit: `docs: add backend testing plan`.
- **Atenție:** containerul HA montează live `home_inventar/custom_components/home_inventory`. Cât timp branch-ul e checked out, HA-ul de dev rulează codul de pe branch după restart.
- Branch-ul rămâne local. Fac push pe `origin` doar dacă ceri.

## Pas 1: infrastructura de teste (fără modificări în cod de producție)
Fișiere noi, toate în rădăcina repo-ului, **nu** în `custom_components/`, ca să nu ajungă la utilizatori prin HACS:
- `tests/conftest.py`
  - Problema: `db/schema.py` face `from ..const import CURRENT_DB_VERSION`. Importul pachetului ar executa `custom_components/home_inventory/__init__.py`, care importă `homeassistant`.
  - Soluția: conftest-ul înregistrează în `sys.modules` un pachet stub `home_inventory` (`types.ModuleType` cu `__path__` setat pe folderul integrării), fără să ruleze `__init__.py`. Astfel `home_inventory.db.schema` și `home_inventory.const` se importă normal, iar `..const` se rezolvă corect.
  - Fixtures:
    - `db_path`: `tmp_path / "test.db"` + `initialize_db()`.
    - `seed_location(db_path, room, cupboard, shelf, organizer=None)`: helper care întoarce id-urile.
- `pyproject.toml`: doar `[tool.pytest.ini_options]`, cu `testpaths = ["tests"]`.
- `requirements_test.txt`: `pytest`.
- `.gitignore`: adaug `.venv/` și `.pytest_cache/`.
- Setup local: `python -m venv .venv` → `.venv/Scripts/python -m pip install -r requirements_test.txt`. Ai Python 3.12, dar `pip` nu e în PATH, de aceea folosesc `python -m pip`.

Commit: `test: add pytest scaffolding`.

## Pas 2: teste pe `db/schema.py` (fără refactor)
`tests/test_schema.py` folosește direct `initialize_db`, `migrate_to_v1`, `migrate_to_v2`, `get_db_version` și `create_expiration_batch`.
- DB nouă → versiunea 2; există `items_master`, `item_locations`, `items_old_v1`, `schema_version`.
- Al doilea apel `initialize_db` e idempotent: versiunea rămâne 2 și nu se pierd date.
- Migrare v1→v2 cu date legacy. Rulez `migrate_to_v1`, inserez rânduri în `items`, apoi rulez `migrate_to_v2`:
  - Itemele sunt grupate după `(name, aliases)` într-un singur master.
  - Duplicatele tracked în aceeași locație au cantitățile adunate și un batch JSON `[{"quantity": N, "date": null}]`.
  - Un item non-tracked sub un master tracked: cu imagine → `quantity=1`, fără imagine → `NULL`.
  - Itemele cu shelf/organizer inexistent sunt sărite.
  - `aliases=''` e normalizat la `NULL`.
- `create_expiration_batch`: cazurile `None`, `0` și pozitiv.

Commit: `test: cover schema init and v1->v2 migration`.

## Pas 3: extragere `insert` + `update_item` în `db/repository.py`
Modul nou `custom_components/home_inventory/db/repository.py`. Importă doar `sqlite3`, `json`, `logging` și tipuri, deloc `homeassistant` sau `aiohttp`. Codul e **mutat, nu rescris**: aceleași query-uri, aceleași mesaje de eroare, același logging.

Funcții:
- `normalize_batch_input(quantity, exp_obj) -> (add_total, add_batch, batch_date)`: acum e closure în `HomeInventarItemsView.post` (`api/items.py:268`).
- `_load_exp_list`, `_norm_date`: helperii din `insert`, la nivel de modul.
- `create_item_location(db_path, *, room, cupboard, shelf, organizer, name, aliases, image, barcode, min_quantity, track_quantity, exp_obj, add_total_qty, add_batch_qty, batch_date) -> (result, error)`: corpul lui `insert()` (`api/items.py:315-586`). Înlocuiesc `locals().get("location_id")` cu o variabilă explicită, cu comportament echivalent.
- `update_item(db_path, item_id, data, *, min_quantity, track_quantity, expiration_dates) -> (count, old_images, error)`: corpul lui `update_item()` (`api/items.py:668-939`). Primește și `data`, pentru verificările `"min_quantity" in data`.
- `get_low_stock_info(db_path, location_id) -> dict | None`: `check_low_stock()` (`api/items.py:957-996`).

În `api/items.py` handlerele rămân subțiri:
- Parsarea și validarea request-ului rămân neschimbate, inclusiv răspunsurile 400.
- Apelurile devin `await request.app["hass"].async_add_executor_job(partial(create_item_location, self.db_path, ...))`.
- În handler rămân `_delete_image_file` (folosește `hass.config.path`), `bus.async_fire("home_inventory_low_stock", ...)` și construcția `web.json_response`.

Restul endpointurilor (`delete`, `HomeInventarItemMasterView`, `consume.py`, …) **nu se ating** acum. Le extragem doar când ajungem să le modificăm.

Teste noi:
- `tests/test_batch_input.py`: toate ramurile din `normalize_batch_input`.
- `tests/test_repository.py`:
  - create:
    - Master + locație nouă.
    - Reutilizare master după barcode și după name+aliases.
    - Item tracked în aceeași locație: aceeași dată → merge în batch; dată diferită → batch nou; fără dată → batch `null`.
    - Mismatch de `track_quantity` → eroare.
    - Shelf sau organizer inexistent → eroare.
    - Non-tracked → rânduri duplicate permise.
    - `image` ca dict (`default_path`/`path`) vs string.
  - update:
    - Redenumire → master nou, iar vechiul e șters dacă nu mai are locații.
    - Redenumire spre un master existent → merge.
    - Conflict de barcode → eroare.
    - `track_quantity=False` → `quantity` și `expiration_dates` devin `NULL`.
    - `expiration_dates` → `quantity` = suma batch-urilor.
    - Mutare pe shelf/organizer; organizer inexistent → eroare.
    - Item inexistent → `"Item master not found"`.
  - low stock: returnează date doar dacă tracked, `0 < qty <= min_qty`.

Commit-uri: `refactor: move item create/update SQL to db/repository` și `test: cover item create/update repository`.

## Observații (nu se repară acum, doar le notez în PLAN.md)
- `PRAGMA foreign_keys=ON` e setat doar în conexiunea din `initialize_db`. Conexiunile din API nu îl setează, deci `ON DELETE CASCADE` nu se aplică acolo. Testele nu vor presupune FK activ.
- `CLAUDE.md` e în `.gitignore`, deci secțiunea „Testing” de acolo nu se versionează. O actualizez local cu comenzile `pytest`.

## Fișiere atinse
- Noi: `PLAN.md`, `pyproject.toml`, `requirements_test.txt`, `tests/conftest.py`, `tests/test_schema.py`, `tests/test_batch_input.py`, `tests/test_repository.py`, `custom_components/home_inventory/db/repository.py`.
- Modificate: `custom_components/home_inventory/api/items.py` (doar `post`, `patch`), `.gitignore`, `CLAUDE.md` (local).
- Neatinse: frontend, `deploy_dev.sh`, restul API-ului, schema DB.

## Verificare
1. `.venv/Scripts/python -m pytest -q`: toate testele trec. Testul unic: `pytest tests/test_repository.py::test_name`.
2. Verific că `repository.py` nu importă HA: `grep -n "homeassistant\|aiohttp" custom_components/home_inventory/db/repository.py` nu întoarce nimic.
3. Test real în HA (branch-ul e montat live): `cd ../homeassistant && docker compose restart homeassistant`, apoi în UI:
   - adaug item tracked cu dată de expirare;
   - adaug același item din nou (merge în batch);
   - editez numele;
   - mut itemul pe alt raft;
   - scad sub `min_quantity` și verific evenimentul `home_inventory_low_stock` în Developer Tools → Events.
4. Logurile `docker compose logs homeassistant | grep home_inventory` nu au erori noi.
5. Îți raportez rezultatul. Merge-ul în `dev` rămâne decizia ta.
