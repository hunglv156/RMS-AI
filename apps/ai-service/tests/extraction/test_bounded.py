import asyncio
import os
import signal
import subprocess
import sys
import time

import pytest

from app.extraction.bounded import ExtractionTimeoutError, extract_bounded
from app.extraction.document import ExtractionLimits


@pytest.mark.parametrize("cancel", [False, True])
def test_slow_ocr_process_tree_is_killed(monkeypatch, tmp_path, cancel):
    marker = tmp_path / "processes.txt"
    real_spawn = asyncio.create_subprocess_exec
    processes = []

    async def spawn(*args, **kwargs):
        # Simulate a parser that has launched a slow OCR child; no CV files.
        script = (
            "import subprocess, sys, time, os; "
            "child=subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)']); "
            f"open({str(marker)!r}, 'w').write(str(os.getpid())+' '+str(child.pid)); "
            "time.sleep(30)"
        )
        process = await real_spawn(sys.executable, "-c", script, **kwargs)
        processes.append(process)
        return process

    monkeypatch.setattr(asyncio, "create_subprocess_exec", spawn)

    async def run():
        work = asyncio.create_task(
            extract_bounded(
                b"%PDF-test", limits=ExtractionLimits(), timeout_s=0.3 if not cancel else 5
            )
        )
        if cancel:
            for _ in range(100):
                if marker.exists():
                    break
                await asyncio.sleep(0.01)
            assert marker.exists()
            work.cancel()
        with pytest.raises(asyncio.CancelledError if cancel else ExtractionTimeoutError):
            await work

    started = time.monotonic()
    asyncio.run(run())
    assert time.monotonic() - started < 2
    assert processes[0].returncode == -signal.SIGKILL
    assert marker.exists()
    parent, child = map(int, marker.read_text().split())
    assert parent == processes[0].pid
    # A reparented zombie has stopped executing and may await OS reaping.
    status = subprocess.run(
        ["ps", "-p", str(child), "-o", "stat="], capture_output=True, text=True, check=False
    ).stdout.strip()
    assert not status or status.startswith("Z")
    with pytest.raises(ProcessLookupError):
        os.kill(parent, 0)
