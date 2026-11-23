"""Test-only provider fault injection; extraction/pipeline/scoring remain real.

Only the deterministic provider dependency is wrapped. Live mode runs app.main
without this module. Control file is private, local and never contains secrets.
"""
import asyncio
import json
import os
from pathlib import Path

from app.main import create_app
from app.api.internal.screening import get_screening_providers, ScreeningProviders
from app.api.deterministic import DeterministicProvider
from app.infrastructure.llm import LLMTimeoutError

app = create_app()

class ControlledProvider(DeterministicProvider):
    async def generate_structured(self, **kwargs):
        fault = json.loads(Path(os.environ["T8_FAULT_FILE"]).read_text())
        if fault.get("timeout"):
            await asyncio.sleep(0.25)
            raise LLMTimeoutError("Synthetic E2E provider timeout")
        await asyncio.sleep(fault.get("delay", 0))
        return await super().generate_structured(**kwargs)

def providers():
    return ScreeningProviders(primary=ControlledProvider())

app.dependency_overrides[get_screening_providers] = providers
