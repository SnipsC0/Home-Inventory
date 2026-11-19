import logging
from datetime import date
from functools import partial
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from ..const import (
    CONF_EXPIRY_UNIT,
    CONF_EXPIRY_VALUE,
    DEFAULT_EXPIRY_UNIT,
    DEFAULT_EXPIRY_VALUE,
    DOMAIN,
)
from ..db import repository, devreload

_LOGGER = logging.getLogger(__name__)


class HomeInventarExpiringBatchesView(HomeAssistantView):
    """Return every dated batch, flagged as expired / expiring soon."""
    url = f"/api/{DOMAIN}/expiring_batches"
    name = f"api:{DOMAIN}_expiring_batches"
    requires_auth = True

    def __init__(self, db_path, hass):
        self.db_path = db_path
        self.hass = hass

    async def get(self, request):
        entry = self.hass.data.get(DOMAIN, {}).get("entry")
        options = entry.options if entry else {}
        value = int(options.get(CONF_EXPIRY_VALUE, DEFAULT_EXPIRY_VALUE))
        unit = options.get(CONF_EXPIRY_UNIT, DEFAULT_EXPIRY_UNIT)
        today = date.today()

        devreload.reload_if_changed(repository)
        threshold = repository.expiry_threshold(today, value, unit)
        batches = await self.hass.async_add_executor_job(
            partial(repository.list_expiring_batches, self.db_path, today, date.max)
        )
        limit = threshold.strftime("%Y/%m/%d")
        for b in batches:
            b["expiring_soon"] = not b["expired"] and b["date"] <= limit
        return web.json_response({
            "batches": batches,
            "warning_value": value,
            "warning_unit": unit,
            "warning_until": limit,
        })
