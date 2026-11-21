import os

import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "live: requires a live Gemini API key and network")


def pytest_addoption(parser):
    parser.addoption(
        "--run-live", action="store_true", default=False, help="run live Gemini integration tests"
    )


def pytest_collection_modifyitems(config, items):
    run_live = config.getoption("--run-live") or (
        config.getoption("markexpr").strip() == "live"
        and bool(os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY"))
    )
    if not run_live:
        skip = pytest.mark.skip(
            reason="live tests require --run-live or GEMINI_API_KEY/LLM_API_KEY with -m live"
        )
        for item in items:
            if "live" in item.keywords:
                item.add_marker(skip)
