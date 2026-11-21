import asyncio
import json
from copy import deepcopy

import pytest
import yaml

from app.config import Settings
from app.experiments.run import atomic_write, run_experiment, sha256, summarize
from app.infrastructure.llm import FakeLLMProvider, LLMMetadata, LLMProviderError, LLMResult

SECRET = "test-only-super-secret-key"
CV = "Built REST APIs."


@pytest.fixture
def fixture(tmp_path):
    (tmp_path / "text").mkdir()
    (tmp_path / "jds").mkdir()
    source_pdf_sha256 = sha256(b"source PDF fixture bytes")
    text = tmp_path / "text" / f"{source_pdf_sha256}.txt"
    text.write_text(CV)
    jd = {
        "id": "jd-a",
        "title": "Backend",
        "summary": "Build APIs",
        "criteria": [
            {
                "code": "api",
                "label": "API",
                "description": "Build APIs",
                "priority": "must_have",
                "weight": 100,
                "keywords": ["API"],
            }
        ],
    }
    (tmp_path / "jds/jd-a.yaml").write_text(yaml.safe_dump(jd))
    eval_set = tmp_path / "set.yaml"
    eval_set.write_text(
        yaml.safe_dump(
            {
                "cvs": [
                    {
                        "sheet_id": "cv-1",
                        "text_sha256": source_pdf_sha256,
                        "expected_group": "match_A",
                    },
                    {
                        "sheet_id": "cv-2",
                        "text_sha256": source_pdf_sha256,
                        "expected_group": "none",
                    },
                ]
            }
        )
    )
    args = {
        "eval_set": eval_set,
        "jd_ids": ["jd-a"],
        "output_dir": tmp_path / "run",
        "concurrency": 1,
        "settings": Settings(
            _env_file=None,
            llm_base_url="https://example.invalid",
            llm_api_key=SECRET,
            llm_model="requested",
        ),
    }
    return args, text


def response():
    return LLMResult.model_construct(
        value={
            "criteria": [
                {
                    "criterion_id": "api",
                    "level": "strong",
                    "confidence": 1,
                    "reason": SECRET,
                    "evidence": [{"quote": CV}],
                    "missing_information": [],
                }
            ]
        },
        raw_text=SECRET,
        metadata=LLMMetadata(
            provider="fake",
            model="requested",
            response_model="reported",
            temperature=0,
            started_at="2026-11-21T00:00:00Z",
            latency_ms=12,
            input_tokens=10,
            output_tokens=20,
            attempts=1,
        ),
    )


def run(args, responses, **kwargs):
    return asyncio.run(run_experiment(**(args | kwargs), provider=FakeLLMProvider(responses)))


def test_resume_skips_success_retries_failure_and_redacts(fixture):
    args, _ = fixture
    first = run(args, [response(), LLMProviderError(f"Failure {SECRET}")])
    assert first["succeeded"] == 1
    assert first["failures"][0]["class"] == "LLMProviderError"
    assert first["failures"][0]["message"] == "Failure [REDACTED]"
    pair = args["output_dir"] / "pairs/cv-1__jd-a.json"
    original = pair.read_bytes()
    second = run(args, [response()])
    assert second["succeeded"] == 2
    assert pair.read_bytes() == original
    assert second["tokens"]["total"] == 60
    assert second["quote_verification"] == {"valid": 2, "total": 2, "rate": 1}
    manifest = json.loads((args["output_dir"] / "manifest.json").read_text())
    assert manifest["text_content_sha256"] == {
        "cv-1": sha256(CV.encode()),
        "cv-2": sha256(CV.encode()),
    }
    saved_pair = json.loads(original)
    assert saved_pair["source_pdf_sha256"] == sha256(b"source PDF fixture bytes")
    assert saved_pair["text_content_sha256"] == sha256(CV.encode())
    assert "text_sha256" not in saved_pair
    assert manifest["gateway_reported_models"] == ["reported"]
    assert manifest["identity"]["requested_model"] == "requested"
    assert manifest["ended_at"] >= manifest["started_at"]
    assert len(manifest["invocations"]) == 2
    for path in args["output_dir"].rglob("*"):
        if path.is_file():
            assert SECRET not in path.read_text()
    assert not list(args["output_dir"].rglob(".writing-*"))


def test_missing_text_is_pair_failure_even_on_resume(fixture):
    args, text = fixture
    run(args, [response(), response()])
    text.unlink()
    summary = run(args, [])
    assert summary["succeeded"] == 0
    assert len(summary["failures"]) == 2
    assert {e["class"] for e in summary["failures"]} == {"FileNotFoundError"}
    assert summary["latency_s"]["p50"] is None
    assert summary["quote_verification"]["rate"] is None


def test_summary_math_and_missing_scores(fixture):
    args, _ = fixture
    run(args, [response(), response()])
    pair = json.loads((args["output_dir"] / "pairs/cv-1__jd-a.json").read_text())
    pairs = [deepcopy(pair) for _ in range(4)]
    for i, p in enumerate(pairs):
        p["latency_s"] = [1, 2, 3, 10][i]
        p["result"]["total"]["observed_score"] = [20, 80, None, 50][i]
    pairs[-1]["result"]["criteria"][0]["evidence"][0]["verification"]["valid"] = False
    summary = summarize(pairs)
    assert summary["latency_s"]["p50"] == 2.5
    assert summary["latency_s"]["p95"] == pytest.approx(8.95)
    assert summary["latency_s"]["max"] == 10
    assert summary["tokens"]["total"] == 120
    assert summary["quote_verification"] == {"valid": 3, "total": 4, "rate": 0.75}
    assert summary["group_scores_not_accuracy"][0] == {
        "expected_group": "match_A",
        "jd_id": "jd-a",
        "scored_count": 3,
        "mean": 50,
        "median": 50,
    }


def test_limit_and_resume_identity(fixture):
    args, _ = fixture
    assert run(args, [response()], limit=1)["pair_count"] == 1
    assert run(args, [response()])["succeeded"] == 2
    with pytest.raises(ValueError, match="Resume inputs"):
        run(args, [], context_mode="retrieved")
    with pytest.raises(ValueError, match="positive"):
        run(args, [], concurrency=0)


def test_retrieved_and_concurrency_cap(fixture):
    args, _ = fixture

    class TrackingProvider(FakeLLMProvider):
        active = 0
        maximum = 0

        async def generate_structured(self, **kwargs):
            self.active += 1
            self.maximum = max(self.maximum, self.active)
            await asyncio.sleep(0.01)
            try:
                return await super().generate_structured(**kwargs)
            finally:
                self.active -= 1

    provider = TrackingProvider([response(), response()])
    summary = asyncio.run(run_experiment(**args, provider=provider, context_mode="retrieved"))
    assert summary["succeeded"] == 2
    assert provider.maximum == 1


def test_atomic_write_preserves_previous_on_replace_failure(tmp_path, monkeypatch):
    path = tmp_path / "result.json"
    path.write_text("previous")

    def fail(*args):
        raise OSError("disk failure")

    monkeypatch.setattr("app.experiments.run.os.replace", fail)
    with pytest.raises(OSError):
        atomic_write(path, "new")
    assert path.read_text() == "previous"
    assert list(tmp_path.iterdir()) == [path]


def test_changed_text_is_not_reused_and_new_content_hash_is_recorded(fixture):
    args, text = fixture
    run(args, [response(), response()])
    text.write_text(CV + "\nAdditional canonical text.")
    summary = run(args, [response(), response()])
    assert summary["succeeded"] == 2
    expected = sha256(text.read_bytes())
    manifest = json.loads((args["output_dir"] / "manifest.json").read_text())
    assert set(manifest["text_content_sha256"].values()) == {expected}
    for pair_path in (args["output_dir"] / "pairs").glob("*.json"):
        pair = json.loads(pair_path.read_text())
        assert pair["text_content_sha256"] == expected
        assert pair["source_pdf_sha256"] == sha256(b"source PDF fixture bytes")


def test_unreported_gateway_model_is_not_replaced_by_requested_model(fixture):
    args, _ = fixture
    scripted = response()
    scripted.metadata.response_model = None
    run(args, [scripted, scripted])
    manifest = json.loads((args["output_dir"] / "manifest.json").read_text())
    assert manifest["identity"]["requested_model"] == "requested"
    assert manifest["gateway_reported_models"] == []
